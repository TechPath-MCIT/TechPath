import { Github } from 'lucide-react';
import { LoginButton } from '../components/LoginButton';
import { AnimatedBackground } from '../components/AnimatedBackground';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="size-full flex items-center justify-center p-6 relative">
      <AnimatedBackground />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-10 text-center">
          <h1
            className="mb-6 text-5xl font-bold"
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
          <p style={{ color: '#55371e' }}>Sign in to continue your journey</p>
        </div>

        <div className="space-y-4">
          <LoginButton
            icon={<Github className="w-5 h-5" />}
            provider="Github"
            recommended
            onClick={onLogin}
          />

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgba(21, 16, 12, 0.12)' }}></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white" style={{ color: '#55371e', fontSize: '0.875rem' }}>or</span>
            </div>
          </div>

          <LoginButton
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            }
            provider="Google"
            onClick={onLogin}
          />
        </div>

        <div className="mt-8 text-center" style={{ fontSize: '0.875rem', color: '#55371e' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
}
