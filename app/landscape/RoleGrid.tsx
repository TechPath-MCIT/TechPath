"use client";

import { Briefcase, CheckCircle2 } from "lucide-react";

type Role = {
  roleId: number;
  role: string | null;
  entrySalary: number | null;
  salaryOutlook: number | null;
  jobSatisfaction: number | null;
};

export default function RoleGrid({
  roles,
  selectedRoleId,
  onViewDetails,
}: {
  roles: Role[];
  selectedRoleId: number | null;
  onViewDetails: (roleId: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((role) => {
        const isSelected = role.roleId === selectedRoleId;

        return (
          <button
            key={role.roleId}
            onClick={() => onViewDetails(role.roleId)}
            className="text-left p-6 rounded-xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{
              borderColor: isSelected ? "#02746f" : "rgba(21,16,12,0.15)",
              backgroundColor: isSelected ? "rgba(2,116,111,0.04)" : "#ffffff",
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(2,116,111,0.08)" }}
                >
                  <Briefcase className="w-4 h-4" style={{ color: "#02746f" }} />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: "#15100c" }}>
                  {role.role ?? "Untitled role"}
                </h3>
              </div>
              {isSelected && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: "#02746f", color: "#fff" }}
                >
                  <CheckCircle2 className="w-3 h-3" />
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
          </button>
        );
      })}
    </div>
  );
}
