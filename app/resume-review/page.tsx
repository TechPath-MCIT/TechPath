import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import * as users from "@/services/users";
import { getProfileById } from "@/services/profiles";
import { normalizeProjects } from "@/components/resume/editableResume";
import ResumeReviewContainer from "./ResumeReviewContainer";

export default async function ResumeReviewPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);
  const profile = user?.profile_ID ? await getProfileById(user.profile_ID) : null;
  const existingProjects = normalizeProjects(profile?.projects);

  return <ResumeReviewContainer existingProjects={existingProjects} />;
}
