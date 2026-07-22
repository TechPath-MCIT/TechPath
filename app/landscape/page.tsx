import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import * as users from "@/services/users";
import { getProfileById } from "@/services/profiles";
import { getRolesList } from "@/services/roles";
import RoleGrid from "./RoleGrid";

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

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-4xl mx-auto w-full p-8 bg-white rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-4">Career Landscape</h1>
        <p className="text-zinc-600 mb-6">
          Pick the role you&apos;re aiming for.
        </p>
        <RoleGrid roles={roles} profileId={user.profile_ID} initialRoleId={profile?.roleId ?? null} />
      </div>
    </div>
  );
}
