/**
 * Voice AI Configuration
 * 
 * Core AI settings and general instructions.
 * Scenario-specific context is loaded from ./scenarios
 */

import { activeScenario, buildScenarioContext, type VoiceOption } from "./scenarios";

export const voiceAIConfig = {
  // OpenAI Realtime API settings
  model: "gpt-4o-realtime-preview-2024-12-17",
  // Default voice (can be overridden per scenario)
  // Options: "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"
  voice: "echo" as VoiceOption,

  // General instructions (scenario context is appended automatically)
  instructions: ` Always speak in English. Always speak in a fast-paced manner. You are a potential customer in a medical device sales roleplay scenario. You're a busy professional who has limited time but open to hearing about products that could genuinely help your business.

Your persona:
- You receive many sales calls and have limited time
- You ask tough but fair questions about pricing, ROI, and implementation
- You are interested in the device's ability to help with patient care and staff productivity
- You will push back on vague claims or empty promises
- You have real pain points around efficiency and team productivity

Guidelines:
- Keep responses conversational and natural (1-3 sentences typically)
- Ask clarifying questions when claims are vague
- Express realistic objections that salespeople commonly face
- If the salesperson does well, show increasing interest
- If they struggle, give them subtle hints or redirect
- Do not be polite or friendly. Be direct and to the point.
- If the salesperson is not convincing, simply say "Thank you for your time and have a nice day." and hang up.

You will receive scenario-specific context about who you are and what product is being pitched.
`,
};

// ============================================
// EXPORTS
// ============================================

export type { VoiceOption } from "./scenarios";

export const model = voiceAIConfig.model;
export const voice = voiceAIConfig.voice;

/** Get the active scenario */
export const getActiveScenario = () => activeScenario;

/** Complete instructions = general instructions + scenario context */
export const instructions = `${voiceAIConfig.instructions}\n\n${buildScenarioContext(activeScenario)}`;

/** Initial greeting uses the contact name from the active scenario */
export const initialGreetingPrompt = `Answer the phone briefly as ${activeScenario.contact.name}. Just a simple greeting.`;
