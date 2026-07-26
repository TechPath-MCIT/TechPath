"use client";

import { useState } from "react";
import {
  Briefcase,
  DollarSign,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

export type LandscapeRole = {
  roleId: number;
  name: string;
  entrySalary: number | null;
  salaryOutlook: number | null;
  jobSatisfaction: number | null;
};

type JobLandscapeNewProps = {
  roles: LandscapeRole[];
  targetRoleId: number | null;
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

function formatMetric(value: number | null) {
  return value === null ? "Not available" : value.toLocaleString();
}

export function JobLandscapeNew({
  roles,
  targetRoleId,
}: JobLandscapeNewProps) {
  const [selectedRole, setSelectedRole] =
    useState<LandscapeRole | null>(null);

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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {roles.map((role) => {
            const isTarget = role.roleId === targetRoleId;

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
                      Entry salary
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: "#15100c" }}
                    >
                      {formatSalary(selectedRole.entrySalary)}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 rounded-lg p-4"
                  style={{
                    backgroundColor: "rgba(184, 226, 212, 0.2)",
                  }}
                >
                  <TrendingUp
                    className="h-5 w-5"
                    style={{ color: "#02746f" }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: "#55371e" }}
                    >
                      Salary outlook
                    </div>
                    <div
                      className="text-lg font-bold"
                      style={{ color: "#15100c" }}
                    >
                      {formatMetric(selectedRole.salaryOutlook)}
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
            </div>
          </aside>
        </>
      )}
    </div>
  );
}