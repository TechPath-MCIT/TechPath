"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AgentChat,
  type AgentConversationSummary,
  type AgentMessage,
} from "@/ui/figma/generated/components/AgentChat";
import { useWorkspaceProfile } from "@/components/workspace/WorkspaceProfileProvider";

type ConversationApiItem = {
  conversationId: number;
  title: string | null;
  chatContext: Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>;
  updatedAt: string;
};

type ConversationsApiResponse = {
  success: boolean;
  data?: ConversationApiItem[];
  error?: string;
};

type AgentApiResponse = {
  success: boolean;
  reply?: string;
  conversationId?: number;
  profileUpdated?: boolean;
  error?: string;
};

const GREETING: AgentMessage = {
  id: "greeting",
  role: "agent",
  content:
    "Hi! I'm your TechPath AI Agent. I can help you update your profile, find learning materials, or answer questions about skills and career paths. How can I assist you today?",
  timestamp: new Date(),
};

function toAgentMessages(
  conversationId: number,
  chatContext: ConversationApiItem["chatContext"],
  fallbackTimestamp: string,
): AgentMessage[] {
  return chatContext.map((entry, index) => ({
    id: `${conversationId}-${index}`,
    role: entry.role === "assistant" ? "agent" : "user",
    content: entry.content,
    timestamp: new Date(entry.timestamp ?? fallbackTimestamp),
  }));
}

function toSummary(item: ConversationApiItem): AgentConversationSummary {
  const messages = toAgentMessages(item.conversationId, item.chatContext, item.updatedAt);
  const last = messages[messages.length - 1];

  return {
    id: String(item.conversationId),
    title: item.title ?? "New Conversation",
    lastMessage: last?.content ?? "",
    timestamp: new Date(item.updatedAt),
    messages: messages.length > 0 ? messages : [GREETING],
  };
}

export default function AgentContainer() {
  const profile = useWorkspaceProfile();
  const router = useRouter();

  const [conversations, setConversations] = useState<AgentConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>("new");
  const [messages, setMessages] = useState<AgentMessage[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const SEND_TIMEOUT_MS = 30000;

  useEffect(() => {
    const controller = new AbortController();

    async function loadConversations() {
      try {
        const response = await fetch(
          `/api/profiles/${profile.profileId}/conversations?n=20`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as ConversationsApiResponse;

        if (!response.ok || !body.success) {
          throw new Error(body.error ?? "Failed to load conversations.");
        }

        setConversations((body.data ?? []).map(toSummary));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Sidebar history is a nice-to-have; a load failure shouldn't block chatting.
      }
    }

    void loadConversations();
    return () => controller.abort();
  }, [profile.profileId]);

  const handleNewConversation = useCallback(() => {
    conversationIdRef.current = null;
    setCurrentConversationId("new");
    setMessages([GREETING]);
    setError(null);
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      const conversation = conversations.find((c) => c.id === id);
      if (!conversation) return;

      conversationIdRef.current = Number(id);
      setCurrentConversationId(id);
      setMessages(conversation.messages);
      setError(null);
    },
    [conversations],
  );

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const priorMessages = messages;
    const wasNewConversation = conversationIdRef.current === null;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const history = priorMessages
      .filter((m) => m.id !== "greeting")
      .map((m) => ({
        role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(
      () => controller.abort("timeout"),
      SEND_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`/api/profiles/${profile.profileId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          conversationId: conversationIdRef.current,
        }),
        signal: controller.signal,
      });

      const body = (await response.json()) as AgentApiResponse;

      if (!response.ok || !body.success || !body.reply) {
        throw new Error(body.error ?? "The agent couldn't respond.");
      }

      const resolvedConversationId = body.conversationId ?? conversationIdRef.current;
      conversationIdRef.current = resolvedConversationId;
      if (resolvedConversationId) {
        setCurrentConversationId(String(resolvedConversationId));
      }

      if (body.profileUpdated) {
        // The agent changed the profile via a tool call (target role, skills,
        // or location) — refresh server data so the sidebar/Landscape reflect it.
        router.refresh();
      }

      const agentMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: body.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMessage]);

      if (resolvedConversationId) {
        const existingTitle = conversations.find(
          (c) => c.id === String(resolvedConversationId),
        )?.title;

        const updatedSummary: AgentConversationSummary = {
          id: String(resolvedConversationId),
          title: wasNewConversation ? trimmed.slice(0, 60) : existingTitle ?? trimmed.slice(0, 60),
          lastMessage: agentMessage.content,
          timestamp: new Date(),
          messages: [...priorMessages.filter((m) => m.id !== "greeting"), userMessage, agentMessage],
        };

        setConversations((prev) => [
          updatedSummary,
          ...prev.filter((c) => c.id !== updatedSummary.id),
        ]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          controller.signal.reason === "timeout"
            ? "The agent took too long to respond. Please try again."
            : "Cancelled.",
        );
      } else {
        setError(err instanceof Error ? err.message : "The agent couldn't respond.");
      }
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsSending(false);
    }
  }, [conversations, inputValue, isSending, messages, profile.profileId, router]);

  const handleCancelSend = useCallback(() => {
    abortControllerRef.current?.abort("cancelled");
  }, []);

  return (
    <div className="p-6" style={{ height: "calc(100vh - 72px)" }}>
      <AgentChat
        conversations={conversations}
        currentConversationId={currentConversationId}
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onCancelSend={handleCancelSend}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isSending={isSending}
        errorMessage={error}
      />
    </div>
  );
}
