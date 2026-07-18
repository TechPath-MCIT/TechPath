import { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { ResumeUploadPage } from './pages/ResumeUploadPage';
import { Dashboard } from './pages/Dashboard';

type AppStep = 'login' | 'resume' | 'dashboard';

export default function App() {
  const [step, setStep] = useState<AppStep>('login');

  return step === 'dashboard' ? (
    <Dashboard onLogout={() => setStep('login')} />
  ) : step === 'resume' ? (
    <ResumeUploadPage
      onContinue={() => setStep('dashboard')}
      onLogout={() => setStep('login')}
    />
  ) : (
    <LoginPage onLogin={() => setStep('resume')} />
  );
}