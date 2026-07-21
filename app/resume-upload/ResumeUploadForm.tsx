"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResumeUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setStatus(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        body: formData,
      });
      setStatus(res.status);

      if (res.status === 200 || res.status === 201) {
        router.push("/landscape");
        return;
      }

      setResult(await res.json());
    } catch (error: any) {
      console.error("Resume upload failed:", error);
      setStatus(0);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {file && <p className="text-sm text-zinc-600">Selected: {file.name}</p>}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Resume"}
      </button>
      {!file && <p className="text-sm text-zinc-400">Choose a .pdf or .docx file above to enable upload.</p>}
      {status !== null && (
        <pre className="whitespace-pre-wrap break-words rounded-md bg-zinc-100 p-4 text-xs">
          {`status: ${status}\n${JSON.stringify(result, null, 2)}`}
        </pre>
      )}
    </div>
  );
}
