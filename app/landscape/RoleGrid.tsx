"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  roleId: number;
  role: string | null;
  entrySalary: number | null;
  salaryOutlook: number | null;
  jobSatisfaction: number | null;
};

export default function RoleGrid({
  roles,
  profileId,
  initialRoleId,
}: {
  roles: Role[];
  profileId: number;
  initialRoleId: number | null;
}) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(initialRoleId);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(roleId: number) {
    setSavingRoleId(roleId);
    setError(null);

    try {
      const res = await fetch(`/api/profiles/${profileId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to set dream role.");
      }

      setSelectedRoleId(roleId);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingRoleId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const isSelected = role.roleId === selectedRoleId;
          const isSaving = role.roleId === savingRoleId;

          return (
            <button
              key={role.roleId}
              onClick={() => handleSelect(role.roleId)}
              disabled={isSaving}
              className="text-left p-6 rounded-lg border transition-all disabled:opacity-60"
              style={{
                borderColor: isSelected ? "#02746f" : "rgba(21,16,12,0.15)",
                backgroundColor: isSelected ? "rgba(2,116,111,0.04)" : "#ffffff",
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg" style={{ color: "#15100c" }}>
                  {role.role ?? "Untitled role"}
                </h3>
                {isSelected && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: "#02746f", color: "#fff" }}
                  >
                    Dream role
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: "#55371e" }}>
                {role.entrySalary
                  ? `Entry salary: $${Math.round(role.entrySalary).toLocaleString()}`
                  : "Entry salary: N/A"}
              </p>
              {role.jobSatisfaction && (
                <p className="text-sm mt-1" style={{ color: "#55371e" }}>
                  Job satisfaction: {role.jobSatisfaction.toFixed(1)} / 10
                </p>
              )}
              {isSaving && (
                <p className="text-xs mt-2" style={{ color: "#02746f" }}>
                  Saving...
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
