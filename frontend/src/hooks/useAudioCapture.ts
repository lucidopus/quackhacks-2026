"use client";

import { useState, useCallback, useRef } from "react";

interface AudioCaptureState {
  isCapturing: boolean;
  micStream: MediaStream | null;
  speakerStream: MediaStream | null;
  error: string | null;
}

export function useAudioCapture() {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    micStream: null,
    speakerStream: null,
    error: null,
  });

  const micStreamRef = useRef<MediaStream | null>(null);
  const speakerStreamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // 1. Request microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // 2. Request tab/screen audio (for capturing the other party)
      const speakerStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required by API
        audio: true,
      });
      // Immediately stop the video track — we only need audio
      speakerStream.getVideoTracks().forEach((track) => track.stop());

      micStreamRef.current = micStream;
      speakerStreamRef.current = speakerStream;

      setState({
        isCapturing: true,
        micStream,
        speakerStream,
        error: null,
      });

      return { micStream, speakerStream };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to capture audio";
      setState((prev) => ({ ...prev, error: message, isCapturing: false }));
      return null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (speakerStreamRef.current) {
      speakerStreamRef.current.getTracks().forEach((track) => track.stop());
      speakerStreamRef.current = null;
    }
    setState({
      isCapturing: false,
      micStream: null,
      speakerStream: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    startCapture,
    stopCapture,
  };
}
