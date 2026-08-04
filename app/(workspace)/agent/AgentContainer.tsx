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

    const agentMessageId = (Date.now() + 1).toString();
    let agentMessageStarted = false;
    let fullReply = "";
    let resolvedConversationId: number | null = null;
    let profileUpdated = false;

    // Reveals fullReply at a steady pace (independent of how bursty the
    // network chunks are), so the text always types out at the same speed.
    const REVEAL_CHARS_PER_TICK = 3;
    const REVEAL_INTERVAL_MS = 20;
    let revealedLength = 0;
    let revealTimer: ReturnType<typeof setInterval> | null = null;
    let networkDone = false;
    let onRevealDone: (() => void) | null = null;

    function maybeFinishReveal() {
      if (networkDone && revealedLength >= fullReply.length) {
        if (revealTimer) {
          clearInterval(revealTimer);
          revealTimer = null;
        }
        onRevealDone?.();
      }
    }

    function tickReveal() {
      if (revealedLength < fullReply.length) {
        revealedLength = Math.min(revealedLength + REVEAL_CHARS_PER_TICK, fullReply.length);
        const shown = fullReply.slice(0, revealedLength);
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMessageId ? { ...m, content: shown } : m)),
        );
      }
      maybeFinishReveal();
    }

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

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as AgentApiResponse | null;
        throw new Error(body?.error ?? "The agent couldn't respond.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: "delta"; text: string }
            | { type: "done"; conversationId: number; profileUpdated: boolean }
            | { type: "error"; error: string };

          if (event.type === "delta") {
            fullReply += event.text;

            if (!agentMessageStarted) {
              agentMessageStarted = true;
              setMessages((prev) => [
                ...prev,
                { id: agentMessageId, role: "agent", content: "", timestamp: new Date() },
              ]);
              revealTimer = setInterval(tickReveal, REVEAL_INTERVAL_MS);
            }
          } else if (event.type === "done") {
            resolvedConversationId = event.conversationId;
            profileUpdated = event.profileUpdated;
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }

      networkDone = true;

      // Let the reveal animation finish catching up to the full text before
      // moving on — still cancellable via the same AbortController.
      await new Promise<void>((resolve, reject) => {
        function onAbort() {
          if (revealTimer) clearInterval(revealTimer);
          controller.signal.removeEventListener("abort", onAbort);
          reject(new DOMException("Aborted", "AbortError"));
        }

        if (controller.signal.aborted) {
          onAbort();
          return;
        }

        controller.signal.addEventListener("abort", onAbort);
        onRevealDone = () => {
          controller.signal.removeEventListener("abort", onAbort);
          resolve();
        };
        maybeFinishReveal();
      });

      conversationIdRef.current = resolvedConversationId ?? conversationIdRef.current;
      if (resolvedConversationId) {
        setCurrentConversationId(String(resolvedConversationId));
      }

      if (profileUpdated) {
        // The agent changed the profile via a tool call (target role, skills,
        // or location) — refresh server data so the sidebar/Landscape reflect it.
        router.refresh();
      }

      if (resolvedConversationId) {
        const agentMessage: AgentMessage = {
          id: agentMessageId,
          role: "agent",
          content: fullReply,
          timestamp: new Date(),
        };

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
      if (revealTimer) {
        clearInterval(revealTimer);
        revealTimer = null;
      }
      if (agentMessageStarted) {
        // Partial text already streamed in — drop the incomplete bubble
        // rather than leaving a cut-off reply with no error context.
        setMessages((prev) => prev.filter((m) => m.id !== agentMessageId));
      }
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

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const response = await fetch(
        `/api/profiles/${profile.profileId}/conversations?conversationId=${id}`,
        { method: "DELETE" },
      );

      if (!response.ok) return;

      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (currentConversationId === id) {
        conversationIdRef.current = null;
        setCurrentConversationId("new");
        setMessages([GREETING]);
        setError(null);
      }
    },
    [currentConversationId, profile.profileId],
  );

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
        onDeleteConversation={handleDeleteConversation}
        isSending={isSending}
        errorMessage={error}
      />
    </div>
  );
}
