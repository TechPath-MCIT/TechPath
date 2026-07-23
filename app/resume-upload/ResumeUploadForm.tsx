"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Sparkles, Upload, X } from "lucide-react";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

export default function ResumeUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFile(selected: File) {
    setUploadError(null);

    const extension = selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFile(null);
      setFileError("Only .pdf or .docx files are supported.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setFileError("File is too large. Please upload a resume under 5MB.");
      return;
    }

    setFileError(null);
    setFile(selected);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        body: formData,
      });

      if (res.status === 200 || res.status === 201) {
        router.push("/landscape");
        return;
      }

      const body = await res.json();
      setUploadError(body.error ?? "Failed to upload resume.");
    } catch (error: any) {
      setUploadError(error.message ?? "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1
          className="mb-2 text-4xl font-bold"
          style={{
            background: "linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          TechPath
        </h1>
        <p
          className="text-sm font-medium mt-3 flex items-center justify-center gap-1.5"
          style={{ color: "#55371e" }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "#02746f" }} />
          Drop your resume — let AI map your next move
        </p>
      </div>

      <div
        onClick={() => !file && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className="relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
        style={{
          borderColor: isDragging ? "#02746f" : file ? "#02746f" : "rgba(21,16,12,0.15)",
          backgroundColor: isDragging
            ? "rgba(2,116,111,0.04)"
            : file
            ? "rgba(2,116,111,0.03)"
            : "rgba(21,16,12,0.02)",
          padding: "28px 20px",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {file ? (
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(2,116,111,0.1)" }}
            >
              <FileText className="w-5 h-5" style={{ color: "#02746f" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "#15100c" }}>
                {file.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#55371e" }}>
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setFileError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
            >
              <X className="w-4 h-4" style={{ color: "#55371e" }} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: isDragging
                  ? "linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)"
                  : "rgba(2,116,111,0.08)",
              }}
            >
              <Upload
                className="w-5 h-5 transition-colors"
                style={{ color: isDragging ? "#fff" : "#02746f" }}
              />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "#15100c" }}>
                {isDragging ? "Release to upload" : "Drag & drop your résumé"}
              </p>
              <p className="text-xs mt-1" style={{ color: "#55371e" }}>
                or <span style={{ color: "#02746f", fontWeight: 600 }}>browse files</span> · PDF or DOCX
              </p>
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <p className="text-sm mt-3" style={{ color: "#dc2626" }}>
          {fileError}
        </p>
      )}
      {uploadError && (
        <p className="text-sm mt-3" style={{ color: "#dc2626" }}>
          {uploadError}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all duration-200"
        style={{
          background:
            file && !uploading
              ? "linear-gradient(135deg, #02746f 0%, #04a89f 100%)"
              : "rgba(21,16,12,0.08)",
          color: file && !uploading ? "#fff" : "rgba(21,16,12,0.35)",
          cursor: file && !uploading ? "pointer" : "not-allowed",
          boxShadow: file && !uploading ? "0 4px 14px rgba(2,116,111,0.35)" : "none",
        }}
      >
        {uploading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analyzing your profile…
          </>
        ) : (
          <>
            Launch my journey
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
