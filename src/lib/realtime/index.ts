// Main handler
export { RealtimeAudioHandler } from "./RealtimeAudioHandler";
export type { RealtimeAudioHandlerConfig } from "./RealtimeAudioHandler";

// Types
export type {
  ConversationState,
  ConnectionState, // Legacy alias
  TranscriptMessage,
  RealtimeAudioEvents,
  SessionConfig,
} from "./types";

export { STATE_TRANSITIONS, isValidTransition } from "./types";

// Utilities (for advanced usage)
export { logger, RealtimeLogger } from "./logger";
export { checkBrowserSupport, checkMicrophonePermission } from "./browserSupport";
export * from "./audioUtils";

// Modules (for custom implementations)
export { AudioPlayback } from "./AudioPlayback";
export { AudioCapture } from "./AudioCapture";
export { MessageHandler } from "./MessageHandler";
