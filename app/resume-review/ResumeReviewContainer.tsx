"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { PARSED_RESUME_STORAGE_KEY } from "./parsedResumeStorage";

type EducationEntry = {
  school: string;
  degree: string;
  dateRange: string;
  gpa: string;
};

type ExperienceEntry = {
  company: string;
  title: string;
  years: string;
  bullets: string[];
};

type EditableResume = {
  name: string;
  email: string;
  location: string;
  education: string;
  skills: string[];
  educationHistory: EducationEntry[];
  experiences: ExperienceEntry[];
  rawText: string;
};

function normalize(raw: unknown): EditableResume {
  const r = (raw ?? {}) as Record<string, unknown>;

  const educationHistory = Array.isArray(r.educationHistory)
    ? r.educationHistory.map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
          school: typeof e.school === "string" ? e.school : "",
          degree: typeof e.degree === "string" ? e.degree : "",
          dateRange: typeof e.dateRange === "string" ? e.dateRange : "",
          gpa: typeof e.gpa === "string" ? e.gpa : "",
        };
      })
    : [];

  const experiences = Array.isArray(r.experiences)
    ? r.experiences.map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
          company: typeof e.company === "string" ? e.company : "",
          title: typeof e.title === "string" ? e.title : "",
          years: typeof e.years === "number" ? String(e.years) : "",
          bullets: Array.isArray(e.bullets)
            ? e.bullets.filter((b): b is string => typeof b === "string")
            : [],
        };
      })
    : [];

  return {
    name: typeof r.name === "string" ? r.name : "",
    email: typeof r.email === "string" ? r.email : "",
    location: typeof r.location === "string" ? r.location : "",
    education: typeof r.education === "string" ? r.education : "",
    skills: Array.isArray(r.skills)
      ? r.skills.filter((s): s is string => typeof s === "string")
      : [],
    educationHistory,
    experiences,
    rawText: typeof r.rawText === "string" ? r.rawText : "",
  };
}

function toApiBody(resume: EditableResume) {
  return {
    name: resume.name,
    email: resume.email,
    location: resume.location,
    education: resume.education,
    skills: resume.skills.filter((s) => s.trim().length > 0),
    educationHistory: resume.educationHistory.map((entry) => ({
      school: entry.school,
      degree: entry.degree,
      dateRange: entry.dateRange,
      ...(entry.gpa.trim() ? { gpa: entry.gpa } : {}),
    })),
    experiences: resume.experiences.map((entry) => ({
      company: entry.company,
      title: entry.title,
      years: Number(entry.years) || 0,
      bullets: entry.bullets.filter((b) => b.trim().length > 0),
    })),
    rawText: resume.rawText,
  };
}

const inputStyle = {
  borderColor: "rgba(21,16,12,0.15)",
  color: "#15100c",
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border p-6"
      style={{ borderColor: "rgba(21,16,12,0.1)" }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "#15100c" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1" style={{ color: "#55371e" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm rounded-lg border px-3 py-2"
        style={inputStyle}
      />
    </label>
  );
}

export default function ResumeReviewContainer() {
  const router = useRouter();
  const [resume, setResume] = useState<EditableResume | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PARSED_RESUME_STORAGE_KEY);

    if (!raw) {
      setNotFound(true);
      return;
    }

    try {
      setResume(normalize(JSON.parse(raw)));
    } catch {
      setNotFound(true);
    }
  }, []);

  function update(patch: Partial<EditableResume>) {
    setResume((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function addSkill() {
    const trimmed = newSkill.trim();
    if (!trimmed || !resume) return;
    update({ skills: [...resume.skills, trimmed] });
    setNewSkill("");
  }

  function removeSkill(index: number) {
    if (!resume) return;
    update({ skills: resume.skills.filter((_, i) => i !== index) });
  }

  function updateEducationEntry(index: number, patch: Partial<EducationEntry>) {
    if (!resume) return;
    update({
      educationHistory: resume.educationHistory.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function addEducationEntry() {
    if (!resume) return;
    update({
      educationHistory: [
        ...resume.educationHistory,
        { school: "", degree: "", dateRange: "", gpa: "" },
      ],
    });
  }

  function removeEducationEntry(index: number) {
    if (!resume) return;
    update({ educationHistory: resume.educationHistory.filter((_, i) => i !== index) });
  }

  function updateExperienceEntry(index: number, patch: Partial<ExperienceEntry>) {
    if (!resume) return;
    update({
      experiences: resume.experiences.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function addExperienceEntry() {
    if (!resume) return;
    update({
      experiences: [
        ...resume.experiences,
        { company: "", title: "", years: "", bullets: [] },
      ],
    });
  }

  function removeExperienceEntry(index: number) {
    if (!resume) return;
    update({ experiences: resume.experiences.filter((_, i) => i !== index) });
  }

  function updateBullet(expIndex: number, bulletIndex: number, value: string) {
    if (!resume) return;
    const experiences = resume.experiences.map((entry, i) =>
      i === expIndex
        ? { ...entry, bullets: entry.bullets.map((b, bi) => (bi === bulletIndex ? value : b)) }
        : entry,
    );
    update({ experiences });
  }

  function addBullet(expIndex: number) {
    if (!resume) return;
    const experiences = resume.experiences.map((entry, i) =>
      i === expIndex ? { ...entry, bullets: [...entry.bullets, ""] } : entry,
    );
    update({ experiences });
  }

  function removeBullet(expIndex: number, bulletIndex: number) {
    if (!resume) return;
    const experiences = resume.experiences.map((entry, i) =>
      i === expIndex
        ? { ...entry, bullets: entry.bullets.filter((_, bi) => bi !== bulletIndex) }
        : entry,
    );
    update({ experiences });
  }

  async function handleConfirm() {
    if (!resume) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiBody(resume)),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Failed to save profile.";
        throw new Error(message);
      }

      sessionStorage.removeItem(PARSED_RESUME_STORAGE_KEY);
      router.push("/landscape");
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

        <div className="flex flex-col gap-4">
          <SectionCard title="Basic Info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Full name" value={resume.name} onChange={(v) => update({ name: v })} />
              <TextField label="Email" value={resume.email} onChange={(v) => update({ email: v })} />
              <TextField
                label="Location"
                value={resume.location}
                onChange={(v) => update({ location: v })}
                placeholder="City, State"
              />
              <TextField
                label="Highest degree"
                value={resume.education}
                onChange={(v) => update({ education: v })}
                placeholder="e.g. B.S. Computer Science"
              />
            </div>
          </SectionCard>

          <SectionCard title="Skills">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {resume.skills.map((skill, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: "rgba(2,116,111,0.08)", color: "#02746f" }}
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(i)}
                    className="hover:opacity-70"
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill…"
                className="flex-1 text-sm rounded-lg border px-3 py-2"
                style={inputStyle}
              />
              <button
                onClick={addSkill}
                className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
                style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Education History">
            <div className="flex flex-col gap-4">
              {resume.educationHistory.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "rgba(21,16,12,0.1)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold" style={{ color: "#8a7462" }}>
                      Entry {i + 1}
                    </span>
                    <button onClick={() => removeEducationEntry(i)} aria-label="Remove education entry">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      label="School"
                      value={entry.school}
                      onChange={(v) => updateEducationEntry(i, { school: v })}
                    />
                    <TextField
                      label="Degree"
                      value={entry.degree}
                      onChange={(v) => updateEducationEntry(i, { degree: v })}
                    />
                    <TextField
                      label="Date range"
                      value={entry.dateRange}
                      onChange={(v) => updateEducationEntry(i, { dateRange: v })}
                      placeholder="2019 - 2023"
                    />
                    <TextField
                      label="GPA (optional)"
                      value={entry.gpa}
                      onChange={(v) => updateEducationEntry(i, { gpa: v })}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addEducationEntry}
                className="self-start flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add education entry
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Experience">
            <div className="flex flex-col gap-4">
              {resume.experiences.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "rgba(21,16,12,0.1)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold" style={{ color: "#8a7462" }}>
                      Entry {i + 1}
                    </span>
                    <button onClick={() => removeExperienceEntry(i)} aria-label="Remove experience entry">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <TextField
                      label="Company"
                      value={entry.company}
                      onChange={(v) => updateExperienceEntry(i, { company: v })}
                    />
                    <TextField
                      label="Title"
                      value={entry.title}
                      onChange={(v) => updateExperienceEntry(i, { title: v })}
                    />
                    <TextField
                      label="Years"
                      value={entry.years}
                      onChange={(v) => updateExperienceEntry(i, { years: v.replace(/[^0-9.]/g, "") })}
                      placeholder="e.g. 2"
                    />
                  </div>

                  <span className="block text-xs font-medium mb-1.5" style={{ color: "#55371e" }}>
                    Bullets
                  </span>
                  <div className="flex flex-col gap-2 mb-2">
                    {entry.bullets.map((bullet, bi) => (
                      <div key={bi} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => updateBullet(i, bi, e.target.value)}
                          className="flex-1 text-sm rounded-lg border px-3 py-2"
                          style={inputStyle}
                        />
                        <button onClick={() => removeBullet(i, bi)} aria-label="Remove bullet">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addBullet(i)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                    style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
                  >
                    <Plus className="w-3 h-3" />
                    Add bullet
                  </button>
                </div>
              ))}
              <button
                onClick={addExperienceEntry}
                className="self-start flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add experience entry
              </button>
            </div>
          </SectionCard>
        </div>

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
