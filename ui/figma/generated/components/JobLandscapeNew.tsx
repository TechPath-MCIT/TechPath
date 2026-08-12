"use client";

import { useEffect, useState } from "react";
import InfoButton from "@/components/InformationButton"
import {
  Briefcase,
  DollarSign,
  Target,
  X,
} from "lucide-react";

export type LandscapeRole = {
  roleId: number;
  name: string;
  entrySalary: number | null;
  salaryOutlook: number | null;
  jobSatisfaction: number | null;

  topSkills: Array<{
    skillId: number;
    name: string;
    weight: number | null;
    score: number | null;
    comment: string | null;
  }>;

  mainResponsibilities: string[];
  positionInField: string | null;
  typicalJobTitles: string[];
};

type JobLandscapeNewProps = {
  roles: LandscapeRole[];
  profileId: number;
  targetRoleId: number | null;
  matchScores: Record<number, number>;
  matchesLoading: boolean;
  matchesError: string | null;
};

function formatSalary(value: number | null) {
  if (value === null) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSalaryRange(
  entrySalary: number | null,
  salaryOutlook: number | null,
) {
  if (entrySalary !== null && salaryOutlook !== null) {
    return `${formatSalary(entrySalary)} – ${formatSalary(
      salaryOutlook,
    )}`;
  }

  if (entrySalary !== null) {
    return `From ${formatSalary(entrySalary)}`;
  }

  if (salaryOutlook !== null) {
    return `Up to ${formatSalary(salaryOutlook)}`;
  }

  return "Not available";
}

function formatMetric(value: number | null) {
  return value === null ? "Not available" : value.toLocaleString();
}

export function JobLandscapeNew({
  roles,
  profileId,
  targetRoleId,
  matchScores,
  matchesLoading,
  matchesError,
}: JobLandscapeNewProps) {
  const [selectedRole, setSelectedRole] =
    useState<LandscapeRole | null>(null);
  const [ratedSkills, setRatedSkills] =
    useState<LandscapeRole["topSkills"] | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  useEffect(() => {
    if (!selectedRole) {
      setRatedSkills(null);
      return;
    }

    let cancelled = false;
    setRatedSkills(null);
    setRatingsLoading(true);

    fetch(`/api/profiles/${profileId}/role/${selectedRole.roleId}/skill-ratings`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.success) setRatedSkills(body.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRatingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRole, profileId]);

  const displayedSkills = ratedSkills ?? selectedRole?.topSkills ?? [];

  const selectedRoleScore = selectedRole
  ? matchScores[selectedRole.roleId]
  : undefined;

  const hasSelectedRoleScore =
    typeof selectedRoleScore === "number";

  return (
    <div className="relative flex h-full flex-col rounded-2xl bg-white shadow-md">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-xl font-semibold"
            style={{ color: "#15100c" }}
          >
            Landscape
          </h2>

          <span
            className="text-sm"
            style={{ color: "#55371e" }}
          >
            {roles.length} roles
            
          </span>
        </div>

        {matchesError && (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{
              color: "#b91c1c",
              backgroundColor: "#fef2f2",
            }}
          >
            {matchesError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {roles.map((role) => {
            const isTarget = role.roleId === targetRoleId;
            const score = matchScores[role.roleId];
            const hasScore = typeof score === "number";

            return (
              <button
                key={role.roleId}
                type="button"
                onClick={() => setSelectedRole(role)}
                className="rounded-lg border p-3 text-left transition-all hover:scale-105 hover:shadow-lg"
                style={{
                  borderColor: isTarget
                    ? "#02746f"
                    : "rgba(21, 16, 12, 0.15)",
                  backgroundColor: isTarget
                    ? "rgba(184, 226, 212, 0.18)"
                    : "#ffffff",
                }}
              >
                <div className="mb-2 flex items-start gap-2">
                  <Briefcase
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: "#02746f" }}
                  />

                  <span
                    className="line-clamp-2 text-xs font-semibold"
                    style={{ color: "#15100c" }}
                  >
                    {role.name}
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full"
                    style={{
                      backgroundColor: "rgba(184, 226, 212, 0.3)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: hasScore ? `${score}%` : "0%",
                        background:
                          !hasScore
                            ? "transparent"
                            : score >= 70
                              ? "linear-gradient(90deg, #02746f, #b8e2d4)"
                              : score >= 40
                                ? "linear-gradient(90deg, #fdd357, #b8e2d4)"
                                : "linear-gradient(90deg, #ef4444, #fdd357)",
                      }}
                    />
                  </div>

                  <span
                    className="w-8 text-right text-xs font-semibold"
                    style={{ color: "#02746f" }}
                  >
                    {matchesLoading
                      ? "..."
                      : hasScore
                        ? `${score}%`
                        : "—"}
                  </span>
                </div>

                {isTarget && (
                  <div
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: "#02746f" }}
                  >
                    <Target className="h-3 w-3" />
                    Current goal
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRole && (
        <>
          <button
            type="button"
            aria-label="Close role details"
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setSelectedRole(null)}
          />

          <aside className="fixed right-0 top-0 z-50 h-full w-[600px] overflow-y-auto bg-white shadow-2xl">
            <div className="p-6">
              <div
                className="mb-6 flex items-start justify-between border-b pb-4"
                style={{ borderColor: "rgba(21, 16, 12, 0.1)" }}
              >
                <div>
                  <h2
                    className="text-2xl font-semibold"
                    style={{ color: "#15100c" }}
                  >
                    {selectedRole.name}
                  </h2>

                  {selectedRole.roleId === targetRoleId && (
                    <div
                      className="mt-2 flex items-center gap-1 text-sm font-medium"
                      style={{ color: "#02746f" }}
                    >
                      <Target className="h-4 w-4" />
                      Current career goal
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="rounded-lg p-2 transition-colors hover:bg-stone-100"
                >
                  <X
                    className="h-5 w-5"
                    style={{ color: "#55371e" }}
                  />
                </button>
              </div>

              <div
                className="mb-6 rounded-lg p-4"
                style={{
                  backgroundColor: "rgba(184, 226, 212, 0.2)",
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#15100c" }}
                  >
                    Overall Match Score
                  </span>

                  <span
                    className="text-2xl font-bold"
                    style={{ color: "#02746f" }}
                  >
                    {matchesLoading
                      ? "..."
                      : hasSelectedRoleScore
                        ? `${selectedRoleScore}%`
                        : "—"}
                  </span>
                </div>

                <div
                  className="h-3 w-full overflow-hidden rounded-full"
                  style={{
                    backgroundColor: "rgba(184, 226, 212, 0.3)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: hasSelectedRoleScore
                        ? `${selectedRoleScore}%`
                        : "0%",
                      background:
                        "linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)",
                    }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3
                  className="mb-3 font-semibold"
                  style={{ color: "#15100c" }}
                >
                  Detailed Match Score
                </h3>

                <div className="space-y-3">
                  {displayedSkills.map((skill) => {
                    const importance = Math.round(
                      (skill.weight ?? 0) * 100,
                    );
                    const scorePercent =
                      !ratingsLoading && skill.score !== null
                        ? skill.score * 10
                        : 0;

                    return (
                      <div key={skill.skillId}>
                        <div className="mb-1 flex items-center justify-between">

                          <span
                            className="text-sm font-medium"
                            style={{ color: "#15100c" }}
                          >
                            {skill.name}
                          </span>

                          <span
                            className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: "#55371e" }}
                          >
                            {ratingsLoading ? (
                              <>
                                <svg
                                  className="h-3 w-3 animate-spin"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                  />
                                </svg>
                                Loading
                              </>
                            ) : skill.score === null ? (
                              "—"
                            ) : (
                              `${skill.score}/10`
                            )}
                          </span>
                        </div>

                        <div
                            className="h-2 w-full overflow-hidden rounded-full"
                          style={{
                            backgroundColor: "rgba(184, 226, 212, 0.3)",
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${scorePercent}%`,
                              background:
                                "linear-gradient(90deg, rgba(2,116,111,0.45), rgba(184,226,212,0.7))",
                            }}
                          />
                        </div>
                        <div class = "flex items-center justify-between">
                          <InfoButton
                              info = {skill.comment || ''}
                              hover = {true}
                          />
                          <div
                              className="mt-1 text-right text-[10px]"
                              style={{ color: "#8a7462" }}
                          >
                            Role importance: {importance}%
                          </div>
                        </div>


                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className="flex items-center gap-3 rounded-lg p-4"
                  style={{
                    backgroundColor: "rgba(253, 211, 87, 0.15)",
                  }}
                >
                  <DollarSign
                    className="h-5 w-5"
                    style={{ color: "#02746f" }}
                  />

                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: "#55371e" }}
                    >
                      Salary Range
                    </div>

                    <div
                      className="text-lg font-bold"
                      style={{ color: "#15100c" }}
                    >
                      {formatSalaryRange(
                        selectedRole.entrySalary,
                        selectedRole.salaryOutlook,
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: "#f4f1f2" }}
                >
                  <div
                    className="text-xs font-semibold"
                    style={{ color: "#55371e" }}
                  >
                    Job satisfaction
                  </div>
                  <div
                    className="mt-1 text-lg font-bold"
                    style={{ color: "#15100c" }}
                  >
                    {formatMetric(selectedRole.jobSatisfaction)}
                  </div>
                </div>
              </div>

              {selectedRole.mainResponsibilities.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Target
                      className="h-4 w-4"
                      style={{ color: "#02746f" }}
                    />
                    <h3
                      className="font-semibold"
                      style={{ color: "#15100c" }}
                    >
                      Main Responsibilities
                    </h3>
                  </div>

                  <ul className="space-y-2">
                    {selectedRole.mainResponsibilities.map(
                      (responsibility) => (
                        <li
                          key={responsibility}
                          className="flex gap-2 text-sm"
                          style={{ color: "#55371e" }}
                        >
                          <span style={{ color: "#02746f" }}>•</span>
                          <span>{responsibility}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {selectedRole.positionInField && (
                <div className="mt-6">
                  <h3
                    className="mb-3 font-semibold"
                    style={{ color: "#15100c" }}
                  >
                    Position in Field
                  </h3>

                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#55371e" }}
                  >
                    {selectedRole.positionInField}
                  </p>
                </div>
              )}

              {selectedRole.typicalJobTitles.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Briefcase
                      className="h-4 w-4"
                      style={{ color: "#02746f" }}
                    />
                    <h3
                      className="font-semibold"
                      style={{ color: "#15100c" }}
                    >
                      Typical Job Titles
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedRole.typicalJobTitles.map((title) => (
                      <span
                        key={title}
                        className="rounded-lg px-3 py-1.5 text-sm"
                        style={{
                          backgroundColor: "#f4f1f2",
                          color: "#15100c",
                        }}
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </aside>
        </>
      )}
    </div>
  );
}