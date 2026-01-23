import { logger } from "./logger";
import { checkBrowserSupport } from "./browserSupport";
import { AudioPlayback } from "./AudioPlayback";
import { AudioCapture } from "./AudioCapture";
import { MessageHandler } from "./MessageHandler";
import { initialGreetingPrompt } from "@/config/voiceAI";
import type {
  ConversationState,
  TranscriptMessage,
  RealtimeAudioEvents,
} from "./types";

const REALTIME_API_URL = "wss://api.openai.com/v1/realtime";
const DEFAULT_MODEL = "gpt-4o-realtime-preview-2024-12-17";

export interface RealtimeAudioHandlerConfig {
  sessionEndpoint?: string;
  model?: string;
}

/**
 * State Machine for OpenAI Realtime Audio conversations
 * 
 * States:
 * - disconnected: Not connected to the API
 * - connecting: Establishing connection
 * - responding: AI is speaking (includes initial greeting)
 * - speaking: User is recording
 * 
 * Flow:
 * 1. disconnected → connecting → responding (AI introduces scenario)
 * 2. responding → speaking (user clicks to talk)
 * 3. speaking → responding (user clicks to send, AI responds)
 * 4. Repeat 2-3 until "End Session"
 * 5. Any state → disconnected (graceful shutdown)
 */
export class RealtimeAudioHandler {
  // Configuration
  private config: RealtimeAudioHandlerConfig;

  // State machine
  private state: ConversationState = "disconnected";
  private events: RealtimeAudioEvents = {};

  // Modules
  private audioPlayback: AudioPlayback;
  private audioCapture: AudioCapture;
  private messageHandler: MessageHandler;

  // WebSocket
  private ws: WebSocket | null = null;

  // Flags
  private isShuttingDown = false;
  private isResponseActive = false; // Track if AI is currently generating a response

  constructor(config: RealtimeAudioHandlerConfig = {}) {
    this.config = {
      sessionEndpoint: "/api/realtime/session",
      model: DEFAULT_MODEL,
      ...config,
    };

    // Initialize audio playback module
    this.audioPlayback = new AudioPlayback({
      onPlaybackStateChange: (isPlaying) => {
        // When AI finishes speaking, stay in "responding" state
        // User must click to transition to "speaking"
        if (!isPlaying && this.state === "responding") {
          logger.info("AI finished speaking, waiting for user to click mic");
        }
      },
    });

    // Initialize audio capture module (callback set later)
    this.audioCapture = new AudioCapture();

    // Initialize message handler
    this.messageHandler = new MessageHandler(
      {
        onSessionCreated: () => {
          logger.info("Session ready, triggering initial AI greeting");
          // Trigger the initial AI greeting
          this.triggerInitialGreeting();
        },
        onAudioDelta: (audioData) => {
          this.audioPlayback.enqueue(audioData);
          this.audioPlayback.processQueue();
        },
        onResponseStarted: () => {
          // AI started responding
          this.isResponseActive = true;
          if (this.state !== "disconnected" && this.state !== "responding") {
            this.transition("responding");
          }
        },
        onResponseDone: (status) => {
          this.isResponseActive = false;
          logger.info("AI response complete, status:", status);
          // Stay in "responding" state - user must click to speak
        },
        onError: (message, code) => {
          // Don't propagate known non-critical errors to the user
          const ignoredErrors = [
            "response_cancel_not_active", // Tried to cancel when no response active
            "input_audio_buffer_empty",   // Buffer was empty when committing
          ];
          
          if (code && ignoredErrors.includes(code)) {
            logger.debug("Ignoring non-critical API error:", code, message);
            return;
          }
          
          logger.error("API error:", message);
          this.events.onError?.(message);
        },
      },
      (transcript) => {
        this.events.onTranscriptUpdate?.(transcript);
      }
    );
  }

  // ==================== Public API ====================

  /**
   * Set event callbacks
   */
  setEvents(events: RealtimeAudioEvents): void {
    this.events = events;
    this.messageHandler.setOnTranscriptChange((transcript) => {
      this.events.onTranscriptUpdate?.(transcript);
    });
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return this.state;
  }

  /**
   * Get current transcript
   */
  getTranscript(): TranscriptMessage[] {
    return this.messageHandler.getTranscript();
  }

  /**
   * Start a new conversation session
   * Connects to the API and triggers the initial AI greeting
   */
  async startSession(): Promise<void> {
    if (this.state !== "disconnected") {
      logger.warn("Cannot start session - already in state:", this.state);
      return;
    }

    logger.group("=== Starting Conversation Session ===");
    this.isShuttingDown = false;

    try {
      this.transition("connecting");

      // Check browser support
      const support = checkBrowserSupport();
      if (!support.supported) {
        throw new Error(support.error);
      }

      // Get ephemeral token
      const ephemeralKey = await this.fetchEphemeralToken();

      // Initialize audio modules
      await this.audioPlayback.initialize();
      const sharedContext = this.audioPlayback.getAudioContext();
      await this.audioCapture.initialize(sharedContext || undefined);

      // Connect WebSocket
      await this.connectWebSocket(ephemeralKey);

      // Note: transition to "responding" happens when session.created is received
      // and we trigger the initial greeting

      logger.info("✓ Session started, waiting for AI greeting");
    } catch (error) {
      logger.error("Failed to start session:", error);
      this.events.onError?.(error instanceof Error ? error.message : "Failed to start session");
      await this.endSession();
    } finally {
      logger.groupEnd();
    }
  }

  /**
   * End the current session gracefully
   * Can be called from any state
   */
  async endSession(): Promise<void> {
    if (this.state === "disconnected") {
      logger.info("Already disconnected");
      return;
    }

    logger.group("=== Ending Conversation Session ===");
    this.isShuttingDown = true;

    try {
      // Cancel any ongoing AI response
      if (this.state === "responding") {
        this.cancelResponse();
      }

      // Stop recording if active
      if (this.state === "speaking") {
        this.audioCapture.stopCapture();
      }

      // Close WebSocket gracefully
      if (this.ws) {
        logger.info("Closing WebSocket...");
        this.ws.close(1000, "User ended session");
        this.ws = null;
      }

      // Dispose audio modules
      await this.audioCapture.dispose();
      await this.audioPlayback.dispose();

      // Transition to disconnected
      this.transition("disconnected");

      logger.info("✓ Session ended gracefully");
    } catch (error) {
      logger.error("Error during session cleanup:", error);
      // Force disconnected state even on error
      this.state = "disconnected";
      this.events.onStateChange?.("disconnected");
    } finally {
      this.isShuttingDown = false;
      logger.groupEnd();
    }
  }

  /**
   * Toggle between speaking and responding states
   * - If responding (AI talking): interrupt and start speaking
   * - If speaking: stop and let AI respond
   */
  toggleTurn(): void {
    logger.info(`Toggle turn - current state: ${this.state}`);

    switch (this.state) {
      case "disconnected":
        logger.warn("Cannot toggle - not connected. Call startSession() first.");
        break;

      case "connecting":
        logger.info("Still connecting, please wait...");
        break;

      case "responding":
        // Interrupt AI and start user's turn
        this.startSpeaking();
        break;

      case "speaking":
        // End user's turn and let AI respond
        this.stopSpeaking();
        break;
    }
  }

  /**
   * Clear the transcript
   */
  clearTranscript(): void {
    this.messageHandler.clearTranscript();
  }

  /**
   * Clean up all resources
   */
  async dispose(): Promise<void> {
    await this.endSession();
  }

  // Legacy methods for compatibility
  async connect(): Promise<void> {
    await this.startSession();
  }

  async disconnect(): Promise<void> {
    await this.endSession();
  }

  async start(): Promise<void> {
    await this.startSession();
  }

  async stop(): Promise<void> {
    await this.endSession();
  }

  async toggle(): Promise<void> {
    if (this.state === "disconnected") {
      await this.startSession();
    } else {
      this.toggleTurn();
    }
  }

  async toggleRecording(): Promise<void> {
    await this.toggle();
  }

  startRecording(): void {
    this.startSpeaking();
  }

  stopRecording(): void {
    this.stopSpeaking();
  }

  getIsRecording(): boolean {
    return this.state === "speaking";
  }

  // ==================== State Machine ====================

  /**
   * Transition to a new state with validation
   */
  private transition(newState: ConversationState): void {
    const oldState = this.state;

    if (oldState === newState) {
      return;
    }

    // Allow any transition to disconnected (for error handling / shutdown)
    // Otherwise, validate the transition
    if (newState !== "disconnected") {
      const validTransitions: Record<ConversationState, ConversationState[]> = {
        disconnected: ["connecting"],
        connecting: ["responding", "disconnected"],
        responding: ["speaking", "disconnected"],
        speaking: ["responding", "disconnected"],
      };

      if (!validTransitions[oldState].includes(newState)) {
        logger.error(`Invalid state transition: ${oldState} → ${newState}`);
        return;
      }
    }

    logger.info(`State: ${oldState} → ${newState}`);
    this.state = newState;
    this.events.onStateChange?.(newState);
  }

  // ==================== Speaking Logic ====================

  /**
   * Start user speaking (responding → speaking)
   */
  private startSpeaking(): void {
    if (this.state !== "responding") {
      logger.warn("Cannot start speaking from state:", this.state);
      return;
    }

    logger.info("Starting user's turn");

    // Interrupt any ongoing AI response
    this.cancelResponse();
    this.audioPlayback.clearQueue();

    // Clear the audio buffer for fresh recording
    this.clearAudioBuffer();

    // Set up audio capture callback
    this.audioCapture.setOnAudioData((base64Audio) => {
      this.sendAudioData(base64Audio);
    });

    // Start capturing
    this.audioCapture.startCapture();

    this.transition("speaking");
  }

  /**
   * Stop user speaking and trigger AI response (speaking → responding)
   */
  private stopSpeaking(): void {
    if (this.state !== "speaking") {
      logger.warn("Cannot stop speaking from state:", this.state);
      return;
    }

    logger.info("Ending user's turn, requesting AI response");

    // Stop capturing audio
    this.audioCapture.stopCapture();

    // Commit audio and request response
    this.commitAudioAndRespond();

    this.transition("responding");
  }

  // ==================== WebSocket & API ====================

  private async fetchEphemeralToken(): Promise<string> {
    logger.info("Fetching ephemeral token...");

    const response = await fetch(this.config.sessionEndpoint!, {
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Session API error:", errorText);
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const data = await response.json();
    const ephemeralKey = data.client_secret?.value;

    if (!ephemeralKey) {
      logger.error("No ephemeral key in response:", data);
      throw new Error("No ephemeral key received from server");
    }

    logger.info("✓ Ephemeral token received");
    return ephemeralKey;
  }

  private async connectWebSocket(ephemeralKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${REALTIME_API_URL}?model=${this.config.model}`;
      logger.info("Connecting to WebSocket:", wsUrl);

      this.ws = new WebSocket(wsUrl, [
        "realtime",
        `openai-insecure-api-key.${ephemeralKey}`,
        "openai-beta.realtime-v1",
      ]);

      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        logger.info("✓ WebSocket connected");

        // Configure session for manual turn-taking
        this.sendSessionConfig();

        resolve();
      };

      this.ws.onmessage = (event) => {
        if (!this.isShuttingDown) {
          this.messageHandler.handleMessage(event);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        logger.error("WebSocket error:", error);
        reject(new Error("WebSocket connection error"));
      };

      this.ws.onclose = (event) => {
        logger.info("WebSocket closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        // Only auto-cleanup if not already shutting down
        if (!this.isShuttingDown && this.state !== "disconnected") {
          this.endSession();
        }
      };
    });
  }

  private sendSessionConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Manual turn-taking mode (no VAD)
    const config = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: null, // Manual mode
      },
    };

    logger.info("Sending session config (manual turn-taking)");
    this.ws.send(JSON.stringify(config));
  }

  /**
   * Trigger the initial AI greeting when session starts
   */
  private triggerInitialGreeting(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    logger.info("Triggering initial AI greeting");

    // Transition to responding state
    this.transition("responding");

    // Request the AI to start the conversation
    this.ws.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: initialGreetingPrompt,
        },
      })
    );
  }

  private sendAudioData(base64Audio: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Audio,
      })
    );
  }

  private clearAudioBuffer(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    logger.debug("Clearing audio buffer");
    this.ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
  }

  private commitAudioAndRespond(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    logger.debug("Committing audio and requesting response");
    this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  private cancelResponse(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Only cancel if there's actually an active response
    if (!this.isResponseActive) {
      logger.debug("No active response to cancel, skipping");
      return;
    }

    logger.info("Canceling AI response");
    this.isResponseActive = false;
    this.ws.send(JSON.stringify({ type: "response.cancel" }));
  }
}
