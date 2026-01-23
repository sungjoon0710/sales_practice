/**
 * State machine states for the Realtime Audio conversation
 * 
 * Flow:
 * 1. disconnected → connecting → responding (AI sets up scenario)
 * 2. responding → speaking (user's turn)
 * 3. speaking → responding (AI's turn)
 * 4. (repeat 2-3)
 * 5. Any state → disconnected (End Session)
 */
export type ConversationState = 
  | "disconnected"  // Not connected to the API
  | "connecting"    // Establishing connection
  | "responding"    // AI is speaking/responding
  | "speaking";     // User is recording/speaking

// Legacy alias for backwards compatibility
export type ConnectionState = ConversationState;

export interface TranscriptMessage {
  role: "user" | "assistant";
  text: string;
  id?: string;
}

export interface RealtimeAudioEvents {
  onStateChange?: (state: ConversationState) => void;
  onTranscriptUpdate?: (messages: TranscriptMessage[]) => void;
  onError?: (error: string) => void;
}

export interface SessionConfig {
  model: string;
  voice: string;
  instructions: string;
}

export interface RealtimeSessionData {
  id?: string;
  client_secret?: {
    value: string;
  };
}

// OpenAI Realtime API event types
export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

export interface SessionCreatedEvent extends RealtimeEvent {
  type: "session.created";
  session: {
    id: string;
    [key: string]: unknown;
  };
}

export interface AudioDeltaEvent extends RealtimeEvent {
  type: "response.audio.delta";
  delta: string;
}

export interface TranscriptDeltaEvent extends RealtimeEvent {
  type: "response.audio_transcript.delta";
  delta: string;
  item_id: string;
}

export interface InputTranscriptionEvent extends RealtimeEvent {
  type: "conversation.item.input_audio_transcription.completed";
  transcript: string;
  item_id: string;
}

export interface ErrorEvent extends RealtimeEvent {
  type: "error";
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Valid state transitions for the conversation state machine
 */
export const STATE_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  disconnected: ["connecting"],
  connecting: ["responding", "disconnected"], // → responding (success) or disconnected (failure)
  responding: ["speaking", "disconnected"],   // → speaking (user interrupts) or disconnected (end)
  speaking: ["responding", "disconnected"],   // → responding (user done) or disconnected (end)
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: ConversationState, to: ConversationState): boolean {
  return STATE_TRANSITIONS[from].includes(to);
}
