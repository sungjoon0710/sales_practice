import { logger } from "./logger";
import { int16ToFloat32, SAMPLE_RATE } from "./audioUtils";

type PlaybackStateCallback = (isPlaying: boolean) => void;

/**
 * Handles audio playback from the OpenAI Realtime API
 */
export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private playbackQueue: Int16Array[] = [];
  private isPlaying = false;
  private onPlaybackStateChange?: PlaybackStateCallback;

  constructor(options?: { onPlaybackStateChange?: PlaybackStateCallback }) {
    this.onPlaybackStateChange = options?.onPlaybackStateChange;
  }

  /**
   * Initialize the audio context for playback
   */
  async initialize(): Promise<AudioContext> {
    if (this.audioContext) {
      return this.audioContext;
    }

    logger.info("Initializing AudioContext for playback...");
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });

    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      logger.info("Resuming suspended AudioContext...");
      await this.audioContext.resume();
    }

    logger.info("✓ AudioContext ready, state:", this.audioContext.state);
    return this.audioContext;
  }

  /**
   * Get the audio context (initialize if needed)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Add audio data to the playback queue
   */
  enqueue(audioData: Int16Array): void {
    this.playbackQueue.push(audioData);
    logger.debug(`Audio enqueued, queue size: ${this.playbackQueue.length}`);
  }

  /**
   * Process and play the audio queue
   */
  async processQueue(): Promise<void> {
    if (this.isPlaying || this.playbackQueue.length === 0 || !this.audioContext) {
      return;
    }

    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);
    logger.debug(`Starting playback, ${this.playbackQueue.length} chunks in queue`);

    while (this.playbackQueue.length > 0) {
      const audioData = this.playbackQueue.shift()!;
      await this.playChunk(audioData);
    }

    logger.debug("Playback complete");
    this.isPlaying = false;
    this.onPlaybackStateChange?.(false);
  }

  /**
   * Play a single audio chunk
   */
  private async playChunk(audioData: Int16Array): Promise<void> {
    if (!this.audioContext) return;

    const float32Data = int16ToFloat32(audioData);

    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      float32Data.length,
      SAMPLE_RATE
    );
    audioBuffer.getChannelData(0).set(float32Data);

    // Create and play buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Clear the playback queue
   */
  clearQueue(): void {
    this.playbackQueue = [];
    logger.debug("Playback queue cleared");
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    logger.info("Disposing AudioPlayback...");
    this.clearQueue();
    this.isPlaying = false;

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
