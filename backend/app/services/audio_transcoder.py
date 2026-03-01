"""Streaming audio transcoder: WebM/Opus → PCM 16kHz mono via ffmpeg subprocess."""

import asyncio
import subprocess
import logging

logger = logging.getLogger(__name__)


class StreamingTranscoder:
    """Persistent ffmpeg subprocess that converts WebM/Opus chunks to PCM 16kHz mono.

    One instance per audio stream (mic or speaker). Feed chunks via
    `transcode_chunk()` and read back PCM data.
    """

    def __init__(self):
        self.process: subprocess.Popen | None = None
        self._lock = asyncio.Lock()

    async def start(self):
        """Start the ffmpeg subprocess."""
        self.process = subprocess.Popen(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel", "error",
                "-f", "webm",
                "-i", "pipe:0",
                "-f", "s16le",
                "-ar", "16000",
                "-ac", "1",
                "pipe:1",
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        logger.info("StreamingTranscoder started (ffmpeg subprocess)")

    async def transcode_chunk(self, chunk: bytes) -> bytes:
        """Feed a WebM/Opus chunk and read back available PCM data."""
        if not self.process or self.process.poll() is not None:
            logger.warning("ffmpeg process not running, cannot transcode")
            return b""

        async with self._lock:
            loop = asyncio.get_event_loop()
            try:
                # Write chunk to stdin in a thread to avoid blocking
                await loop.run_in_executor(None, self._write_chunk, chunk)
                # Read available output
                pcm_data = await loop.run_in_executor(None, self._read_available)
                return pcm_data
            except Exception as e:
                logger.error(f"Transcode error: {e}")
                return b""

    def _write_chunk(self, chunk: bytes):
        """Write chunk to ffmpeg stdin (blocking)."""
        if self.process and self.process.stdin:
            try:
                self.process.stdin.write(chunk)
                self.process.stdin.flush()
            except BrokenPipeError:
                logger.error("ffmpeg stdin pipe broken")

    def _read_available(self) -> bytes:
        """Read available PCM data from ffmpeg stdout (non-blocking)."""
        if not self.process or not self.process.stdout:
            return b""
        import select
        ready, _, _ = select.select([self.process.stdout], [], [], 0.05)
        if ready:
            # Read up to 64KB at a time
            return self.process.stdout.read1(65536) if hasattr(self.process.stdout, 'read1') else self.process.stdout.read(65536)
        return b""

    async def close(self):
        """Terminate the ffmpeg subprocess."""
        if self.process:
            try:
                if self.process.stdin:
                    self.process.stdin.close()
                self.process.terminate()
                self.process.wait(timeout=5)
            except Exception as e:
                logger.warning(f"Error closing ffmpeg: {e}")
                if self.process:
                    self.process.kill()
            finally:
                self.process = None
            logger.info("StreamingTranscoder closed")
