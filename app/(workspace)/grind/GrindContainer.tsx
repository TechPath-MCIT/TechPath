"use client";

import { GrindPage } from "@/ui/figma/generated/components/GrindPage";
import { userSkills } from "@/ui/figma/generated/data/jobData";

export default function GrindContainer() {
  return (
    <div
      className="p-6"
      style={{ height: "calc(100vh - 72px)" }}
    >
      <GrindPage
        targetRole=""
        userSkills={userSkills}
      />
    </div>
  );
}