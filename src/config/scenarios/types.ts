/**
 * Types for sales practice scenarios
 */

// OpenAI Realtime API voice options
export type VoiceOption = "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";

export interface ScenarioContact {
  name: string;
  title: string;
  organization: string;
  specialty?: string;
  department?: string;
  image?: string; // Path to contact's profile image (e.g., "/JohnKim.png")
}

export interface ScenarioProduct {
  name: string;
  category: string;
  description: string;
  keyFeatures: string[];
  targetProcedures?: string[];
  cptCodes?: string[];
}

export interface ScenarioPainPoints {
  primary: string[];
  secondary?: string[];
}

export interface ScenarioObjections {
  common: string[];
  technical?: string[];
}

export interface SalesScenario {
  id: string;
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: string;
  slug: string; // URL-friendly identifier (e.g., "giEndoscopyTube")
  
  // Voice for this scenario
  // Options: "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"
  voice: VoiceOption;
  
  // Who the AI is playing
  contact: ScenarioContact;
  
  // What's being sold
  product: ScenarioProduct;
  
  // Context for the AI
  painPoints: ScenarioPainPoints;
  likelyObjections: ScenarioObjections;
  
  // Additional context that gets injected into the prompt
  additionalContext?: string;
}