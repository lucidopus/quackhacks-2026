"use client";

import { useRef, useCallback } from "react";
import { blobToBase64 } from "@/lib/utils";

const CHUNK_INTERVAL_MS = 250;

export function useAudioStreaming(callId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const speakerRecorderRef = useRef<MediaRecorder | null>(null);

  const startStreaming = useCallback(
    (micStream: MediaStream, speakerStream: MediaStream) => {
      const ws = new WebSocket(
        `ws://localhost:8000/ws/call/${callId}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "start", call_id: callId }));

        // Helper to create a MediaRecorder for a given stream
        const createRecorder = (
          stream: MediaStream,
          streamLabel: "mic" | "speaker"
        ) => {
          // Try opus first, fall back to default
          const mimeType = MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
          )
            ? "audio/webm;codecs=opus"
            : "audio/webm";

          const recorder = new MediaRecorder(stream, { mimeType });

          recorder.ondataavailable = async (event) => {
            if (
              event.data.size > 0 &&
              ws.readyState === WebSocket.OPEN
            ) {
              const base64 = await blobToBase64(event.data);
              ws.send(
                JSON.stringify({
                  type: "audio_chunk",
                  stream: streamLabel,
                  data: base64,
                  call_id: callId,
                })
              );
            }
          };

          recorder.start(CHUNK_INTERVAL_MS);
          return recorder;
        };

        micRecorderRef.current = createRecorder(micStream, "mic");

        // Only create speaker recorder if there are audio tracks
        if (speakerStream.getAudioTracks().length > 0) {
          speakerRecorderRef.current = createRecorder(
            speakerStream,
            "speaker"
          );
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
      };
    },
    [callId]
  );

  const stopStreaming = useCallback(() => {
    // Stop recorders
    if (micRecorderRef.current?.state === "recording") {
      micRecorderRef.current.stop();
      micRecorderRef.current = null;
    }
    if (speakerRecorderRef.current?.state === "recording") {
      speakerRecorderRef.current.stop();
      speakerRecorderRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return { startStreaming, stopStreaming, wsRef };
}
