/**
 * Sales Practice Scenarios
 * 
 * This module exports all available scenarios and utilities for working with them.
 * Add new scenarios by creating a new file and exporting it here.
 */

// Types
export * from "./types";
export { buildScenarioContext } from "./buildScenarioContext";
export type { SalesScenario, ScenarioContact, ScenarioProduct, VoiceOption } from "./types";

// Individual scenarios
export { giEndoscopyTubeScenario } from "./giEndoscopyTube";

// Scenario registry - add new scenarios here
import { giEndoscopyTubeScenario } from "./giEndoscopyTube";
import type { SalesScenario } from "./types";

export const scenarios: Record<string, SalesScenario> = {
  giEndoscopyTube: giEndoscopyTubeScenario,
  // Add more scenarios here as they are created
  // cardiologyStent: cardiologyStentScenario,
  // orthopedicImplant: orthopedicImplantScenario,
};

/**
 * Get a scenario by slug (URL identifier)
 */
export function getScenarioById(slug: string): SalesScenario | undefined {
  return scenarios[slug];
}

/**
 * Get all available scenarios
 */
export function getAllScenarios(): SalesScenario[] {
  return Object.values(scenarios);
}

/**
 * Default/active scenario
 * Change this to switch the active scenario
 */
export const activeScenario = giEndoscopyTubeScenario;
