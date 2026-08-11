"use client";

import { useEffect, useState } from "react";
import { GrindPage } from "@/ui/figma/generated/components/GrindPage";
import { useWorkspaceProfile } from "@/components/workspace/WorkspaceProfileProvider";

export interface ResourceApiItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  source: string | null;
  url: string | null;

  pricing: {
    type: string;
    amount: number | null;
    currency: string | null;
    note: string | null;
  };

  durationMinutes: number | null;
  durationText?: string | null;
  instructorText?: string | null;
  publicationStatus: string;
  isExternal?: boolean;

  skills: Array<{
    skillId: number;
    name: string | null;
    coverageWeight: number;
  }>;

  course: {
    courseId: string;
    units: number | null;
    prerequisites: unknown;
    creators: unknown;
  } | null;
}

interface ResourcesApiResponse {
  success: boolean;
  count?: number;
  data?: ResourceApiItem[];
  error?: string;
}

export default function GrindContainer() {
  const profile = useWorkspaceProfile();

  const [resources, setResources] = useState<ResourceApiItem[]>([]);
  const [isLoadingResources, setIsLoadingResources] =
    useState(true);
  const [resourcesError, setResourcesError] =
    useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadResources() {
      try {
        setIsLoadingResources(true);
        setResourcesError(null);

        const [mcitResponse, outsideResponse] = await Promise.all([
          fetch("/api/resources?type=course&source=MCIT&limit=100", {
            method: "GET",
            signal: controller.signal,
          }),
          fetch("/api/outside-courses?limit=150", {
            method: "GET",
            signal: controller.signal,
          }),
        ]);

        const mcitResult =
          (await mcitResponse.json()) as ResourcesApiResponse;

        if (!mcitResponse.ok || !mcitResult.success) {
          throw new Error(
            mcitResult.error ?? "Failed to load resources.",
          );
        }

        const outsideResult =
          (await outsideResponse.json()) as ResourcesApiResponse;

        if (!outsideResponse.ok || !outsideResult.success) {
          throw new Error(
            outsideResult.error ?? "Failed to load outside courses.",
          );
        }

        setResources([
          ...(mcitResult.data ?? []),
          ...(outsideResult.data ?? []),
        ]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResourcesError(
          error instanceof Error
            ? error.message
            : "Failed to load resources.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingResources(false);
        }
      }
    }

    void loadResources();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div
      className="p-6"
      style={{ height: "calc(100vh - 72px)" }}
    >
      <GrindPage
        profileId={profile.profileId}
        targetRole={profile.targetRole?.name ?? ""}
        skills={profile.skills}
        experience={profile.experience}
        projects={profile.projects}
        resources={resources}
        isLoadingResources={isLoadingResources}
        resourcesError={resourcesError}
      />
    </div>
  );
}