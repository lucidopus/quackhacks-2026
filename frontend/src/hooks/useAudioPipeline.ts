"use client";

import { useState, useCallback, useRef } from "react";
import { Suggestion } from "@/components/SuggestionCard";

interface AudioCaptureState {
  isCapturing: boolean;
  error: string | null;
  suggestions: Suggestion[];
}

/**
 * Hook that captures mic and speaker audio, converts to raw PCM 16kHz
 * via AudioWorklet, and streams base64-encoded PCM chunks via WebSocket.
 */
export function useAudioPipeline(callId: string, clientId: string) {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    error: null,
    suggestions: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const speakerContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speakerStreamRef = useRef<MediaStream | null>(null);

  const startPipeline = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isCapturing: false, error: null, suggestions: [] }));

      // 1. Open WebSocket to backend
      const ws = new WebSocket(`ws://localhost:8000/ws/call/${callId}?client_id=${clientId}`);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("WebSocket connection failed"));
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "suggestion_trigger") {
            // Add a new "thinking" suggestion with ID from backend
            const newSuggestion: Suggestion = {
              id: data.id || Math.random().toString(36).substr(2, 9),
              type: "trigger",
              trigger_type: data.trigger_type,
              content: "",
              status: "thinking",
              timestamp: Date.now(),
              reasoning: data.reasoning
            };
            setState(prev => ({
              ...prev,
              suggestions: [newSuggestion, ...prev.suggestions].slice(0, 5) // Keep last 5
            }));
          } 
          else if (data.type === "suggestion_content") {
            // Update the suggestion by ID
            setState(prev => {
              const newSuggestions = [...prev.suggestions];
              const idx = newSuggestions.findIndex(s => s.id === data.id);
              
              if (idx !== -1) {
                newSuggestions[idx] = {
                  ...newSuggestions[idx],
                  content: data.status === "error" ? data.error : data.content,
                  status: data.status as "thinking" | "done" | "error"
                };
              }
              return { ...prev, suggestions: newSuggestions };
            });
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };
      setTimeout(() => reject(new Error("WebSocket timeout")), 5000);
      });

      ws.send(JSON.stringify({ type: "start", call_id: callId }));

      // 2. Request mic access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = micStream;

      // 3. Request tab/speaker audio
      let speakerStream: MediaStream | null = null;
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        // Kill video track — we only need audio
        displayStream.getVideoTracks().forEach((t) => t.stop());

        if (displayStream.getAudioTracks().length > 0) {
          speakerStream = displayStream;
          speakerStreamRef.current = speakerStream;
        }
      } catch {
        console.warn("Speaker audio not available, continuing with mic only");
      }

      // 4. Set up AudioWorklet for mic
      const micContext = new AudioContext({ sampleRate: 48000 });
      micContextRef.current = micContext;
      await micContext.audioWorklet.addModule("/pcm-capture-processor.js");

      const micSource = micContext.createMediaStreamSource(micStream);
      const micProcessor = new AudioWorkletNode(
        micContext,
        "pcm-capture-processor"
      );

      micProcessor.port.onmessage = (event) => {
        if (
          event.data.type === "pcm_chunk" &&
          ws.readyState === WebSocket.OPEN
        ) {
          const pcmBytes = new Uint8Array(event.data.pcm);
          const base64 = uint8ToBase64(pcmBytes);
          ws.send(
            JSON.stringify({
              type: "audio_chunk",
              stream: "mic",
              data: base64,
              call_id: callId,
            })
          );
        }
      };

      micSource.connect(micProcessor);
      micProcessor.connect(micContext.destination); // needed to keep the pipeline alive

      // 5. Set up AudioWorklet for speaker (if available)
      if (speakerStream) {
        const speakerContext = new AudioContext({ sampleRate: 48000 });
        speakerContextRef.current = speakerContext;
        await speakerContext.audioWorklet.addModule(
          "/pcm-capture-processor.js"
        );

        const speakerSource =
          speakerContext.createMediaStreamSource(speakerStream);
        const speakerProcessor = new AudioWorkletNode(
          speakerContext,
          "pcm-capture-processor"
        );

        speakerProcessor.port.onmessage = (event) => {
          if (
            event.data.type === "pcm_chunk" &&
            ws.readyState === WebSocket.OPEN
          ) {
            const pcmBytes = new Uint8Array(event.data.pcm);
            const base64 = uint8ToBase64(pcmBytes);
            ws.send(
              JSON.stringify({
                type: "audio_chunk",
                stream: "speaker",
                data: base64,
                call_id: callId,
              })
            );
          }
        };

        speakerSource.connect(speakerProcessor);
        speakerProcessor.connect(speakerContext.destination);
      }

      setState(prev => ({ ...prev, isCapturing: true, error: null }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start audio pipeline";
      console.error("Audio pipeline error:", err);
      setState(prev => ({ ...prev, isCapturing: false, error: message }));
    }
  }, [callId, clientId]);

  const stopPipeline = useCallback(() => {
    // Stop streams
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    speakerStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    speakerStreamRef.current = null;

    // Close audio contexts
    micContextRef.current?.close();
    speakerContextRef.current?.close();
    micContextRef.current = null;
    speakerContextRef.current = null;

    // Close WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      wsRef.current.close();
    }
    wsRef.current = null;

    setState(prev => ({ ...prev, isCapturing: false, error: null }));
  }, []);

  const clearSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, suggestions: [] }));
  }, []);

  return {
    ...state,
    startPipeline,
    stopPipeline,
    clearSuggestions,
    wsRef,
  };
}

/** Convert Uint8Array to base64 string */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
