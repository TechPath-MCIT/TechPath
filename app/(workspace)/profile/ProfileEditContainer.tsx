"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { EditableResumeForm } from "@/components/resume/EditableResumeForm";
import { toResumePayload, type EditableResume } from "@/components/resume/editableResume";

function getApiError(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "Failed to save profile.";
}

export default function ProfileEditContainer({
  profileId,
  initialResume,
}: {
  profileId: number;
  initialResume: EditableResume;
}) {
  const router = useRouter();
  const [resume, setResume] = useState<EditableResume>(initialResume);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toResumePayload(resume)),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiError(body));
      }

      router.push("/landscape");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh p-6" style={{ backgroundColor: "#fafafa" }}>
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <button
            onClick={() => router.push("/landscape")}
            className="flex items-center gap-1.5 text-xs mb-3 transition-colors hover:opacity-70"
            style={{ color: "#55371e" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to landscape
          </button>
          <h1 className="text-2xl font-bold" style={{ color: "#15100c" }}>
            Edit your profile
          </h1>
          <p className="text-sm mt-1" style={{ color: "#55371e" }}>
            Update anything that's changed or was parsed incorrectly.
          </p>
        </div>

        <EditableResumeForm value={resume} onChange={setResume} />

        {submitError && (
          <p className="text-sm mt-4" style={{ color: "#dc2626" }}>
            {submitError}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => router.push("/landscape")}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: "#02746f" }}
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
