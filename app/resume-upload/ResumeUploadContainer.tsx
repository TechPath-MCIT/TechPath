"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ResumeUploadPage } from "@/ui/figma/generated/pages/ResumeUploadPage";
import { PARSED_RESUME_STORAGE_KEY } from "@/app/resume-review/parsedResumeStorage";

function getApiError(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return "Failed to upload resume.";
}

export default function ResumeUploadContainer() {
  const router = useRouter();
  const { signOut } = useClerk();

  async function handleSubmit(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/resumes/parse", {
      method: "POST",
      body: formData,
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(getApiError(body));
    }

    const parsed =
      typeof body === "object" && body !== null && "data" in body
        ? (body as { data: unknown }).data
        : null;

    if (!parsed) {
      throw new Error("Failed to parse resume.");
    }

    sessionStorage.setItem(PARSED_RESUME_STORAGE_KEY, JSON.stringify(parsed));
    router.push("/resume-review");
  }

  return (
    <ResumeUploadPage
      onSubmit={handleSubmit}
      onLogout={() => {
        void signOut({ redirectUrl: "/sign-in" });
      }}
    />
  );
}
