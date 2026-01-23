import type { SalesScenario } from "./types";

/**
 * Scenario: Selling specialized endoscopy tubes to a GI specialist
 */
export const giEndoscopyTubeScenario: SalesScenario = {
  id: "gi-endoscopy-tube-001",
  name: "GI Endoscopy Tube - Huntsville Hospital",
  description:
    "Cold call to a gastroenterologist about a specialized endoscopy tube for esophageal procedures",
  difficulty: "intermediate",
  estimatedDuration: "5-10 min",
  slug: "giEndoscopyTube",

  contact: {
    name: "Dr. John Kim",
    title: "Gastroenterologist",
    organization: "Huntsville Hospital",
    specialty: "Gastroenterology (GI)",
    department: "Digestive Health Center",
    image: "/JohnKim.png",
  },

  product: {
    name: "EndoFlex Pro Esophageal Tube",
    category: "Medical Device - Endoscopy Equipment",
    description:
      "A specialized flexible tube designed for esophageal endoscopy procedures, featuring improved maneuverability, enhanced visualization, and reduced patient discomfort.",
    keyFeatures: [
      "Ultra-flexible design for easier navigation through the esophagus",
      "High-definition imaging capability compatible with existing scopes",
      "Reduced diameter for improved patient comfort",
      "Enhanced biopsy channel for better tissue sampling",
      "Single-use sterile packaging reducing cross-contamination risk",
      "Compatible with standard EGD equipment",
    ],
    targetProcedures: [
      "Diagnostic esophagogastroduodenoscopy (EGD)",
      "EGD with biopsy",
      "Flexible transoral esophagoscopy",
      "Balloon dilation procedures",
      "Endoscopic ultrasound",
    ],
    cptCodes: [
      "43235 - Diagnostic EGD",
      "43239 - EGD with biopsy",
      "43191 - Flexible transoral esophagoscopy",
      "43249 - Balloon dilation (<30mm)",
      "43231-43232 - Esophagoscopy with ultrasound",
      "43191-43196 - Flexible esophagoscopy range",
      "43180-43190 - Rigid esophagoscopy range",
    ],
  },

  painPoints: {
    primary: [
      "Current tubes may cause patient discomfort leading to procedure intolerance",
      "Difficulty navigating through strictures or narrow passages",
      "Suboptimal visualization affecting diagnostic accuracy",
      "Concerns about cross-contamination with reusable equipment",
      "Time spent on difficult intubations affecting procedure throughput",
    ],
    secondary: [
      "Staff training time for new equipment",
      "Storage and inventory management for disposables",
      "Reimbursement concerns for new devices",
    ],
  },

  likelyObjections: {
    common: [
      "We're happy with our current supplier",
      "Budget constraints - need to justify new equipment costs",
      "Don't have time for product demonstrations",
      "Need to involve purchasing/procurement department",
      "Would need to see clinical data and studies",
    ],
    technical: [
      "How does it compare to [competitor product]?",
      "What's the learning curve for the staff?",
      "Is it compatible with our existing Olympus/Fuji scopes?",
      "What about reimbursement - are there specific codes for this device?",
      "What's the per-procedure cost compared to reusable options?",
    ],
  },

  additionalContext: `
Dr. Kim performs approximately 15-20 EGD procedures per week. The hospital currently uses 
a mix of reusable and single-use endoscopy equipment. Recent hospital initiatives have 
emphasized infection control and patient satisfaction scores.

The GI department has been exploring ways to improve procedure efficiency and reduce 
patient complaints about discomfort during upper endoscopy procedures.

Key decision factors for Dr. Kim:
- Clinical efficacy and patient outcomes
- Ease of use and compatibility with existing equipment  
- Total cost of ownership (not just per-unit cost)
- Evidence-based data supporting the product
- Peer recommendations from other GI specialists
`,
};
