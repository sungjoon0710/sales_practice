import { notFound } from "next/navigation";
import { SalesScenario } from "@/components/SalesScenario";
import { getScenarioById } from "@/config/scenarios";

interface ScenarioPageProps {
  params: Promise<{ scenarioId: string }>;
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const { scenarioId } = await params;
  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    notFound();
  }

  return <SalesScenario scenario={scenario} />;
}
