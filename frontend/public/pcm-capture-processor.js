/**
 * AudioWorklet processor that captures raw PCM samples and sends them
 * to the main thread for WebSocket streaming.
 *
 * Downsamples from the AudioContext's native sample rate to 16kHz
 * and converts float32 → int16 PCM.
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 0;
    // Send chunks every ~250ms worth of samples at 16kHz = 4000 samples
    this._chunkSamples = 2000;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0]) return true;

    const channelData = input[0]; // mono or first channel
    const inputSampleRate = sampleRate; // global in AudioWorklet
    const targetRate = 16000;
    const ratio = inputSampleRate / targetRate;

    // Downsample by picking every nth sample
    for (let i = 0; i < channelData.length; i += ratio) {
      const idx = Math.floor(i);
      if (idx < channelData.length) {
        // Clamp and convert float32 [-1, 1] → int16 [-32768, 32767]
        const s = Math.max(-1, Math.min(1, channelData[idx]));
        this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);
        this._bufferSize++;
      }
    }

    // When we have enough samples, send the chunk
    if (this._bufferSize >= this._chunkSamples) {
      const int16Array = new Int16Array(this._buffer.splice(0, this._chunkSamples));
      this._bufferSize -= this._chunkSamples;
      this.port.postMessage({
        type: "pcm_chunk",
        pcm: int16Array.buffer,
      }, [int16Array.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
