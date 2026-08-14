"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  hasMore?: boolean;
  error?: string;
};

const CONVERSATIONS_PAGE_SIZE = 20;

type AgentApiResponse = {
  success: boolean;
  reply?: string;
  conversationId?: number;
  profileUpdated?: boolean;
  error?: string;
};

// Landscape redirects here right after a user sets/changes their target
// role (LandscapeContainer.tsx) so they can immediately act on it — this
// greeting (and the suggested prompts below) is what makes that redirect
// land somewhere useful instead of a generic, unrelated chat box.
function buildGreeting(targetRoleName: string | null): AgentMessage {
  return {
    id: "greeting",
    role: "agent",
    content: targetRoleName
      ? `Hi! I'm your TechPath AI Agent. Your target role is now **${targetRoleName}** — want to see your skill gaps or course recommendations for it?`
      : "Hi! I'm your TechPath AI Agent. I can help you update your profile, find learning materials, or answer questions about skills and career paths. How can I assist you today?",
    timestamp: new Date(),
  };
}

// The full pool a conversation can draw from — more than the 3 shown at once,
// so there's something left to surface as earlier ones get used. Whichever
// of these haven't been sent yet (as exact user-message text) in the current
// conversation are shown, recomputed after every reply rather than just once.
function buildSuggestedPrompts(targetRoleName: string | null): string[] {
  if (!targetRoleName) return [];
  return [
    `What skills do I need for ${targetRoleName}?`,
    `Recommend courses for ${targetRoleName}`,
    `Build me a career plan for ${targetRoleName}`,
    `How strong am I on the skills ${targetRoleName} needs?`,
    `What's hiring right now for ${targetRoleName}?`,
    `Tell me about the ${targetRoleName} role`,
    `What tools and technologies does ${targetRoleName} use?`,
  ];
}

const VISIBLE_SUGGESTED_PROMPTS = 3;

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
    messages: messages.length > 0 ? messages : [buildGreeting(null)],
  };
}

export default function AgentContainer() {
  const profile = useWorkspaceProfile();
  const router = useRouter();

  const targetRoleName = profile.targetRole?.name ?? null;
  const greeting = useMemo(() => buildGreeting(targetRoleName), [targetRoleName]);
  const suggestedPrompts = useMemo(() => buildSuggestedPrompts(targetRoleName), [targetRoleName]);

  const [conversations, setConversations] = useState<AgentConversationSummary[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string>("new");
  const [messages, setMessages] = useState<AgentMessage[]>([greeting]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedPrompts = useMemo(
    () => new Set(messages.filter((m) => m.role === "user").map((m) => m.content)),
    [messages],
  );
  const visibleSuggestedPrompts = useMemo(
    () => suggestedPrompts.filter((prompt) => !usedPrompts.has(prompt)).slice(0, VISIBLE_SUGGESTED_PROMPTS),
    [suggestedPrompts, usedPrompts],
  );

  const conversationIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAttemptRef = useRef<{
    trimmed: string;
    userMessage: AgentMessage;
    priorMessages: AgentMessage[];
    wasNewConversation: boolean;
    history: { role: "assistant" | "user"; content: string }[];
  } | null>(null);

  const SEND_TIMEOUT_MS = 30000;

  useEffect(() => {
    const controller = new AbortController();

    async function loadConversations() {
      try {
        const response = await fetch(
          `/api/profiles/${profile.profileId}/conversations?n=${CONVERSATIONS_PAGE_SIZE}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = (await response.json()) as ConversationsApiResponse;

        if (!response.ok || !body.success) {
          throw new Error(body.error ?? "Failed to load conversations.");
        }

        setConversations((body.data ?? []).map(toSummary));
        setHasMoreConversations(body.hasMore ?? false);
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
    setMessages([greeting]);
    setError(null);
  }, [greeting]);

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

  const handleLoadMoreConversations = useCallback(async () => {
    if (isLoadingMoreConversations) return;

    setIsLoadingMoreConversations(true);
    try {
      const response = await fetch(
        `/api/profiles/${profile.profileId}/conversations?n=${CONVERSATIONS_PAGE_SIZE}&skip=${conversations.length}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ConversationsApiResponse;

      if (!response.ok || !body.success) {
        return;
      }

      const nextPage = (body.data ?? []).map(toSummary);
      setConversations((prev) => [
        ...prev,
        ...nextPage.filter((c) => !prev.some((existing) => existing.id === c.id)),
      ]);
      setHasMoreConversations(body.hasMore ?? false);
    } finally {
      setIsLoadingMoreConversations(false);
    }
  }, [conversations.length, isLoadingMoreConversations, profile.profileId]);

  const performSend = useCallback(async (
    trimmed: string,
    userMessage: AgentMessage,
    priorMessages: AgentMessage[],
    wasNewConversation: boolean,
    history: { role: "assistant" | "user"; content: string }[],
  ) => {
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
  }, [conversations, profile.profileId, router]);

  const sendMessage = useCallback(async (trimmed: string) => {
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

    lastAttemptRef.current = { trimmed, userMessage, priorMessages, wasNewConversation, history };
    await performSend(trimmed, userMessage, priorMessages, wasNewConversation, history);
  }, [isSending, messages, performSend]);

  const handleSend = useCallback(async () => {
    await sendMessage(inputValue.trim());
  }, [inputValue, sendMessage]);

  const handleSuggestedPromptClick = useCallback(async (prompt: string) => {
    await sendMessage(prompt);
  }, [sendMessage]);

  const handleRetry = useCallback(async () => {
    if (!lastAttemptRef.current || isSending) return;
    const { trimmed, userMessage, priorMessages, wasNewConversation, history } = lastAttemptRef.current;
    await performSend(trimmed, userMessage, priorMessages, wasNewConversation, history);
  }, [isSending, performSend]);

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
        setMessages([greeting]);
        setError(null);
      }
    },
    [currentConversationId, profile.profileId, greeting],
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
        onRetry={handleRetry}
        hasMoreConversations={hasMoreConversations}
        isLoadingMoreConversations={isLoadingMoreConversations}
        onLoadMoreConversations={handleLoadMoreConversations}
        suggestedPrompts={visibleSuggestedPrompts}
        onSuggestedPromptClick={handleSuggestedPromptClick}
      />
    </div>
  );
}
