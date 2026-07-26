"use client";

import { useState } from "react";
import RoleGrid from "./RoleGrid";
import ProfileSidebar from "./ProfileSidebar";
import RoleDetailDrawer from "./RoleDetailDrawer";

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

type Experience = {
  company: string;
  title: string;
  years: number;
  bullets: string[];
};

export default function LandscapeView({
  roles,
  skillsByRole,
  industriesByRole,
  profileId,
  initialRoleId,
  fullname,
  email,
  yearsOfExperience,
  location,
  skills,
  experiences,
}: {
  roles: Role[];
  skillsByRole: Record<number, RoleSkill[]>;
  industriesByRole: Record<number, RoleIndustry[]>;
  profileId: number;
  initialRoleId: number | null;
  fullname: string;
  email: string | null;
  yearsOfExperience: number | null;
  location: string | null;
  skills: string[];
  experiences: Experience[];
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(initialRoleId);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [viewingRoleId, setViewingRoleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectRole(roleId: number) {
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingRoleId(null);
    }
  }

  const viewingRole = roles.find((r) => r.roleId === viewingRoleId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <ProfileSidebar
          fullname={fullname}
          email={email}
          yearsOfExperience={yearsOfExperience}
          location={location}
          skills={skills}
          experiences={experiences}
          roles={roles}
          selectedRoleId={selectedRoleId}
          savingRoleId={savingRoleId}
          onSelectRole={handleSelectRole}
          error={error}
        />
      </div>
      <div className="lg:col-span-8">
        <RoleGrid roles={roles} selectedRoleId={selectedRoleId} onViewDetails={setViewingRoleId} />
      </div>

      {viewingRole && (
        <RoleDetailDrawer
          role={viewingRole}
          skills={skillsByRole[viewingRole.roleId] ?? []}
          industries={industriesByRole[viewingRole.roleId] ?? []}
          onClose={() => setViewingRoleId(null)}
        />
      )}
    </div>
  );
}
