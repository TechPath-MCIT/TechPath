import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import * as users from "@/services/users";
import { getProfileById } from "@/services/profiles";
import { getRoleById } from "@/services/roles";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import {
  WorkspaceProfileProvider,
  type WorkspaceProfile,
} from "@/components/workspace/WorkspaceProfileProvider";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

type ResumeExperience = {
  title?: unknown;
  bullets?: unknown;
};

export default async function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);

  if (!user?.profile_ID) {
    redirect("/resume-upload");
  }

  const profile = await getProfileById(user.profile_ID);

  if (!profile) {
    redirect("/resume-upload");
  }

  const dreamRole = profile.roleId
    ? await getRoleById(profile.roleId)
    : null;

  const resumeExperiences = Array.isArray(profile.profexperience)
    ? (profile.profexperience as unknown as ResumeExperience[])
    : [];

  const currentRole =
    resumeExperiences.find(
      (experience) => typeof experience.title === "string",
    )?.title ?? "Not specified";

  const experienceHighlights = resumeExperiences
    .flatMap((experience) =>
      Array.isArray(experience.bullets)
        ? experience.bullets.filter(
            (bullet): bullet is string =>
              typeof bullet === "string",
          )
        : [],
    )
    .slice(0, 3);

  const workspaceProfile: WorkspaceProfile = {
    profileId: profile.profile_ID,
    name: profile.fullname,
    email: user.useremail ?? "",
    currentRole:
      typeof currentRole === "string"
        ? currentRole
        : "Not specified",
    location: profile.location ?? "Not specified",
    skills: profile.skills
      ? profile.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [],
    yearsOfExperience: profile.yearofexperience ?? 0,
    experience: experienceHighlights,
    targetRole: dreamRole?.role
      ? {
          roleId: dreamRole.roleId,
          name: dreamRole.role,
        }
      : null,
  };

  return (
    <WorkspaceProfileProvider profile={workspaceProfile}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProfileProvider>
  );
}