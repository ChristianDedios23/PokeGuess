"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/config";
import type { GameRoom, WsAction, WsGameOver, WsPayload } from "@/lib/game";
import { updateSessionConnectionId } from "@/lib/session";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface UseRoomSocketOptions {
  roomCode: string;
  displayName: string;
  playerToken: string | undefined;
  enabled: boolean;
  onRoomUpdate: (room: GameRoom) => void;
  onGameStarted: (room: GameRoom) => void;
  onGameOver: (payload: WsGameOver) => void;
  onChatMessage: (payload: Extract<WsPayload, { action: "chatMessage" }>) => void;
  onChatMessageSent: (payload: Extract<WsPayload, { action: "chatMessageSent" }>) => void;
}

export function useRoomSocket({
  roomCode,
  displayName,
  playerToken,
  enabled,
  onRoomUpdate,
  onGameStarted,
  onGameOver,
  onChatMessage,
  onChatMessageSent,
}: UseRoomSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({
    onRoomUpdate,
    onGameStarted,
    onGameOver,
    onChatMessage,
    onChatMessageSent,
  });

  callbacksRef.current = {
    onRoomUpdate,
    onGameStarted,
    onGameOver,
    onChatMessage,
    onChatMessageSent,
  };

  const send = useCallback((action: WsAction) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("You're not connected right now. Please wait a moment and try again.");
    }
    ws.send(JSON.stringify(action));
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !roomCode || !displayName || !playerToken) return;

    wsRef.current?.close();
    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "register", roomCode, displayName, playerToken }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as WsPayload;

      if (data.action === "registered") {
        setConnectionId(data.connectionId);
        updateSessionConnectionId(roomCode, data.connectionId);
        setStatus("connected");
        callbacksRef.current.onRoomUpdate(data.room);
        return;
      }

      if (data.action === "error") {
        setStatus("error");
        setError(data.message);
        return;
      }

      if (data.action === "roomUpdated" || data.action === "playerJoined") {
        callbacksRef.current.onRoomUpdate(data.room);
        return;
      }

      if (data.action === "gameStarted") {
        callbacksRef.current.onGameStarted(data.room);
        return;
      }

      if (data.action === "gameOver") {
        callbacksRef.current.onGameOver(data);
        return;
      }

      if (data.action === "chatMessage") {
        callbacksRef.current.onChatMessage(data);
        return;
      }

      if (data.action === "chatMessageSent") {
        callbacksRef.current.onChatMessageSent(data);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setError("Lost connection to the game. Please try reconnecting.");
    };

    ws.onclose = () => {
      setStatus((current) => (current === "error" ? current : "idle"));
      setConnectionId(null);
    };
  }, [displayName, enabled, playerToken, roomCode]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  // Periodically nudges the server to re-check the room while connected.
  // This is what actually resolves a disconnected opponent's grace period —
  // the server no longer relies on a live in-process timer for that.
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => {
      try {
        send({ action: "ping" });
      } catch {
        // Socket likely just closed; the next connect cycle resumes this.
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [status, send]);

  return { status, connectionId, error, reconnect: connect, send };
}
