import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ResumeUploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="max-w-2xl w-full p-8 bg-white rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-4">Resume Upload</h1>
        <p className="text-zinc-600 mb-6">
          Upload your resume to get started with TechPath. This page is a placeholder
          for Phase 1 - Task 2.
        </p>
        <div className="p-8 border-2 border-dashed border-zinc-300 rounded-lg text-center">
          <p className="text-zinc-500">File upload component will go here</p>
        </div>
      </div>
    </div>
  );
}
