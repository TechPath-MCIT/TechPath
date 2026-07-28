import { useState } from 'react';
import { UserProfile } from '../components/UserProfile';
import { JobLandscapeNew } from '../components/JobLandscapeNew';
import {
  AgentChat,
  type AgentConversationSummary,
  type AgentMessage,
} from '../components/AgentChat';
import { GrindPage } from '../components/GrindPage';
import {
  calculateSkillMatch,
  jobTaxonomyData,
  userSkills,
} from "../data/jobData";
import { LogOut, Map, Bot, GraduationCap } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

type ViewMode = 'landscape' | 'agent' | 'grind';

interface DashboardUserData {
  name: string;
  email: string;
  role: string;
  location: string;
  skills: string[];
  yearsOfExperience: number;
  experience: string[];
  targetRole?: {
    current: string;
    target: string;
    matchScore: number;
  };
}

const AGENT_GREETING: AgentMessage = {
  id: 'greeting',
  role: 'agent',
  content:
    "Hi! I'm your TechPath AI Agent. I can help you update your profile, find learning materials, or answer questions about skills and career paths. How can I assist you today?",
  timestamp: new Date(),
};

function getPreviewAgentResponse(userInput: string): string {
  const input = userInput.toLowerCase();

  if (input.includes('python') || input.includes('learn')) {
    return "Great choice! For Python, I recommend starting with:\n\n1. Codecademy Python Course - Interactive and beginner-friendly\n2. Real Python - In-depth tutorials and projects\n3. Python Crash Course book by Eric Matthes\n\nWould you like me to add Python to your skills list?";
  } else if (input.includes('profile') || input.includes('update')) {
    return "I can help you update your profile! What would you like to change?\n\n- Add or remove skills\n- Update your target role\n- Change your location\n- Update years of experience\n\nJust let me know!";
  } else if (input.includes('machine learning') || input.includes('ml')) {
    return "Machine Learning is an exciting field! Based on your current skills, here are some steps to get started:\n\n1. Mathematics Foundation: Linear algebra, calculus, probability\n2. Programming: Python (NumPy, Pandas)\n3. ML Frameworks: Start with scikit-learn, then move to PyTorch/TensorFlow\n4. Projects: Build a simple classifier or regression model\n\nWould you like a personalized learning roadmap?";
  } else if (input.includes('salary') || input.includes('pay')) {
    return "Based on current market data:\n\nMachine Learning Engineer\n- Entry Level: $100K - $140K\n- Mid Level: $140K - $200K\n- Senior Level: $180K - $280K\n\nSalaries vary by location, company size, and specialization.";
  }

  return "I understand you're asking about career development. I can help you with:\n\n- Finding learning resources for specific skills\n- Understanding career paths and requirements\n- Updating your profile information\n- Getting salary insights\n- Creating a personalized learning plan\n\nWhat would you like to explore?";
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('landscape');

  // This preview page has no backend, so the Agent tab replies with
  // canned responses instead of calling a real LLM (see AgentContainer
  // for the wired-up version used by the actual app).
  const [agentConversations, setAgentConversations] = useState<AgentConversationSummary[]>([]);
  const [agentConversationId, setAgentConversationId] = useState('new');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([AGENT_GREETING]);
  const [agentInput, setAgentInput] = useState('');

  const handleAgentNewConversation = () => {
    setAgentConversationId('new');
    setAgentMessages([AGENT_GREETING]);
  };

  const handleAgentSelectConversation = (id: string) => {
    const conversation = agentConversations.find((c) => c.id === id);
    if (conversation) {
      setAgentConversationId(id);
      setAgentMessages(conversation.messages);
    }
  };

  const handleAgentSend = () => {
    const trimmed = agentInput.trim();
    if (!trimmed) return;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const nextMessages = [...agentMessages, userMessage];
    setAgentMessages(nextMessages);
    setAgentInput('');

    setTimeout(() => {
      const agentReply: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: getPreviewAgentResponse(trimmed),
        timestamp: new Date(),
      };

      const finalMessages = [...nextMessages, agentReply];
      setAgentMessages(finalMessages);

      const id = agentConversationId === 'new' ? Date.now().toString() : agentConversationId;
      setAgentConversationId(id);
      setAgentConversations((prev) => [
        {
          id,
          title: trimmed.slice(0, 60),
          lastMessage: agentReply.content,
          timestamp: new Date(),
          messages: finalMessages,
        },
        ...prev.filter((c) => c.id !== id),
      ]);
    }, 1000);
  };

  const previewRoles = jobTaxonomyData.map((job, index) => ({
    roleId: index,
    name: job.L4_job_role,
    entrySalary: null,
    salaryOutlook: null,
    jobSatisfaction: null,
    topSkills: [],
    mainResponsibilities: [],
    positionInField: null,
    typicalJobTitles: [],
  }));

  const previewMatchScores = Object.fromEntries(
    jobTaxonomyData.map((job, index) => [
      index,
      calculateSkillMatch(job.core_skills, userSkills),
    ]),
  );

  const userData: DashboardUserData = {
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
          <AgentChat
            conversations={agentConversations}
            currentConversationId={agentConversationId}
            messages={agentMessages}
            inputValue={agentInput}
            onInputChange={setAgentInput}
            onSend={handleAgentSend}
            onSelectConversation={handleAgentSelectConversation}
            onNewConversation={handleAgentNewConversation}
          />
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
        <GrindPage
          profileId={0}
          targetRole={userData.targetRole?.target ?? ""}
          resources={[]}
          isLoadingResources={false}
          resourcesError={null}
        />
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
            <JobLandscapeNew
              roles={previewRoles}
              targetRoleId={null}
              matchScores={previewMatchScores}
              matchesLoading={false}
              matchesError={null}
            />
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
