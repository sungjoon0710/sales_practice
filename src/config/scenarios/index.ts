/**
 * Sales Practice Scenarios
 * 
 * This module exports all available scenarios and utilities for working with them.
 * Add new scenarios by creating a new file and exporting it here.
 */

// Types
export * from "./types";
export { buildScenarioContext } from "./types";
export type { SalesScenario, ScenarioContact, ScenarioProduct } from "./types";

// Individual scenarios
export { giEndoscopyTubeScenario } from "./giEndoscopyTube";

// Scenario registry - add new scenarios here
import { giEndoscopyTubeScenario } from "./giEndoscopyTube";
import type { SalesScenario } from "./types";

export const scenarios: Record<string, SalesScenario> = {
  "gi-endoscopy-tube-001": giEndoscopyTubeScenario,
  // Add more scenarios here as they are created
  // "cardiology-stent-001": cardiologyStentScenario,
  // "orthopedic-implant-001": orthopedicImplantScenario,
};

/**
 * Get a scenario by ID
 */
export function getScenarioById(id: string): SalesScenario | undefined {
  return scenarios[id];
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
