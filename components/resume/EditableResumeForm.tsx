"use client";

import { Plus, Trash2 } from "lucide-react";
import type { EducationEntry, ExperienceEntry, ProjectEntry, EditableResume } from "./editableResume";

const inputStyle = {
  borderColor: "rgba(21,16,12,0.15)",
  color: "#15100c",
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor: "rgba(21,16,12,0.1)" }}>
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

export function EditableResumeForm({
  value,
  onChange,
}: {
  value: EditableResume;
  onChange: (next: EditableResume) => void;
}) {
  function update(patch: Partial<EditableResume>) {
    onChange({ ...value, ...patch });
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    update({ skills: [...value.skills, trimmed] });
  }

  function removeSkill(index: number) {
    update({ skills: value.skills.filter((_, i) => i !== index) });
  }

  function updateEducationEntry(index: number, patch: Partial<EducationEntry>) {
    update({
      educationHistory: value.educationHistory.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    });
  }

  function addEducationEntry() {
    update({
      educationHistory: [...value.educationHistory, { school: "", degree: "", dateRange: "", gpa: "" }],
    });
  }

  function removeEducationEntry(index: number) {
    update({ educationHistory: value.educationHistory.filter((_, i) => i !== index) });
  }

  function updateProjectEntry(index: number, patch: Partial<ProjectEntry>) {
    update({
      projects: value.projects.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    });
  }

  function addProjectEntry() {
    update({
      projects: [...value.projects, { name: "", dateRange: "", bullets: [] }],
    });
  }

  function removeProjectEntry(index: number) {
    update({ projects: value.projects.filter((_, i) => i !== index) });
  }

  function updateProjectBullet(projIndex: number, bulletIndex: number, bulletValue: string) {
    update({
      projects: value.projects.map((entry, i) =>
        i === projIndex
          ? { ...entry, bullets: entry.bullets.map((b, bi) => (bi === bulletIndex ? bulletValue : b)) }
          : entry,
      ),
    });
  }

  function addProjectBullet(projIndex: number) {
    update({
      projects: value.projects.map((entry, i) =>
        i === projIndex ? { ...entry, bullets: [...entry.bullets, ""] } : entry,
      ),
    });
  }

  function removeProjectBullet(projIndex: number, bulletIndex: number) {
    update({
      projects: value.projects.map((entry, i) =>
        i === projIndex ? { ...entry, bullets: entry.bullets.filter((_, bi) => bi !== bulletIndex) } : entry,
      ),
    });
  }

  function updateExperienceEntry(index: number, patch: Partial<ExperienceEntry>) {
    update({
      experiences: value.experiences.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    });
  }

  function addExperienceEntry() {
    update({
      experiences: [...value.experiences, { company: "", title: "", years: "", bullets: [] }],
    });
  }

  function removeExperienceEntry(index: number) {
    update({ experiences: value.experiences.filter((_, i) => i !== index) });
  }

  function updateBullet(expIndex: number, bulletIndex: number, bulletValue: string) {
    update({
      experiences: value.experiences.map((entry, i) =>
        i === expIndex
          ? { ...entry, bullets: entry.bullets.map((b, bi) => (bi === bulletIndex ? bulletValue : b)) }
          : entry,
      ),
    });
  }

  function addBullet(expIndex: number) {
    update({
      experiences: value.experiences.map((entry, i) =>
        i === expIndex ? { ...entry, bullets: [...entry.bullets, ""] } : entry,
      ),
    });
  }

  function removeBullet(expIndex: number, bulletIndex: number) {
    update({
      experiences: value.experiences.map((entry, i) =>
        i === expIndex ? { ...entry, bullets: entry.bullets.filter((_, bi) => bi !== bulletIndex) } : entry,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Basic Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Full name" value={value.name} onChange={(v) => update({ name: v })} />
          <TextField label="Email" value={value.email} onChange={(v) => update({ email: v })} />
          <TextField
            label="Location"
            value={value.location}
            onChange={(v) => update({ location: v })}
            placeholder="City, State"
          />
          <TextField
            label="Highest degree"
            value={value.education}
            onChange={(v) => update({ education: v })}
            placeholder="e.g. B.S. Computer Science"
          />
        </div>
      </SectionCard>

      <SkillsEditor skills={value.skills} onAdd={addSkill} onRemove={removeSkill} />

      <SectionCard title="Education History">
        <div className="flex flex-col gap-4">
          {value.educationHistory.map((entry, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ borderColor: "rgba(21,16,12,0.1)" }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "#8a7462" }}>
                  Entry {i + 1}
                </span>
                <button onClick={() => removeEducationEntry(i)} aria-label="Remove education entry">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="School" value={entry.school} onChange={(v) => updateEducationEntry(i, { school: v })} />
                <TextField label="Degree" value={entry.degree} onChange={(v) => updateEducationEntry(i, { degree: v })} />
                <TextField
                  label="Date range"
                  value={entry.dateRange}
                  onChange={(v) => updateEducationEntry(i, { dateRange: v })}
                  placeholder="2019 - 2023"
                />
                <TextField label="GPA (optional)" value={entry.gpa} onChange={(v) => updateEducationEntry(i, { gpa: v })} />
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

      <SectionCard title="Projects">
        <div className="flex flex-col gap-4">
          {value.projects.map((entry, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ borderColor: "rgba(21,16,12,0.1)" }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "#8a7462" }}>
                  Entry {i + 1}
                </span>
                <button onClick={() => removeProjectEntry(i)} aria-label="Remove project entry">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <TextField label="Project name" value={entry.name} onChange={(v) => updateProjectEntry(i, { name: v })} />
                <TextField
                  label="Date range (optional)"
                  value={entry.dateRange}
                  onChange={(v) => updateProjectEntry(i, { dateRange: v })}
                  placeholder="e.g. Fall 2024"
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
                      onChange={(e) => updateProjectBullet(i, bi, e.target.value)}
                      className="flex-1 text-sm rounded-lg border px-3 py-2"
                      style={inputStyle}
                    />
                    <button onClick={() => removeProjectBullet(i, bi)} aria-label="Remove bullet">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addProjectBullet(i)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
              >
                <Plus className="w-3 h-3" />
                Add bullet
              </button>
            </div>
          ))}
          <button
            onClick={addProjectEntry}
            className="self-start flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add project entry
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Experience">
        <div className="flex flex-col gap-4">
          {value.experiences.map((entry, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ borderColor: "rgba(21,16,12,0.1)" }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "#8a7462" }}>
                  Entry {i + 1}
                </span>
                <button onClick={() => removeExperienceEntry(i)} aria-label="Remove experience entry">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <TextField label="Company" value={entry.company} onChange={(v) => updateExperienceEntry(i, { company: v })} />
                <TextField label="Title" value={entry.title} onChange={(v) => updateExperienceEntry(i, { title: v })} />
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
  );
}

function SkillsEditor({
  skills,
  onAdd,
  onRemove,
}: {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <SectionCard title="Skills">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {skills.map((skill, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(2,116,111,0.08)", color: "#02746f" }}
          >
            {skill}
            <button onClick={() => onRemove(i)} className="hover:opacity-70" aria-label={`Remove ${skill}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <SkillInput onAdd={onAdd} />
    </SectionCard>
  );
}

function SkillInput({ onAdd }: { onAdd: (skill: string) => void }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem("skill") as HTMLInputElement;
        onAdd(input.value);
        input.value = "";
      }}
    >
      <input
        name="skill"
        type="text"
        placeholder="Add a skill…"
        className="flex-1 text-sm rounded-lg border px-3 py-2"
        style={inputStyle}
      />
      <button
        type="submit"
        className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
        style={{ backgroundColor: "#f4f1f2", color: "#15100c" }}
      >
        <Plus className="w-3.5 h-3.5" />
        Add
      </button>
    </form>
  );
}
