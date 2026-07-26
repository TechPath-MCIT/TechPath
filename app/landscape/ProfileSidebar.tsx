"use client";

import { useState } from "react";
import { Briefcase, Mail, MapPin, Target, User } from "lucide-react";

type Role = {
  roleId: number;
  role: string | null;
};

type Experience = {
  company: string;
  title: string;
  years: number;
  bullets: string[];
};

export default function ProfileSidebar({
  fullname,
  email,
  yearsOfExperience,
  location,
  skills,
  experiences,
  roles,
  selectedRoleId,
  savingRoleId,
  onSelectRole,
  error,
}: {
  fullname: string;
  email: string | null;
  yearsOfExperience: number | null;
  location: string | null;
  skills: string[];
  experiences: Experience[];
  roles: Role[];
  selectedRoleId: number | null;
  savingRoleId: number | null;
  onSelectRole: (roleId: number) => void;
  error: string | null;
}) {
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(selectedRoleId);

  const currentTitle = experiences[0]?.title ?? null;
  const highlights = experiences.flatMap((exp) => exp.bullets).slice(0, 3);
  const isSaving = savingRoleId !== null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor: "rgba(21,16,12,0.1)" }}>
      <div className="flex flex-col items-center text-center mb-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3"
          style={{ background: "linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)" }}
        >
          {fullname.charAt(0).toUpperCase()}
        </div>
        <h2 className="font-bold text-lg" style={{ color: "#15100c" }}>
          {fullname}
        </h2>
      </div>

      <div className="flex flex-col gap-2.5 mb-5">
        {email && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55371e" }}>
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#02746f" }} />
            {email}
          </div>
        )}
        {currentTitle && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55371e" }}>
            <User className="w-4 h-4 flex-shrink-0" style={{ color: "#02746f" }} />
            {currentTitle}
          </div>
        )}
        {yearsOfExperience !== null && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55371e" }}>
            <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: "#02746f" }} />
            {yearsOfExperience} years experience
          </div>
        )}
        {location && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55371e" }}>
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#02746f" }} />
            {location}
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#15100c" }}>
            Your Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: "rgba(2,116,111,0.08)", color: "#02746f" }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-xl border p-4 mb-5"
        style={{ borderColor: "#02746f", backgroundColor: "rgba(2,116,111,0.03)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4" style={{ color: "#02746f" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#15100c" }}>
            Career Goal
          </h3>
        </div>
        <select
          value={pendingRoleId ?? ""}
          onChange={(e) => setPendingRoleId(e.target.value ? Number(e.target.value) : null)}
          className="w-full text-sm rounded-lg border px-3 py-2 mb-3"
          style={{ borderColor: "rgba(21,16,12,0.15)", color: "#15100c" }}
        >
          <option value="">Select target role...</option>
          {roles.map((role) => (
            <option key={role.roleId} value={role.roleId}>
              {role.role ?? "Untitled role"}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs mb-2" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
        <button
          onClick={() => pendingRoleId !== null && onSelectRole(pendingRoleId)}
          disabled={pendingRoleId === null || isSaving}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: "#02746f" }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {highlights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#15100c" }}>
            Experience Highlights
          </h3>
          <ul className="flex flex-col gap-1.5">
            {highlights.map((bullet, i) => (
              <li key={i} className="text-xs flex gap-1.5" style={{ color: "#55371e" }}>
                <span style={{ color: "#02746f" }}>•</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
