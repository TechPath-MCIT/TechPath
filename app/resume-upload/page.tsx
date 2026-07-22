import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ResumeUploadForm from "./ResumeUploadForm";
import SignOutButton from "@/components/SignOutButton";

export default async function ResumeUploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="max-w-2xl w-full p-8 bg-white rounded-lg shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold">Resume Upload</h1>
          <SignOutButton />
        </div>
        <p className="text-zinc-600 mb-6">
          Upload your resume to get started with TechPath.
        </p>
        <ResumeUploadForm />
      </div>
    </div>
  );
}
