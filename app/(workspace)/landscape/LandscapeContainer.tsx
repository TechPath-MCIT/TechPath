"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

type MatchApiResponse = {
  success: boolean;
  data?: Array<{
    roleId: number;
    role: string | null;
    score: number;
  }>;
  error?: string;
};

export default function LandscapeContainer({
  roles,
}: LandscapeContainerProps) {
  const profile = useWorkspaceProfile();
  const router = useRouter();

  const [matchScores, setMatchScores] = useState<
  Record<number, number>
  >({});
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadMatchScores() {
      setMatchesLoading(true);
      setMatchesError(null);

      try {
        const response = await fetch(
          `/api/profiles/${profile.profileId}/match`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const body = (await response.json()) as MatchApiResponse;

        if (!response.ok || !body.success) {
          throw new Error(
            body.error ?? "Failed to calculate role matches.",
          );
        }

        const scores = Object.fromEntries(
          (body.data ?? []).map((match) => [
            match.roleId,
            match.score,
          ]),
        );

        setMatchScores(scores);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setMatchesError(
          error instanceof Error
            ? error.message
            : "Failed to calculate role matches.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setMatchesLoading(false);
        }
      }
    }

    void loadMatchScores();

    return () => {
      controller.abort();
    };
  }, [profile.profileId, profile.skills]);

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

    // Matches the original design: after picking/changing a target role,
    // jump straight into the Agent so the user can immediately dig into
    // skill gaps and next steps for it.
    router.push("/agent");
  }

  async function saveLocation(location: string): Promise<void> {
    const response = await fetch(
      `/api/profiles/${profile.profileId}/location`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location }),
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
          : "Failed to save location.";

      throw new Error(message);
    }

    profile.setLocation(location);
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
          onSetLocation={saveLocation}
          onEditProfile={() => router.push("/profile")}
          onUploadResume={() => router.push("/resume-upload")}
        />
      </div>

      <div className="col-span-9 min-h-0">
        <JobLandscapeNew
          roles={roles}
          profileId={profile.profileId}
          targetRoleId={profile.targetRole?.roleId ?? null}
          matchScores={matchScores}
          matchesLoading={matchesLoading}
          matchesError={matchesError}
        />
      </div>
    </div>
  );
}