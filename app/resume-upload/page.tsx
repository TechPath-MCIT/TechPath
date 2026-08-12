import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import * as users from "@/services/users";
import ResumeUploadContainer from "./ResumeUploadContainer";

export default async function ResumeUploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);
  const hasProfile = Boolean(user?.profile_ID);

  return <ResumeUploadContainer hasProfile={hasProfile} />;
}
