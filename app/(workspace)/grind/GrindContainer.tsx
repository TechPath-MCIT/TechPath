"use client";

import { GrindPage } from "@/ui/figma/generated/components/GrindPage";
import { useWorkspaceProfile } from "@/components/workspace/WorkspaceProfileProvider";

export default function GrindContainer() {
  const profile = useWorkspaceProfile();

  return (
    <div
      className="p-6"
      style={{ height: "calc(100vh - 72px)" }}
    >
      <GrindPage
        targetRole={profile.targetRole?.name ?? ""}
        userSkills={profile.skills}
      />
    </div>
  );
}