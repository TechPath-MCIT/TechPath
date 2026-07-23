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
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ backgroundColor: "#fafafa" }}>
      <div className="absolute top-6 right-6">
        <SignOutButton />
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <ResumeUploadForm />
      </div>
    </div>
  );
}
