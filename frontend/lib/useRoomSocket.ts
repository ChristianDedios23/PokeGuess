"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/config";
import type { GameRoom, WsPayload } from "@/lib/game";
import { updateSessionConnectionId } from "@/lib/session";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface UseRoomSocketOptions {
  roomCode: string;
  displayName: string;
  enabled: boolean;
  onRoomUpdate: (room: GameRoom) => void;
  onGameStarted: (room: GameRoom) => void;
  onChatMessage: (payload: Extract<WsPayload, { action: "chatMessage" }>) => void;
  onChatMessageSent: (payload: Extract<WsPayload, { action: "chatMessageSent" }>) => void;
}

export function useRoomSocket({
  roomCode,
  displayName,
  enabled,
  onRoomUpdate,
  onGameStarted,
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
    onChatMessage,
    onChatMessageSent,
  });

  callbacksRef.current = {
    onRoomUpdate,
    onGameStarted,
    onChatMessage,
    onChatMessageSent,
  };

  const connect = useCallback(() => {
    if (!enabled || !roomCode || !displayName) return;

    wsRef.current?.close();
    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "register", roomCode, displayName }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as WsPayload;

      if (data.action === "registered") {
        setConnectionId(data.connectionId);
        updateSessionConnectionId(data.connectionId);
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
      setError("WebSocket connection failed");
    };

    ws.onclose = () => {
      setStatus((current) => (current === "error" ? current : "idle"));
      setConnectionId(null);
    };
  }, [displayName, enabled, roomCode]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, connectionId, error, reconnect: connect };
}
