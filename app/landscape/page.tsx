import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import * as users from "@/services/users";
import { getProfileById } from "@/services/profiles";
import { getRolesList, getRoleSkills, getRoleIndustries } from "@/services/roles";
import LandscapeView from "./LandscapeView";
import SignOutButton from "@/components/SignOutButton";

type Experience = {
  company: string;
  title: string;
  years: number;
  bullets: string[];
};

export default async function LandscapePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);

  if (!user?.profile_ID) {
    redirect("/resume-upload");
  }

  const [roles, profile] = await Promise.all([
    getRolesList(20),
    getProfileById(user.profile_ID),
  ]);

  const skillsByRole = Object.fromEntries(
    await Promise.all(
      roles.map(async (role) => [role.roleId, (await getRoleSkills(role.roleId)).slice(0, 5)] as const),
    ),
  );

  const industriesByRole = Object.fromEntries(
    await Promise.all(
      roles.map(async (role) => [role.roleId, (await getRoleIndustries(role.roleId)).slice(0, 5)] as const),
    ),
  );

  const skills = profile?.skills ? profile.skills.split(", ").filter(Boolean) : [];
  const experiences = Array.isArray(profile?.profexperience)
    ? (profile.profexperience as unknown as Experience[])
    : [];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#fafafa" }}>
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#15100c" }}>
              Career Landscape
            </h1>
            <p style={{ color: "#55371e" }}>Pick the role you&apos;re aiming for.</p>
          </div>
          <SignOutButton />
        </div>
        <LandscapeView
          roles={roles}
          skillsByRole={skillsByRole}
          industriesByRole={industriesByRole}
          profileId={user.profile_ID}
          initialRoleId={profile?.roleId ?? null}
          fullname={profile?.fullname ?? "You"}
          email={user.useremail}
          yearsOfExperience={profile?.yearofexperience ?? null}
          skills={skills}
          experiences={experiences}
        />
      </div>
    </div>
  );
}
