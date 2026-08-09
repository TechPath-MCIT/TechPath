"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PARSED_RESUME_STORAGE_KEY } from "./parsedResumeStorage";
import { EditableResumeForm } from "@/components/resume/EditableResumeForm";
import {
  mergeProjects,
  normalizeParsedResume,
  toResumePayload,
  type EditableResume,
  type ProjectEntry,
} from "@/components/resume/editableResume";

function getApiError(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "Failed to save profile.";
}

export default function ResumeReviewContainer({
  existingProjects,
}: {
  existingProjects: ProjectEntry[];
}) {
  const router = useRouter();
  const [resume, setResume] = useState<EditableResume | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PARSED_RESUME_STORAGE_KEY);

    if (!raw) {
      setNotFound(true);
      return;
    }

    try {
      const parsed = normalizeParsedResume(JSON.parse(raw));
      parsed.projects = mergeProjects(existingProjects, parsed.projects);
      setResume(parsed);
    } catch {
      setNotFound(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm() {
    if (!resume) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toResumePayload(resume)),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiError(body));
      }

      sessionStorage.removeItem(PARSED_RESUME_STORAGE_KEY);
      router.push("/landscape");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartOver() {
    sessionStorage.removeItem(PARSED_RESUME_STORAGE_KEY);
    router.push("/resume-upload");
  }

  if (notFound) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6" style={{ backgroundColor: "#fafafa" }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-sm mb-4" style={{ color: "#55371e" }}>
            No parsed resume found. Please upload a resume first.
          </p>
          <button
            onClick={() => router.push("/resume-upload")}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "#02746f" }}
          >
            Go to upload
          </button>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6" style={{ backgroundColor: "#fafafa" }}>
        <p className="text-sm" style={{ color: "#55371e" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-6" style={{ backgroundColor: "#fafafa" }}>
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <button
            onClick={handleStartOver}
            className="flex items-center gap-1.5 text-xs mb-3 transition-colors hover:opacity-70"
            style={{ color: "#55371e" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Upload a different resume
          </button>
          <h1 className="text-2xl font-bold" style={{ color: "#15100c" }}>
            Review your resume
          </h1>
          <p className="text-sm mt-1" style={{ color: "#55371e" }}>
            We parsed the details below — check them over and fix anything that's wrong before saving.
          </p>
        </div>

        <EditableResumeForm value={resume} onChange={setResume} />

        {submitError && (
          <p className="text-sm mt-4" style={{ color: "#dc2626" }}>
            {submitError}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm text-white transition-all disabled:opacity-60"
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
              Confirm &amp; save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
