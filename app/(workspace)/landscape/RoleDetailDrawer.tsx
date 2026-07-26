"use client";

import { Building2, X } from "lucide-react";

type Role = {
  roleId: number;
  role: string | null;
  entrySalary: number | null;
  salaryOutlook: number | null;
  jobSatisfaction: number | null;
};

type RoleSkill = {
  skillId: number;
  name: string | null;
  weight: number | null;
};

type RoleIndustry = {
  industry: string | null;
  share: number | null;
};

export default function RoleDetailDrawer({
  role,
  skills,
  industries,
  onClose,
}: {
  role: Role;
  skills: RoleSkill[];
  industries: RoleIndustry[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6 pb-4 border-b" style={{ borderColor: "rgba(21,16,12,0.1)" }}>
            <h2 className="text-2xl font-semibold" style={{ color: "#15100c" }}>
              {role.role ?? "Untitled role"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
              <X className="w-5 h-5" style={{ color: "#55371e" }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(2,116,111,0.05)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#55371e" }}>
                Entry Salary
              </p>
              <p className="text-lg font-bold" style={{ color: "#15100c" }}>
                {role.entrySalary ? `$${Math.round(role.entrySalary).toLocaleString()}` : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(2,116,111,0.05)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#55371e" }}>
                Salary Outlook
              </p>
              <p className="text-lg font-bold" style={{ color: "#15100c" }}>
                {role.salaryOutlook ? `$${Math.round(role.salaryOutlook).toLocaleString()}` : "N/A"}
              </p>
            </div>
          </div>

          {role.jobSatisfaction && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: "rgba(184,226,212,0.2)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "#15100c" }}>
                  Job Satisfaction
                </span>
                <span className="text-2xl font-bold" style={{ color: "#02746f" }}>
                  {role.jobSatisfaction.toFixed(1)} / 10
                </span>
              </div>
            </div>
          )}

          {skills.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3" style={{ color: "#15100c" }}>
                Top Skills for This Role
              </h3>
              <div className="space-y-3">
                {skills.map((skill) => {
                  const pct = skill.weight ? Math.round(skill.weight * 100) : 0;
                  return (
                    <div key={skill.skillId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "#15100c" }}>
                          {skill.name ?? "Unknown skill"}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "#55371e" }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(2,116,111,0.1)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {industries.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" style={{ color: "#02746f" }} />
                <h3 className="font-semibold" style={{ color: "#15100c" }}>
                  Industries That Hire for This Role
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {industries.map((entry) => {
                  const pct = entry.share ? Math.round(entry.share * 100) : 0;
                  return (
                    <div key={entry.industry} className="flex items-center justify-between text-sm">
                      <span style={{ color: "#15100c" }}>{entry.industry ?? "Other"}</span>
                      <span className="font-semibold" style={{ color: "#55371e" }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
