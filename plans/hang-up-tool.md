# Implementation Plan: AI Hang-Up Tool

## Overview

Allow the AI (playing the prospect) to end the call autonomously, simulating a realistic cold-calling experience where prospects can hang up if unconvinced.

---

## Architecture

```
┌─────────────────┐     tool call      ┌──────────────────┐
│   OpenAI API    │  ───────────────►  │  MessageHandler  │
│  (AI decides    │   "hang_up"        │  (detects tool   │
│   to hang up)   │                    │   call event)    │
└─────────────────┘                    └────────┬─────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │ RealtimeAudio    │
                                       │ Handler          │
                                       │ (ends session)   │
                                       └────────┬─────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │ UI (shows        │
                                       │ "Call ended by   │
                                       │  prospect")      │
                                       └──────────────────┘
```

---

## Implementation Steps

### 1. Define the Tool Schema

**File:** `src/config/voiceAI.ts`

Add a tools array to the voiceAIConfig:

```typescript
export const voiceAIConfig = {
  model: "...",
  voice: "...",
  instructions: "...",
  
  // Tool definitions for the AI
  tools: [
    {
      type: "function",
      name: "hang_up",
      description: "End the phone call. Use this when you've decided to end the conversation - either because you're not interested, the salesperson is wasting your time, or you've heard enough.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: ["not_interested", "too_busy", "bad_pitch", "rude_behavior", "heard_enough"],
            description: "Why you're ending the call"
          }
        },
        required: ["reason"]
      }
    }
  ]
};
```

### 2. Pass Tools to Session Creation

**File:** `src/app/api/realtime/session/route.ts`

Update the session creation to include tools:

```typescript
body: JSON.stringify({
  model: voiceAIConfig.model,
  voice: voice,
  instructions: voiceAIConfig.instructions,
  tools: voiceAIConfig.tools,  // Add this
}),
```

### 3. Handle Tool Calls in MessageHandler

**File:** `src/lib/realtime/MessageHandler.ts`

Add a callback for tool calls and handle the `hang_up` function:

```typescript
interface MessageHandlerCallbacks {
  // ... existing callbacks
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
}

// In handleMessage():
case "response.function_call_arguments.done":
  const { name, arguments: argsJson } = event;
  const args = JSON.parse(argsJson);
  this.callbacks.onToolCall?.(name, args);
  break;
```

### 4. Wire Up Tool Handling in RealtimeAudioHandler

**File:** `src/lib/realtime/RealtimeAudioHandler.ts`

Handle the tool call and end the session:

```typescript
// In MessageHandler initialization:
onToolCall: (name, args) => {
  if (name === "hang_up") {
    logger.info("AI hung up the call:", args.reason);
    this.handleHangUp(args.reason as string);
  }
}

// New method:
private handleHangUp(reason: string) {
  // Notify the UI about the hang-up
  this.events.onHangUp?.(reason);
  
  // End the session gracefully
  this.endSession();
}
```

### 5. Add Event to Hook and Component

**File:** `src/lib/realtime/types.ts`

```typescript
export interface RealtimeAudioEvents {
  // ... existing
  onHangUp?: (reason: string) => void;
}
```

**File:** `src/hooks/useRealtimeAudio.ts`

```typescript
const [hangUpReason, setHangUpReason] = useState<string | null>(null);

// In handler setup:
onHangUp: (reason) => {
  setHangUpReason(reason);
  options.onHangUp?.(reason);
}

// Return:
return {
  // ... existing
  hangUpReason,
  wasHungUp: hangUpReason !== null,
};
```

### 6. Update UI to Show Hang-Up State

**File:** `src/components/SalesScenario.tsx`

Show a distinct UI when the AI hangs up:

```tsx
const { hangUpReason, wasHungUp, ... } = useRealtimeAudio({...});

// In the transcript area or as a modal:
{wasHungUp && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
    <p className="text-red-800 font-medium">Call Ended</p>
    <p className="text-red-600 text-sm mt-1">
      {getHangUpMessage(hangUpReason)}
    </p>
  </div>
)}

function getHangUpMessage(reason: string): string {
  switch (reason) {
    case "not_interested": return "The prospect wasn't interested.";
    case "too_busy": return "The prospect was too busy to talk.";
    case "bad_pitch": return "Your pitch didn't resonate.";
    case "rude_behavior": return "The prospect felt disrespected.";
    case "heard_enough": return "The prospect had heard enough.";
    default: return "The prospect ended the call.";
  }
}
```

### 7. Update AI Instructions

**File:** `src/config/voiceAI.ts`

Add guidance on when to use the hang-up tool:

```typescript
instructions: `
... existing instructions ...

HANG UP BEHAVIOR:
- If the salesperson is clearly unprepared or wasting your time, hang up
- If they're rude or pushy, hang up immediately
- If after 2-3 exchanges they haven't given you a compelling reason to stay, hang up
- Say a brief closing phrase like "I have to go" or "Thanks but no thanks" BEFORE hanging up
- Use the hang_up tool to actually end the call after your closing statement
`
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/voiceAI.ts` | Add tools array, update instructions |
| `src/app/api/realtime/session/route.ts` | Pass tools to OpenAI |
| `src/lib/realtime/types.ts` | Add `onHangUp` event type |
| `src/lib/realtime/MessageHandler.ts` | Handle function call events |
| `src/lib/realtime/RealtimeAudioHandler.ts` | Wire up tool handling, add `handleHangUp` |
| `src/hooks/useRealtimeAudio.ts` | Expose hang-up state |
| `src/components/SalesScenario.tsx` | Show hang-up UI |

---

## Testing Considerations

1. **Sensitivity tuning**: Start with conservative hang-up triggers, then adjust based on testing
2. **Graceful audio**: Ensure any AI speech completes before disconnecting
3. **State cleanup**: Reset hang-up state when starting a new session
4. **Edge cases**: Handle hang-up during user speaking, during connection, etc.

---

## Optional Enhancements

- **Hang-up analytics**: Track why the AI hung up to help users improve
- **Difficulty levels**: Beginner scenarios = more patient prospect, Advanced = quick to hang up
- **Warning signs**: Show subtle UI hints when the AI is getting impatient
- **Retry option**: "Try again" button after being hung up on

---

## Estimated Effort

- Core implementation: ~2 hours
- UI polish: ~30 minutes  
- Testing & tuning: ~1 hour

---

## Questions Before Implementation

1. Should the AI say a closing phrase before hanging up, or just disconnect?
2. Do you want hang-up sensitivity to vary by scenario difficulty?
3. Should we track/display hang-up statistics for the user?
