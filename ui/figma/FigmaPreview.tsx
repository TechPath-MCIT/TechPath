"use client";

import { useState } from "react";
import { LoginPage } from "./generated/pages/LoginPage";
import { ResumeUploadPage } from "./generated/pages/ResumeUploadPage";
import { Dashboard } from "./generated/pages/Dashboard";

type PreviewStep = "login" | "resume" | "dashboard";

export default function FigmaPreview() {
  const [step, setStep] = useState<PreviewStep>("login");

  if (step === "dashboard") {
    return <Dashboard onLogout={() => setStep("login")} />;
  }

  if (step === "resume") {
    return (
      <ResumeUploadPage
        onContinue={() => setStep("dashboard")}
        onLogout={() => setStep("login")}
      />
    );
  }

  return <LoginPage onLogin={() => setStep("resume")} />;
}