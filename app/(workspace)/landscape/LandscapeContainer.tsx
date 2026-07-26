"use client";

import {
  UserProfile,
  type RoleOption,
} from "@/ui/figma/generated/components/UserProfile";
import {
  JobLandscapeNew,
  type LandscapeRole,
} from "@/ui/figma/generated/components/JobLandscapeNew";
import { useWorkspaceProfile } from "@/components/workspace/WorkspaceProfileProvider";

type RolesApiResponse = {
  success: boolean;
  data?: Array<{
    roleId: number;
    role: string | null;
  }>;
  error?: string;
};

type LandscapeContainerProps = {
  roles: LandscapeRole[];
};

export default function LandscapeContainer({
  roles,
}: LandscapeContainerProps) {
  const profile = useWorkspaceProfile();

  const targetRole = profile.targetRole
    ? {
        current: profile.currentRole,
        target: profile.targetRole.name,
        matchScore: 0,
      }
    : undefined;

  async function loadRoles(): Promise<RoleOption[]> {
    const response = await fetch("/api/roles", {
      cache: "no-store",
    });

    const body = (await response.json()) as RolesApiResponse;

    if (!response.ok || !body.success) {
      throw new Error(body.error ?? "Failed to load roles.");
    }

    return (body.data ?? []).flatMap((role) =>
      role.role
        ? [
            {
              roleId: role.roleId,
              name: role.role,
            },
          ]
        : [],
    );
  }

  async function saveTargetRole(
    targetRole: RoleOption,
  ): Promise<void> {
    const response = await fetch(
      `/api/profiles/${profile.profileId}/role`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: targetRole.roleId,
        }),
      },
    );

    const body: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "Failed to save target role.";

      throw new Error(message);
    }

    profile.setTargetRole(targetRole);
  }

  return (
    <div
      className="grid grid-cols-12 gap-6 p-6"
      style={{ height: "calc(100vh - 72px)" }}
    >
      <div className="col-span-3 min-h-0">
        <UserProfile
          name={profile.name}
          email={profile.email}
          role={profile.currentRole}
          location={profile.location}
          skills={profile.skills}
          yearsOfExperience={profile.yearsOfExperience}
          experience={profile.experience}
          targetRole={targetRole}
          onLoadRoles={loadRoles}
          onSetTargetRole={saveTargetRole}
        />
      </div>

      <div className="col-span-9 min-h-0">
        <JobLandscapeNew
          roles={roles}
          targetRoleId={profile.targetRole?.roleId ?? null}
        />
      </div>
    </div>
  );
}