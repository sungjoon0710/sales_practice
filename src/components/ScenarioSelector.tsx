"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllScenarios, type SalesScenario } from "@/config/scenarios";

export function ScenarioSelector() {
  const scenarios = getAllScenarios();

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Available Scenarios</h1>
          <p className="text-zinc-500 mt-1">Select a scenario to begin your practice session</p>
        </div>

        {/* Scenario Grid */}
        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}

          {/* Placeholder for future scenarios */}
          <div className="p-6 rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center min-h-[120px]">
            <p className="text-zinc-500 text-sm">More scenarios coming soon...</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-6 py-4 mt-auto">
        <div className="max-w-4xl mx-auto text-xs text-zinc-500">
          Powered by OpenAI Realtime API
        </div>
      </footer>
    </div>
  );
}

interface ScenarioCardProps {
  scenario: SalesScenario;
}

function ScenarioCard({ scenario }: ScenarioCardProps) {
  const difficultyColors = {
    beginner: "bg-green-100 text-green-700",
    intermediate: "bg-amber-100 text-amber-700",
    advanced: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-zinc-900">{scenario.name}</h3>
          <p className="text-sm text-zinc-500 mt-1">{scenario.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span
              className={`text-xs px-2 py-1 rounded-full ${difficultyColors[scenario.difficulty]}`}
            >
              {scenario.difficulty.charAt(0).toUpperCase() + scenario.difficulty.slice(1)}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-zinc-200 text-zinc-600">
              {scenario.estimatedDuration}
            </span>
          </div>

          {/* Contact Preview */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-200">
            {scenario.contact.image ? (
              <Image
                src={scenario.contact.image}
                alt={scenario.contact.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover border border-zinc-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-lg border border-zinc-300">
                👤
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-700 truncate">{scenario.contact.name}</div>
              <div className="text-xs text-zinc-500 truncate">
                {scenario.contact.title} · {scenario.contact.organization}
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button asChild className="shrink-0">
          <Link href={`/scenarios/${scenario.slug}`}>Start Practice</Link>
        </Button>
      </div>
    </div>
  );
}
