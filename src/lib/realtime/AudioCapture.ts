import { logger } from "./logger";
import { floatTo16BitPCM, int16ArrayToBase64, SAMPLE_RATE, BUFFER_SIZE } from "./audioUtils";

type AudioDataCallback = (base64Audio: string) => void;

/**
 * Handles microphone capture and audio data transmission
 */
export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onAudioData?: AudioDataCallback;
  private chunkCount = 0;

  constructor(options?: { onAudioData?: AudioDataCallback }) {
    this.onAudioData = options?.onAudioData;
  }

  /**
   * Request microphone access and set up audio capture
   */
  async initialize(sharedAudioContext?: AudioContext): Promise<void> {
    logger.info("Requesting microphone access...");

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      logger.info("✓ Microphone access granted");
      logger.debug(
        "Audio tracks:",
        this.mediaStream.getAudioTracks().map((t) => ({
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
        }))
      );

      // Use shared audio context or create new one
      this.audioContext = sharedAudioContext || new AudioContext({ sampleRate: SAMPLE_RATE });

      // Resume if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
    } catch (error) {
      logger.error("Microphone access denied:", error);
      throw new Error(
        `Microphone access denied: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Start capturing audio and sending via callback
   */
  startCapture(): void {
    if (!this.audioContext || !this.mediaStream) {
      logger.error("Cannot start capture - not initialized");
      return;
    }

    logger.info("Starting audio capture...");

    // Create media stream source
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create script processor for capturing audio chunks
    // Note: ScriptProcessorNode is deprecated but widely supported
    // TODO: Migrate to AudioWorklet for better performance
    this.processorNode = this.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.chunkCount = 0;

    this.processorNode.onaudioprocess = (event) => {
      if (!this.onAudioData) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(inputData);
      const base64Audio = int16ArrayToBase64(pcm16);

      this.onAudioData(base64Audio);

      this.chunkCount++;
      if (this.chunkCount % 50 === 0) {
        logger.debug(`Captured ${this.chunkCount} audio chunks`);
      }
    };

    // Connect the audio graph
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    logger.info("✓ Audio capture started");
  }

  /**
   * Stop capturing audio
   */
  stopCapture(): void {
    logger.info("Stopping audio capture...");

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    logger.debug(`Total chunks captured: ${this.chunkCount}`);
  }

  /**
   * Set the audio data callback
   */
  setOnAudioData(callback: AudioDataCallback): void {
    this.onAudioData = callback;
  }

  /**
   * Get the media stream
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Clean up all resources
   */
  async dispose(): Promise<void> {
    logger.info("Disposing AudioCapture...");

    this.stopCapture();

    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop();
        logger.debug(`Stopped track: ${track.label}`);
      });
      this.mediaStream = null;
    }

    // Close audio context if we own it
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
