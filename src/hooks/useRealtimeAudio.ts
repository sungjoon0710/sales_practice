"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  RealtimeAudioHandler,
  type ConnectionState as ConversationState,
  type TranscriptMessage,
  type RealtimeAudioEvents,
  type HangUpReason,
} from "@/lib/realtime";

// Re-export types for convenience
export type { ConversationState, TranscriptMessage, HangUpReason };
// Legacy alias
export type ConnectionState = ConversationState;

interface UseRealtimeAudioOptions extends RealtimeAudioEvents {
  /** Custom session endpoint (default: /api/realtime/session) */
  sessionEndpoint?: string;
  /** OpenAI model to use */
  model?: string;
  /** Voice to use for this session */
  voice?: string;
}

/**
 * React hook for managing OpenAI Realtime Audio conversations
 * 
 * State Machine:
 * - disconnected: Not connected
 * - connecting: Establishing connection
 * - responding: AI is speaking
 * - speaking: User is recording
 * 
 * Flow:
 * 1. Call startSession() to connect and hear AI greeting
 * 2. Click toggleTurn() to speak
 * 3. Click toggleTurn() to send and hear AI response
 * 4. Repeat until endSession()
 */
export function useRealtimeAudio(options: UseRealtimeAudioOptions = {}) {
  const { onTranscriptUpdate, onStateChange, onError, onHangUp, sessionEndpoint, model, voice } = options;

  // State
  const [state, setState] = useState<ConversationState>("disconnected");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [hangUpReason, setHangUpReason] = useState<HangUpReason | null>(null);

  // Derived state
  const isRecording = state === "speaking";
  const isConnected = state !== "disconnected" && state !== "connecting";
  const isAISpeaking = state === "responding";

  // Handler ref (persists across renders)
  const handlerRef = useRef<RealtimeAudioHandler | null>(null);

  // Initialize handler on mount
  useEffect(() => {
    const handler = new RealtimeAudioHandler({
      ...(sessionEndpoint && { sessionEndpoint }),
      ...(model && { model }),
      ...(voice && { voice }),
    });

    handler.setEvents({
      onStateChange: (newState) => {
        setState(newState);
        // Reset hang-up reason when starting a new session
        if (newState === "connecting") {
          setHangUpReason(null);
        }
        onStateChange?.(newState);
      },
      onTranscriptUpdate: (messages) => {
        setTranscript(messages);
        onTranscriptUpdate?.(messages);
      },
      onError: (error) => {
        onError?.(error);
      },
      onHangUp: (reason) => {
        setHangUpReason(reason);
        onHangUp?.(reason);
      },
    });

    handlerRef.current = handler;

    // Cleanup on unmount
    return () => {
      handler.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update event callbacks when they change
  useEffect(() => {
    if (handlerRef.current) {
      handlerRef.current.setEvents({
        onStateChange: (newState) => {
          setState(newState);
          if (newState === "connecting") {
            setHangUpReason(null);
          }
          onStateChange?.(newState);
        },
        onTranscriptUpdate: (messages) => {
          setTranscript(messages);
          onTranscriptUpdate?.(messages);
        },
        onError: (error) => {
          onError?.(error);
        },
        onHangUp: (reason) => {
          setHangUpReason(reason);
          onHangUp?.(reason);
        },
      });
    }
  }, [onStateChange, onTranscriptUpdate, onError, onHangUp]);

  // Start a new session (connects and AI gives greeting)
  const startSession = useCallback(async () => {
    await handlerRef.current?.startSession();
  }, []);

  // End the current session gracefully
  const endSession = useCallback(async () => {
    await handlerRef.current?.endSession();
  }, []);

  // Toggle between speaking and responding
  const toggleTurn = useCallback(() => {
    handlerRef.current?.toggleTurn();
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    handlerRef.current?.clearTranscript();
    setTranscript([]);
  }, []);

  // Main toggle: starts session if disconnected, otherwise toggles turn
  const toggle = useCallback(async () => {
    if (state === "disconnected") {
      await startSession();
    } else {
      toggleTurn();
    }
  }, [state, startSession, toggleTurn]);

  return {
    // State
    /** Current conversation state */
    state,
    /** Whether user is currently recording */
    isRecording,
    /** Whether connected to the API */
    isConnected,
    /** Whether AI is currently responding */
    isAISpeaking,
    /** Conversation transcript */
    transcript,
    /** Reason if AI hung up (null if not hung up) */
    hangUpReason,
    /** Whether the AI hung up the call */
    wasHungUp: hangUpReason !== null,

    // Primary methods
    /** Start a new conversation session */
    startSession,
    /** End the current session gracefully */
    endSession,
    /** Toggle between speaking and listening to AI */
    toggleTurn,
    /** Start session if disconnected, otherwise toggle turn */
    toggle,

    // Utility
    /** Clear the transcript */
    clearTranscript,

    // Legacy aliases
    connect: startSession,
    disconnect: endSession,
    toggleRecording: toggle,
    toggleSession: toggle,
    startRecording: toggleTurn,
    stopRecording: toggleTurn,
    stopSession: endSession,

    /** Direct access to handler for advanced usage */
    handler: handlerRef.current,
  };
}
