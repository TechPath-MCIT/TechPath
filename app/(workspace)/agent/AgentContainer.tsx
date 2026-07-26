"use client";

import { AgentChat } from "@/ui/figma/generated/components/AgentChat";

export default function AgentContainer() {
  return (
    <div
      className="p-6"
      style={{ height: "calc(100vh - 72px)" }}
    >
      <AgentChat />
    </div>
  );
}