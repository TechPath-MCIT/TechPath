import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import * as users from "@/services/users";
import LandscapeContainer from "./LandscapeContainer";

export default async function LandscapePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);

  if (!user?.profile_ID) {
    redirect("/resume-upload");
  }

  return (
    <main className="min-h-screen">
      <LandscapeContainer />
    </main>
  );
}