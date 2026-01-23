import { logger } from "./logger";
import { base64ToInt16Array } from "./audioUtils";
import type { TranscriptMessage, RealtimeEvent } from "./types";

export interface MessageHandlerCallbacks {
  onSessionCreated?: (sessionId: string) => void;
  onAudioDelta?: (audioData: Int16Array) => void;
  onAssistantTranscript?: (text: string, itemId: string, isDone: boolean) => void;
  onUserTranscript?: (text: string, itemId: string) => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onResponseStarted?: () => void;
  onResponseDone?: (status: string) => void;
  onError?: (message: string, code?: string) => void;
}

interface ConversationItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: number;
}

/**
 * Handles incoming WebSocket messages from the OpenAI Realtime API
 * 
 * Properly tracks conversation order since user transcription
 * arrives asynchronously after AI has started responding.
 */
export class MessageHandler {
  private callbacks: MessageHandlerCallbacks;
  private onTranscriptChange?: (transcript: TranscriptMessage[]) => void;

  // Conversation tracking
  private conversationItems: Map<string, ConversationItem> = new Map();
  private itemOrder: string[] = []; // Maintains correct order
  
  // Current assistant response being built
  private currentResponseItemId: string | null = null;
  private currentResponseText = "";

  constructor(
    callbacks: MessageHandlerCallbacks,
    onTranscriptChange?: (transcript: TranscriptMessage[]) => void
  ) {
    this.callbacks = callbacks;
    this.onTranscriptChange = onTranscriptChange;
  }

  /**
   * Process an incoming WebSocket message
   */
  handleMessage(event: MessageEvent): void {
    const data: RealtimeEvent = JSON.parse(event.data);
    this.processEvent(data);
  }

  /**
   * Process a parsed event
   */
  private processEvent(data: RealtimeEvent): void {
    switch (data.type) {
      case "session.created":
        this.handleSessionCreated(data);
        break;

      case "session.updated":
        logger.info("Session updated");
        break;

      // Conversation item events - track order
      case "conversation.item.created":
        this.handleItemCreated(data);
        break;

      // Audio events
      case "response.audio.delta":
        this.handleAudioDelta(data);
        break;

      // Assistant transcript events
      case "response.audio_transcript.delta":
        this.handleAssistantTranscriptDelta(data);
        break;

      case "response.audio_transcript.done":
        this.handleAssistantTranscriptDone(data);
        break;

      // User transcript event (arrives late!)
      case "conversation.item.input_audio_transcription.completed":
        this.handleUserTranscription(data);
        break;

      // Response lifecycle
      case "response.created":
        logger.info("Response started");
        this.callbacks.onResponseStarted?.();
        break;

      case "response.output_item.added":
        this.handleOutputItemAdded(data);
        break;

      case "response.done":
        this.handleResponseDone(data);
        break;

      // Input audio events
      case "input_audio_buffer.speech_started":
        logger.info("Speech detected - user started speaking");
        this.callbacks.onSpeechStarted?.();
        break;

      case "input_audio_buffer.speech_stopped":
        logger.info("User stopped speaking");
        this.callbacks.onSpeechStopped?.();
        break;

      case "input_audio_buffer.committed":
        logger.debug("Audio buffer committed");
        break;

      case "error":
        this.handleError(data);
        break;

      // Debug logging for other events
      case "response.output_item.done":
      case "response.content_part.added":
      case "response.content_part.done":
      case "rate_limits.updated":
        logger.debug("Event:", data.type);
        break;

      default:
        if (data.type) {
          logger.debug("Unhandled event:", data.type);
        }
    }
  }

  // ==================== Event Handlers ====================

  private handleSessionCreated(data: RealtimeEvent): void {
    const session = data.session as { id: string };
    logger.info("Session created successfully", session?.id);
    this.callbacks.onSessionCreated?.(session?.id);
  }

  /**
   * Track when conversation items are created to maintain order
   */
  private handleItemCreated(data: RealtimeEvent): void {
    const item = data.item as { id: string; role: string; type: string };
    
    if (!item?.id) return;

    logger.debug("Conversation item created:", item.id, item.role, item.type);

    // Only track message items
    if (item.type === "message" || item.type === "function_call_output") {
      const role = item.role === "user" ? "user" : "assistant";
      
      // Add to order if not already tracked
      if (!this.conversationItems.has(item.id)) {
        this.conversationItems.set(item.id, {
          id: item.id,
          role,
          text: "",
          status: "pending",
          createdAt: Date.now(),
        });
        this.itemOrder.push(item.id);
        logger.debug("Tracking new item:", item.id, "order:", this.itemOrder.length);
      }
    }
  }

  /**
   * Track when output items (assistant responses) are added
   */
  private handleOutputItemAdded(data: RealtimeEvent): void {
    const item = data.item as { id: string; role: string };
    
    if (!item?.id) return;

    logger.debug("Output item added:", item.id);

    // This is the assistant's response item - track it
    if (!this.conversationItems.has(item.id)) {
      this.conversationItems.set(item.id, {
        id: item.id,
        role: "assistant",
        text: "",
        status: "in_progress",
        createdAt: Date.now(),
      });
      this.itemOrder.push(item.id);
    }

    this.currentResponseItemId = item.id;
    this.currentResponseText = "";
  }

  private handleAudioDelta(data: RealtimeEvent): void {
    const delta = data.delta as string;
    if (delta) {
      const audioData = base64ToInt16Array(delta);
      this.callbacks.onAudioDelta?.(audioData);
    }
  }

  /**
   * Handle streaming assistant transcript
   */
  private handleAssistantTranscriptDelta(data: RealtimeEvent): void {
    const delta = data.delta as string;
    const itemId = data.item_id as string;

    if (!delta) return;

    // Accumulate the transcript
    this.currentResponseText += delta;

    // Use the item_id from the event, or fall back to tracked response
    const targetId = itemId || this.currentResponseItemId;

    if (targetId) {
      // Update or create the item
      const existing = this.conversationItems.get(targetId);
      if (existing) {
        existing.text = this.currentResponseText;
        existing.status = "in_progress";
      } else {
        this.conversationItems.set(targetId, {
          id: targetId,
          role: "assistant",
          text: this.currentResponseText,
          status: "in_progress",
          createdAt: Date.now(),
        });
        this.itemOrder.push(targetId);
      }

      this.currentResponseItemId = targetId;
    }

    // Emit transcript update
    this.emitTranscriptUpdate();
    this.callbacks.onAssistantTranscript?.(this.currentResponseText, targetId || "", false);
  }

  /**
   * Handle assistant transcript completion
   */
  private handleAssistantTranscriptDone(data: RealtimeEvent): void {
    const itemId = data.item_id as string;
    
    logger.info("Assistant transcript done for item:", itemId);

    // Mark the item as completed
    const targetId = itemId || this.currentResponseItemId;
    if (targetId) {
      const item = this.conversationItems.get(targetId);
      if (item) {
        item.status = "completed";
        item.text = this.currentResponseText;
      }
      
      this.callbacks.onAssistantTranscript?.(this.currentResponseText, targetId, true);
    }

    // Reset current response tracking
    this.currentResponseItemId = null;
    this.currentResponseText = "";

    this.emitTranscriptUpdate();
  }

  /**
   * Handle user transcription (arrives AFTER AI has started responding)
   * Need to insert at the correct position in the conversation
   */
  private handleUserTranscription(data: RealtimeEvent): void {
    const transcript = data.transcript as string;
    const itemId = data.item_id as string;

    if (!transcript || !itemId) {
      logger.warn("User transcription missing data:", { transcript: !!transcript, itemId: !!itemId });
      return;
    }

    logger.info("User transcript received:", transcript.substring(0, 50) + "...");

    // Check if we already have this item tracked
    const existing = this.conversationItems.get(itemId);
    
    if (existing) {
      // Update existing item with transcript
      existing.text = transcript;
      existing.status = "completed";
      logger.debug("Updated existing user item:", itemId);
    } else {
      // Need to insert at correct position
      // The user's message should come BEFORE any assistant response that follows
      const newItem: ConversationItem = {
        id: itemId,
        role: "user",
        text: transcript,
        status: "completed",
        createdAt: Date.now(),
      };

      this.conversationItems.set(itemId, newItem);

      // Find where to insert: before the first assistant message that came after
      // Since this transcription is late, find the assistant response that followed
      // and insert before it
      const insertPosition = this.findUserInsertPosition(itemId);
      
      if (insertPosition >= 0 && insertPosition < this.itemOrder.length) {
        this.itemOrder.splice(insertPosition, 0, itemId);
        logger.debug("Inserted user item at position:", insertPosition);
      } else {
        this.itemOrder.push(itemId);
        logger.debug("Appended user item at end");
      }
    }

    this.emitTranscriptUpdate();
    this.callbacks.onUserTranscript?.(transcript, itemId);
  }

  /**
   * Find the correct position to insert a late-arriving user transcript
   */
  private findUserInsertPosition(userItemId: string): number {
    // Look for the first assistant message that doesn't have a preceding user message
    // This is a heuristic - in a turn-taking conversation, assistant follows user
    
    // Start from the end and find the last assistant message
    for (let i = this.itemOrder.length - 1; i >= 0; i--) {
      const id = this.itemOrder[i];
      const item = this.conversationItems.get(id);
      
      if (item?.role === "assistant" && item.status !== "pending") {
        // Check if there's already a user message before this
        if (i > 0) {
          const prevItem = this.conversationItems.get(this.itemOrder[i - 1]);
          if (prevItem?.role === "user") {
            // Already has a user message, continue looking
            continue;
          }
        }
        // Found an assistant message without a preceding user message
        return i;
      }
    }

    // Default: append at end
    return this.itemOrder.length;
  }

  private handleResponseDone(data: RealtimeEvent): void {
    const response = data.response as { status: string; status_details?: unknown };
    logger.info("Response complete:", response?.status);
    
    if (response?.status === "failed") {
      logger.error("Response failed:", response?.status_details);
    }

    this.callbacks.onResponseDone?.(response?.status);
  }

  private handleError(data: RealtimeEvent): void {
    const error = data.error as { message: string; code?: string };
    logger.error("Realtime API error:", error);
    this.callbacks.onError?.(error?.message || "Unknown error", error?.code);
  }

  // ==================== Transcript Management ====================

  /**
   * Build and emit the ordered transcript
   */
  private emitTranscriptUpdate(): void {
    const transcript = this.buildTranscript();
    this.onTranscriptChange?.(transcript);
  }

  /**
   * Build transcript from conversation items in correct order
   */
  private buildTranscript(): TranscriptMessage[] {
    const messages: TranscriptMessage[] = [];

    for (const id of this.itemOrder) {
      const item = this.conversationItems.get(id);
      if (item && item.text) {
        messages.push({
          id: item.id,
          role: item.role,
          text: item.text,
        });
      }
    }

    return messages;
  }

  /**
   * Get the current transcript
   */
  getTranscript(): TranscriptMessage[] {
    return this.buildTranscript();
  }

  /**
   * Clear the transcript
   */
  clearTranscript(): void {
    this.conversationItems.clear();
    this.itemOrder = [];
    this.currentResponseItemId = null;
    this.currentResponseText = "";
    this.onTranscriptChange?.([]);
    logger.info("Transcript cleared");
  }

  /**
   * Set transcript change callback
   */
  setOnTranscriptChange(callback: (transcript: TranscriptMessage[]) => void): void {
    this.onTranscriptChange = callback;
  }
}
