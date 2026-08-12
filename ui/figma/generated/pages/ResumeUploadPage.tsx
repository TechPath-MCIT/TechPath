import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';

interface ResumeUploadPageProps {
  onSubmit: (file: File) => Promise<void>;
  onBack: () => void;
}

export function ResumeUploadPage({ onSubmit, onBack }: ResumeUploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type === "application/pdf") {
      setUploadError(null);
      setFile(f);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleContinue = async () => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      await onSubmit(file);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload resume.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-6 relative">
      <AnimatedBackground />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-5xl font-bold"
            style={{
              fontFamily: '"Open Sans", sans-serif',
              background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TechPath
          </h1>
          <p className="text-sm font-medium mt-3 flex items-center justify-center gap-1.5" style={{ color: '#55371e' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#02746f' }} />
            Drop your resume — let AI map your next move
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onClick={() => !file && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className="relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
          style={{
            borderColor: isDragging ? '#02746f' : file ? '#02746f' : 'rgba(21,16,12,0.15)',
            backgroundColor: isDragging
              ? 'rgba(2,116,111,0.04)'
              : file
              ? 'rgba(2,116,111,0.03)'
              : 'rgba(21,16,12,0.02)',
            padding: '28px 20px',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {file ? (
            <div className="flex items-center gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(2,116,111,0.1)' }}
              >
                <FileText className="w-5 h-5" style={{ color: '#02746f' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#15100c' }}>
                  {file.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#55371e' }}>
                  {(file.size / 1024).toFixed(0)} KB · PDF
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setUploadError(null);

                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                }}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
              >
                <X className="w-4 h-4" style={{ color: '#55371e' }} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: isDragging
                    ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)'
                    : 'rgba(2,116,111,0.08)',
                }}
              >
                <Upload
                  className="w-5 h-5 transition-colors"
                  style={{ color: isDragging ? '#fff' : '#02746f' }}
                />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#15100c' }}>
                  {isDragging ? 'Release to upload' : 'Drag & drop your résumé'}
                </p>
                <p className="text-xs mt-1" style={{ color: '#55371e' }}>
                  or <span style={{ color: '#02746f', fontWeight: 600 }}>browse files</span> · PDF only
                </p>
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <p className="text-sm mt-3" style={{ color: "#dc2626" }}>
            {uploadError}
          </p>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!file || uploading}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all duration-200"
          style={{
            background:
              file && !uploading
                ? 'linear-gradient(135deg, #02746f 0%, #04a89f 100%)'
                : 'rgba(21,16,12,0.08)',
            color: file && !uploading ? '#fff' : 'rgba(21,16,12,0.35)',
            cursor: file && !uploading ? 'pointer' : 'not-allowed',
            boxShadow: file && !uploading ? '0 4px 14px rgba(2,116,111,0.35)' : 'none',
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

        {/* Back */}
        <div className="mt-6 pt-5 border-t flex items-center" style={{ borderColor: 'rgba(21,16,12,0.08)' }}>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-70"
            style={{ color: '#55371e' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
