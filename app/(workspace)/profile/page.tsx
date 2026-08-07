import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import * as users from "@/services/users";
import { getProfileById } from "@/services/profiles";
import { profileToEditableResume } from "@/components/resume/editableResume";
import ProfileEditContainer from "./ProfileEditContainer";

export default async function ProfileEditPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);

  if (!user?.profile_ID) {
    redirect("/resume-upload");
  }

  const profile = await getProfileById(user.profile_ID);

  if (!profile) {
    redirect("/resume-upload");
  }

  const initialResume = profileToEditableResume(profile, user.useremail ?? "");

  return <ProfileEditContainer profileId={profile.profile_ID} initialResume={initialResume} />;
}
