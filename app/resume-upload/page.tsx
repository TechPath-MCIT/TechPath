import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ResumeUploadContainer from "./ResumeUploadContainer";

export default async function ResumeUploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <ResumeUploadContainer />;
}
