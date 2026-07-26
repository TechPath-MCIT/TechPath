"use client";

import { UserProfile } from "@/ui/figma/generated/components/UserProfile";
import { JobLandscapeNew } from "@/ui/figma/generated/components/JobLandscapeNew";
import { userSkills } from "@/ui/figma/generated/data/jobData";

export default function LandscapeContainer() {
  const userData = {
    name: "Alex Chen",
    email: "alex.chen@example.com",
    role: "Backend Engineer",
    location: "San Francisco, CA",
    skills: userSkills,
    yearsOfExperience: 5,
    experience: [
      "Led development of ML pipeline processing 10M+ records daily",
      "Built React-based dashboard used by 50K+ users",
      "Reduced API response time by 60% through optimization",
    ],
  };

  return (
    <div
      className="grid grid-cols-12 gap-6 p-6"
      style={{ height: "calc(100vh - 72px)" }}
    >
      <div className="col-span-3 min-h-0">
        <UserProfile {...userData} />
      </div>

      <div className="col-span-9 min-h-0">
        <JobLandscapeNew />
      </div>
    </div>
  );
}