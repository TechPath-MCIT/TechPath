"use client";

import { useEffect, useMemo, useState } from "react";

import {
  UserProfile,
  type RoleOption,
  type SkillMatchItem,
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
  matchedSkillIds?: number[];
  error?: string;
};

type RoleSkillsApiResponse = {
  success: boolean;
  data?: {
    roleId: number | null;
    roleName: string | null;
    skills: SkillMatchItem[];
  };
  error?: string;
};

export default function LandscapeContainer({
  roles,
}: LandscapeContainerProps) {
  const profile = useWorkspaceProfile();

  const [matchScores, setMatchScores] = useState<
  Record<number, number>
  >({});
  const [matchedSkillIds, setMatchedSkillIds] = useState<number[]>([]);
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
        setMatchedSkillIds(body.matchedSkillIds ?? []);
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
  }, [profile.profileId]);

  const targetRole = profile.targetRole
    ? {
        current: profile.currentRole,
        target: profile.targetRole.name,
        matchScore: 0,
      }
    : undefined;

  // Overwrite each role's topSkills[].score with a real matched/not-matched
  // value once the match fetch has actually succeeded. Left untouched (i.e.
  // still the server-provided score: null, rendered as "—") while loading or
  // on error, so a slow/failed fetch never reads as "you have none of these
  // skills" instead of "we don't know yet".
  const enrichedRoles = useMemo(() => {
    if (matchesLoading || matchesError) return roles;

    const matchedSet = new Set(matchedSkillIds);

    return roles.map((role) => ({
      ...role,
      topSkills: role.topSkills.map((skill) => ({
        ...skill,
        score: matchedSet.has(skill.skillId) ? 100 : 0,
      })),
    }));
  }, [roles, matchesLoading, matchesError, matchedSkillIds]);

  async function loadSkillMatch(): Promise<SkillMatchItem[]> {
    const response = await fetch(
      `/api/profiles/${profile.profileId}/role/skills`,
      { cache: "no-store" },
    );

    const body = (await response.json()) as RoleSkillsApiResponse;

    if (!response.ok || !body.success) {
      throw new Error(body.error ?? "Failed to load skill match.");
    }

    return body.data?.skills ?? [];
  }

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
          onLoadSkillMatch={loadSkillMatch}
        />
      </div>

      <div className="col-span-9 min-h-0">
        <JobLandscapeNew
          roles={enrichedRoles}
          targetRoleId={profile.targetRole?.roleId ?? null}
          matchScores={matchScores}
          matchesLoading={matchesLoading}
          matchesError={matchesError}
        />
      </div>
    </div>
  );
}