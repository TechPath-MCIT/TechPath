import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ResumeReviewContainer from "./ResumeReviewContainer";

export default async function ResumeReviewPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <ResumeReviewContainer />;
}
