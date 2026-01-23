import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-center">
          Sales Practice
        </h1>
        
        <p className="mt-6 text-zinc-600 text-center leading-relaxed">
          Practice your sales conversations with AI-powered roleplay scenarios. 
          Each scenario simulates a realistic cold call or sales meeting, giving you 
          a safe space to refine your pitch, handle objections, and build confidence.
        </p>

        <p className="mt-4 text-zinc-500 text-sm text-center">
          Powered by OpenAI&apos;s Realtime API for natural, voice-based conversations.
        </p>

        <Link
          href="/scenarios"
          className="mt-10 px-6 py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Browse Scenarios
        </Link>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-4">
        <div className="max-w-2xl mx-auto text-xs text-zinc-500 text-center">
          Built for sales professionals who want to sharpen their skills.
        </div>
      </footer>
    </div>
  );
}
