"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ResumeUploadPage } from "@/ui/figma/generated/pages/ResumeUploadPage";

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

    const response = await fetch("/api/profiles", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      throw new Error(getApiError(body));
    }

    router.push("/landscape");
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
