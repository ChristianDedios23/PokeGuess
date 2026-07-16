"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/game";

interface ChatPanelProps {
  connectionId: string | null;
  selfDisplayName: string;
  selfConnectionId: string | null;
  enabled: boolean;
  incomingMessage: ChatMessage | null;
  sentConfirmation: { message: string; sentAt: string } | null;
  onSendMessage: (message: string) => void;
  className?: string;
  isHost?: boolean;
  connectionStatus?: "connected" | "connecting" | "error" | "disconnected";
}

export function ChatPanel({
  connectionId,
  selfDisplayName,
  selfConnectionId,
  enabled,
  incomingMessage,
  sentConfirmation,
  onSendMessage,
  className = "",
  isHost = false,
  connectionStatus = "disconnected",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  useEffect(() => {
    if (!incomingMessage) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === incomingMessage.id)) return prev;
      return [...prev, incomingMessage];
    });
  }, [incomingMessage]);

  useEffect(() => {
    if (!sentConfirmation || !selfConnectionId) return;
    const { message, sentAt } = sentConfirmation;
    setMessages((prev) => {
      const id = `${sentAt}-self`;
      if (prev.some((m) => m.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          from: selfDisplayName,
          text: message,
          sentAt,
          isSelf: true,
        },
      ];
    });
  }, [selfConnectionId, selfDisplayName, sentConfirmation]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !connectionId || !enabled) return;

    setSending(true);
    setError(null);
    try {
      onSendMessage(text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
      // Keep focus so the player can keep typing without re-clicking the input.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  const statusDotColor =
    connectionStatus === "connected"
      ? "bg-green-500"
      : connectionStatus === "connecting"
        ? "bg-amber-500"
        : connectionStatus === "error"
          ? "bg-red-500"
          : "bg-zinc-400";

  const statusLabel =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "connecting"
        ? "Connecting…"
        : "Offline";

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div className="shrink-0 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Chat</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor}`} />
          Playing as {selfDisplayName}
          {isHost ? " (Host)" : ""}
          {" · "}
          {statusLabel}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {!enabled ? (
          <p className="text-sm text-zinc-500">Chat unlocks after the game starts.</p>
        ) : messages.length === 0 ? (
          <div className="space-y-1 text-sm text-zinc-500">
            <p>No messages yet.</p>
            <p>Ask a yes/no question!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                message.isSelf
                  ? "ml-auto bg-red-600 text-white"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {!message.isSelf && (
                <p className="mb-1 text-xs font-medium opacity-70">{message.from}</p>
              )}
              <p>{message.text}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="px-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form
        onSubmit={handleSend}
        className="flex min-w-0 shrink-0 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={enabled ? "Send a message" : "Game not started"}
          disabled={!enabled || !connectionId}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={!enabled || !connectionId || sending || !draft.trim()}
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Send
        </button>
      </form>
    </section>
  );
}
