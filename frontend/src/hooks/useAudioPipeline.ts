"use client";

import { useState, useCallback, useRef } from "react";
import { Suggestion } from "@/components/SuggestionCard";

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  is_final: boolean;
  timestamp: number;
}

interface AudioCaptureState {
  isCapturing: boolean;
  error: string | null;
  suggestions: Suggestion[];
  transcripts: TranscriptSegment[];
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
    transcripts: [],
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
        ws.onopen = () => {
          console.log("WebSocket connected");
          resolve();
        };

        ws.onerror = (err) => {
          console.error("WebSocket error:", err);
          setState(prev => ({ ...prev, isCapturing: false, error: "WebSocket connection failed" }));
          reject(new Error("WebSocket connection failed"));
        };
        
        ws.onclose = (event) => {
          console.warn("WebSocket closed:", event.code, event.reason);
          setState(prev => ({ ...prev, isCapturing: false }));
        };

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
            else if (data.type === "transcript") {
              // Primary path: WebSocket-delivered transcript segments
              const seg: TranscriptSegment = {
                id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                speaker: data.speaker,
                text: data.text,
                is_final: data.is_final,
                timestamp: Date.now(),
              };
              
              if (data.is_final) {
                // Committed segment — replace the last partial for this speaker
                setState(prev => {
                  const updated = [...prev.transcripts];
                  // Search backwards for a partial from the same speaker to replace
                  let replaced = false;
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (!updated[i].is_final && updated[i].speaker === data.speaker) {
                      // Replace partial with final committed version
                      updated[i] = { ...seg, id: updated[i].id };
                      replaced = true;
                      break;
                    }
                    // Stop searching if we hit a final from the same speaker
                    if (updated[i].is_final && updated[i].speaker === data.speaker) break;
                  }
                  if (!replaced) {
                    updated.push(seg);
                  }
                  return { ...prev, transcripts: updated };
                });
              } else {
                // Partial — update or append a partial for this speaker
                setState(prev => {
                  const updated = [...prev.transcripts];
                  const lastIdx = updated.length - 1;
                  if (
                    lastIdx >= 0 &&
                    !updated[lastIdx].is_final &&
                    updated[lastIdx].speaker === data.speaker
                  ) {
                    // Update existing partial in-place
                    updated[lastIdx] = { ...updated[lastIdx], text: data.text };
                  } else {
                    updated.push(seg);
                  }
                  return { ...prev, transcripts: updated };
                });
              }
            }
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        };

        // Add a timeout for the connection
        setTimeout(() => reject(new Error("WebSocket connection timed out")), 5000);
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

      micProcessor.port.onmessage = async (event) => {
        if (
          event.data.type === "pcm_chunk" &&
          ws.readyState === WebSocket.OPEN
        ) {
          // Auto-resume if suspended
          if (micContext.state === "suspended") {
            await micContext.resume();
          }

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

        speakerProcessor.port.onmessage = async (event) => {
          if (
            event.data.type === "pcm_chunk" &&
            ws.readyState === WebSocket.OPEN
          ) {
            // Auto-resume if suspended (browser power-saving/bg tab)
            if (speakerContext.state === "suspended") {
              await speakerContext.resume();
            }

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
