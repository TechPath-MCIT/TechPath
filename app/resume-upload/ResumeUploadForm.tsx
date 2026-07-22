"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function ResumeUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [result, setResult] = useState<unknown>(null);

  function handleFileChange(selected: File | null) {
    setResult(null);
    setStatus(null);

    if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setFileError("File is too large. Please upload a resume under 5MB.");
      return;
    }

    setFileError(null);
    setFile(selected);
  }

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
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {fileError && <p className="text-sm text-red-600">{fileError}</p>}
      {file && <p className="text-sm text-zinc-600">Selected: {file.name}</p>}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Resume"}
      </button>
      {!file && !fileError && (
        <p className="text-sm text-zinc-400">Choose a .pdf or .docx file above to enable upload.</p>
      )}
      {status !== null && (
        <pre className="whitespace-pre-wrap break-words rounded-md bg-zinc-100 p-4 text-xs">
          {`status: ${status}\n${JSON.stringify(result, null, 2)}`}
        </pre>
      )}
    </div>
  );
}
