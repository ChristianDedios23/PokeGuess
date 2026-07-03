"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/game";
import { sendChatMessage } from "@/lib/game";

interface ChatPanelProps {
  connectionId: string | null;
  selfDisplayName: string;
  selfConnectionId: string | null;
  enabled: boolean;
  incomingMessage: ChatMessage | null;
  sentConfirmation: { message: string; sentAt: string } | null;
}

export function ChatPanel({
  connectionId,
  selfDisplayName,
  selfConnectionId,
  enabled,
  incomingMessage,
  sentConfirmation,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !connectionId || !enabled) return;

    setSending(true);
    setError(null);
    try {
      await sendChatMessage(connectionId, text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-medium">Chat</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!enabled ? (
          <p className="text-sm text-zinc-500">Chat unlocks after the game starts.</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                message.isSelf
                  ? "ml-auto bg-blue-600 text-white"
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

      {error && <p className="px-4 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={enabled ? "Type a message…" : "Game not started"}
          disabled={!enabled || !connectionId || sending}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={!enabled || !connectionId || sending || !draft.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Send
        </button>
      </form>
    </section>
  );
}
