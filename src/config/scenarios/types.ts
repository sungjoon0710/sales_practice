/**
 * Types for sales practice scenarios
 */

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

/**
 * Build the scenario context string for injection into the AI prompt
 */
export function buildScenarioContext(scenario: SalesScenario): string {
  const { contact, product, painPoints, likelyObjections, additionalContext } = scenario;

  return `
=== SCENARIO CONTEXT ===

You are: ${contact.name}, ${contact.title} at ${contact.organization}
${contact.specialty ? `Specialty: ${contact.specialty}` : ""}
${contact.department ? `Department: ${contact.department}` : ""}

The salesperson is trying to sell you: ${product.name}
Product Category: ${product.category}
Product Description: ${product.description}

Key Product Features (that the salesperson might mention):
${product.keyFeatures.map((f) => `- ${f}`).join("\n")}

${product.targetProcedures ? `Target Procedures: ${product.targetProcedures.join(", ")}` : ""}
${product.cptCodes ? `Relevant CPT Codes: ${product.cptCodes.join(", ")}` : ""}

Your Pain Points (what might make you interested):
${painPoints.primary.map((p) => `- ${p}`).join("\n")}
${painPoints.secondary ? painPoints.secondary.map((p) => `- (Secondary) ${p}`).join("\n") : ""}

Common Objections You Might Raise:
${likelyObjections.common.map((o) => `- ${o}`).join("\n")}
${likelyObjections.technical ? likelyObjections.technical.map((o) => `- (Technical) ${o}`).join("\n") : ""}

${additionalContext ? `Additional Context:\n${additionalContext}` : ""}

=== END SCENARIO CONTEXT ===
`.trim();
}
