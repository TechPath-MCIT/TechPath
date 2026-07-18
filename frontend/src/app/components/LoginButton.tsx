import { ReactNode } from 'react';

interface LoginButtonProps {
  icon: ReactNode;
  provider: string;
  recommended?: boolean;
  onClick: () => void;
}

export function LoginButton({ icon, provider, recommended, onClick }: LoginButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white rounded-xl border-2 transition-all duration-200 hover:border-[#26755f] hover:shadow-lg group"
      style={{ borderColor: 'rgba(32, 39, 35, 0.15)' }}
    >
      {recommended && (
        <div
          className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs"
          style={{
            backgroundColor: '#26755f',
            color: '#ffffff',
            fontWeight: 500
          }}
        >
          Recommended
        </div>
      )}

      <div style={{ color: '#202723' }} className="group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>

      <span style={{ fontWeight: 500, color: '#202723' }}>
        Continue with {provider}
      </span>
    </button>
  );
}
