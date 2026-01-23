"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRealtimeAudio } from "@/hooks/useRealtimeAudio";
import type { SalesScenario as SalesScenarioType } from "@/config/scenarios";

interface SalesScenarioProps {
  scenario: SalesScenarioType;
}

export function SalesScenario({ scenario }: SalesScenarioProps) {
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    state,
    isRecording,
    isConnected,
    isAISpeaking,
    transcript,
    startSession,
    endSession,
    toggleTurn,
    clearTranscript,
  } = useRealtimeAudio({
    onError: (err) => setError(err),
  });

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getButtonStyles = () => {
    switch (state) {
      case "connecting":
        return "border-amber-400 bg-amber-50";
      case "speaking":
        return "border-red-500 bg-red-50 shadow-[0_0_60px_-15px_rgba(239,68,68,0.4)]";
      case "responding":
        return "border-blue-400 bg-blue-50 shadow-[0_0_60px_-15px_rgba(96,165,250,0.4)]";
      default:
        return "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100";
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "connecting":
        return "Connecting...";
      case "responding":
        return "AI is speaking — tap to interrupt";
      case "speaking":
        return "Recording — tap to send";
      default:
        return "Tap microphone to start";
    }
  };

  const getButtonHint = () => {
    switch (state) {
      case "disconnected":
        return "Start conversation";
      case "connecting":
        return "Please wait...";
      case "responding":
        return "Tap to speak";
      case "speaking":
        return "Tap to send";
      default:
        return "";
    }
  };

  const handleMicClick = async () => {
    if (state === "disconnected") {
      await startSession();
    } else if (state === "connecting") {
      // Do nothing while connecting
    } else {
      toggleTurn();
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/scenarios"
              onClick={() => {
                if (isConnected) {
                  endSession();
                }
              }}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
              title="Back to scenarios"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Sales Practice</h1>
              <p className="text-sm text-zinc-500">AI-powered roleplay scenarios</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {transcript.length > 0 && (
              <button
                onClick={clearTranscript}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
              >
                Clear Chat
              </button>
            )}
            {isConnected && (
              <button
                onClick={endSession}
                className="text-xs px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-colors"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-red-600 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8">
        {/* Scenario Card */}
        <div className="mb-8 p-5 rounded-xl bg-zinc-50 border border-zinc-200">
          <div>
            <h2 className="font-medium text-zinc-900">{scenario.name}</h2>
            <p className="text-sm text-zinc-500 mt-1">{scenario.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  scenario.difficulty === "beginner"
                    ? "bg-green-100 text-green-700"
                    : scenario.difficulty === "intermediate"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {scenario.difficulty.charAt(0).toUpperCase() + scenario.difficulty.slice(1)}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-200 text-zinc-600">
                {scenario.estimatedDuration}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                Push-to-talk
              </span>
            </div>
            {/* Contact Info */}
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="text-xs text-zinc-500 mb-2">You&apos;re calling:</div>
              <div className="flex items-center gap-3">
                {scenario.contact.image ? (
                  <Image
                    src={scenario.contact.image}
                    alt={scenario.contact.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-300"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl border border-zinc-300">
                    👤
                  </div>
                )}
                <div>
                  <div className="text-sm text-zinc-700">
                    <span className="font-medium">{scenario.contact.name}</span>
                    <span className="text-zinc-400"> · </span>
                    <span>{scenario.contact.title}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{scenario.contact.organization}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 mb-8 overflow-hidden flex flex-col">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Conversation
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-[200px]">
            {transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-400 text-sm text-center px-4">
                {state === "disconnected" ? (
                  <span>
                    Tap the microphone to start.
                    <br />
                    <span className="text-zinc-300">The AI will pick up the call and greet you.</span>
                  </span>
                ) : state === "connecting" ? (
                  "Connecting to AI..."
                ) : state === "responding" && transcript.length === 0 ? (
                  "AI is preparing to greet you..."
                ) : (
                  "Waiting for conversation to begin..."
                )}
              </div>
            ) : (
              <>
                {transcript.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.role === "user"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-zinc-100 text-zinc-800 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ))}

                {/* AI thinking indicator */}
                {isAISpeaking && transcript.length > 0 && transcript[transcript.length - 1].role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-100 text-zinc-800 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1.5">
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Voice Control Area */}
        <div className="flex flex-col items-center gap-6 py-8">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                state === "disconnected"
                  ? "bg-zinc-300"
                  : state === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : state === "responding"
                  ? "bg-blue-400 animate-pulse"
                  : "bg-red-500 animate-pulse"
              }`}
            />
            <span className="text-sm text-zinc-500">{getStatusText()}</span>
          </div>

          {/* Main Voice Button */}
          <button
            onClick={handleMicClick}
            disabled={state === "connecting"}
            className={`relative w-24 h-24 rounded-full border-2 transition-all duration-300 ${getButtonStyles()} ${
              state === "connecting" ? "cursor-wait" : "cursor-pointer"
            }`}
          >
            {/* Pulse rings */}
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-red-500 opacity-30 animate-ping" />
                <span
                  className="absolute inset-[-8px] rounded-full border border-red-500 opacity-20 animate-pulse"
                  style={{ animationDuration: "1s" }}
                />
              </>
            )}

            {/* Icon */}
            <span className="relative flex items-center justify-center">
              {state === "disconnected" ? (
                <MicIcon className="w-8 h-8 text-zinc-500" />
              ) : state === "connecting" ? (
                <LoaderIcon className="w-8 h-8 text-amber-500 animate-spin" />
              ) : state === "responding" ? (
                <SpeakerIcon className="w-8 h-8 text-blue-500" />
              ) : (
                <StopIcon className="w-8 h-8 text-red-500" />
              )}
            </span>
          </button>

          {/* Action hint */}
          <p className="text-xs text-zinc-400">{getButtonHint()}</p>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording...</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-500">
          <span>Powered by OpenAI Realtime API</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-zinc-300"
              }`}
            />
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple icon components
function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
      />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}
