import { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { JobLandscapeNew } from '../components/JobLandscapeNew';
import { AgentChat } from '../components/AgentChat';
import { GrindPage } from '../components/GrindPage';
import { userSkills } from '../data/jobData';
import { LogOut, Map, Bot, GraduationCap } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

type ViewMode = 'landscape' | 'agent' | 'grind';

export function Dashboard({ onLogout }: DashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('landscape');

  const userData = {
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    role: 'Backend Engineer',
    location: 'San Francisco, CA',
    skills: userSkills,
    yearsOfExperience: 5,
    experience: [
      'Led development of ML pipeline processing 10M+ records daily',
      'Built React-based dashboard used by 50K+ users',
      'Reduced API response time by 60% through optimization'
    ],
    targetRole: undefined
  };

  return (
    <div className="size-full bg-background">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
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

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 relative">
          {/* Sliding Background */}
          <div
            className="absolute rounded-lg transition-all duration-300 ease-out"
            style={{
              background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
              height: '100%',
              width: '118px',
              transform: viewMode === 'landscape' ? 'translateX(0)' : viewMode === 'agent' ? 'translateX(126px)' : 'translateX(252px)',
              zIndex: 0,
            }}
          />

          <button
            onClick={() => setViewMode('landscape')}
            className="w-[118px] flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-300 relative z-10"
            style={{ color: viewMode === 'landscape' ? '#ffffff' : '#55371e' }}
          >
            <Map className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Landscape</span>
          </button>
          <button
            onClick={() => setViewMode('agent')}
            className="w-[118px] flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-300 relative z-10"
            style={{ color: viewMode === 'agent' ? '#ffffff' : '#55371e' }}
          >
            <Bot className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Agent</span>
          </button>
          <button
            onClick={() => setViewMode('grind')}
            className="w-[118px] flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-300 relative z-10"
            style={{ color: viewMode === 'grind' ? '#ffffff' : '#55371e' }}
          >
            <GraduationCap className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">Grind</span>
          </button>

          <div className="w-px h-6 mx-2" style={{ backgroundColor: 'rgba(21, 16, 12, 0.1)' }} />

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ color: '#55371e' }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </header>

      {viewMode === 'agent' ? (
        // Agent Mode - Full Screen with padding
        <div
          className="p-6 animate-fadeIn"
          style={{
            height: 'calc(100vh - 72px)',
            animation: 'fadeIn 0.4s ease-out',
          }}
        >
          <AgentChat />
        </div>
      ) : viewMode === 'grind' ? (
        // Grind Mode - Full Screen with padding
        <div
          className="p-6 animate-fadeIn"
          style={{
            height: 'calc(100vh - 72px)',
            animation: 'fadeIn 0.4s ease-out',
          }}
        >
          <GrindPage targetRole={userData.targetRole?.target ?? ''} userSkills={userData.skills} />
        </div>
      ) : (
        // Landscape Mode - Grid Layout
        <div
          className="p-6 grid grid-cols-12 gap-6 animate-fadeIn"
          style={{
            height: 'calc(100vh - 72px)',
            animation: 'fadeIn 0.4s ease-out',
          }}
        >
          {/* User Profile */}
          <div className="col-span-3">
            <UserProfile {...userData} />
          </div>

          {/* Landscape View */}
          <div className="col-span-9">
            <JobLandscapeNew />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
