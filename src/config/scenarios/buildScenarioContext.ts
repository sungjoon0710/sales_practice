import { SalesScenario } from "./types";

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
  