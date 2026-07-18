import { useState, useRef } from 'react';
import { Send, Mic, MicOff, Plus, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

interface AgentChatProps {}

export function AgentChat({}: AgentChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: 'Career Path Discussion',
      lastMessage: 'Your current match for ML Engineer role is 68%...',
      timestamp: new Date(Date.now() - 86400000),
      messages: [
        {
          id: '1-1',
          role: 'agent',
          content: "Hi! I'm your TechPath AI Agent. How can I help you today?",
          timestamp: new Date(Date.now() - 86400000)
        },
        {
          id: '1-2',
          role: 'user',
          content: "Tell me about becoming an ML engineer",
          timestamp: new Date(Date.now() - 86400000)
        },
        {
          id: '1-3',
          role: 'agent',
          content: "Your current match for ML Engineer role is 68%. Let me create a learning plan for you!",
          timestamp: new Date(Date.now() - 86400000)
        }
      ]
    },
    {
      id: '2',
      title: 'Python Learning Resources',
      lastMessage: 'I recommend starting with Codecademy...',
      timestamp: new Date(Date.now() - 172800000),
      messages: [
        {
          id: '2-1',
          role: 'user',
          content: "How can I improve my Python skills?",
          timestamp: new Date(Date.now() - 172800000)
        },
        {
          id: '2-2',
          role: 'agent',
          content: "I recommend starting with Codecademy Python Course for interactive learning!",
          timestamp: new Date(Date.now() - 172800000)
        }
      ]
    }
  ]);

  const [currentConversationId, setCurrentConversationId] = useState<string>('new');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: "Hi! I'm your TechPath AI Agent. I can help you update your profile, find learning materials, or answer questions about skills and career paths. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewConversation = () => {
    setCurrentConversationId('new');
    setMessages([
      {
        id: Date.now().toString(),
        role: 'agent',
        content: "Hi! I'm your TechPath AI Agent. I can help you update your profile, find learning materials, or answer questions about skills and career paths. How can I assist you today?",
        timestamp: new Date()
      }
    ]);
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInputValue('');

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: getAgentResponse(inputValue),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentResponse]);
      setTimeout(scrollToBottom, 100);
    }, 1000);
  };

  const getAgentResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('python') || input.includes('learn')) {
      return "Great choice! For Python, I recommend starting with:\n\n1. **Codecademy Python Course** - Interactive and beginner-friendly\n2. **Real Python** - In-depth tutorials and projects\n3. **Python Crash Course book** by Eric Matthes\n\nWould you like me to add Python to your skills list?";
    } else if (input.includes('profile') || input.includes('update')) {
      return "I can help you update your profile! What would you like to change?\n\n- Add or remove skills\n- Update your target role\n- Change your location\n- Update years of experience\n\nJust let me know!";
    } else if (input.includes('machine learning') || input.includes('ml')) {
      return "Machine Learning is an exciting field! Based on your current skills, here are some steps to get started:\n\n1. **Mathematics Foundation**: Linear algebra, calculus, probability\n2. **Programming**: Python (NumPy, Pandas)\n3. **ML Frameworks**: Start with scikit-learn, then move to PyTorch/TensorFlow\n4. **Projects**: Build a simple classifier or regression model\n\nYour current match for ML Engineer role is 68%. Would you like a personalized learning roadmap?";
    } else if (input.includes('salary') || input.includes('pay')) {
      return "Based on current market data:\n\n**Machine Learning Engineer**\n- Entry Level: $100K - $140K\n- Mid Level: $140K - $200K\n- Senior Level: $180K - $280K\n\nSalaries vary by location, company size, and specialization. San Francisco and NYC tend to offer higher compensation.";
    } else {
      return "I understand you're asking about career development. I can help you with:\n\n✓ Finding learning resources for specific skills\n✓ Understanding career paths and requirements\n✓ Updating your profile information\n✓ Getting salary insights\n✓ Creating a personalized learning plan\n\nWhat would you like to explore?";
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setInputValue("How can I improve my Python skills?");
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="h-full bg-white rounded-2xl shadow-md flex">
      {/* Left Sidebar - History */}
      <div
        className={`border-r flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}
        style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
          <h3 className="text-xs font-semibold" style={{ color: '#55371e' }}>
            CONVERSATIONS
          </h3>
          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" style={{ color: '#02746f' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold mb-3 px-2" style={{ color: '#55371e' }}>
            RECENT
          </h3>
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className="w-full text-left p-3 rounded-lg transition-all hover:bg-stone-50"
                style={{
                  backgroundColor: currentConversationId === conversation.id ? 'rgba(38, 117, 95, 0.1)' : 'transparent',
                  borderLeft: currentConversationId === conversation.id ? '3px solid #02746f' : '3px solid transparent',
                }}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: '#55371e' }} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-1 truncate" style={{ color: '#15100c' }}>
                      {conversation.title}
                    </h4>
                    <p className="text-xs truncate" style={{ color: '#55371e' }}>
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#55371e' }}>
                      {conversation.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Current Conversation */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" style={{ color: '#55371e' }} />
              ) : (
                <ChevronLeft className="w-5 h-5" style={{ color: '#55371e' }} />
              )}
            </button>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: '#15100c' }}>
                AI Career Agent
              </h2>
              <p className="text-sm mt-1" style={{ color: '#55371e' }}>
                Your personal career development assistant
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  message.role === 'user'
                    ? 'rounded-tr-sm'
                    : 'rounded-tl-sm'
                }`}
                style={{
                  background: message.role === 'user' ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' : '#f4f1f2',
                  color: message.role === 'user' ? '#ffffff' : '#15100c',
                }}
              >
                <p className="text-sm whitespace-pre-line leading-snug">{message.content}</p>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#55371e',
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
          <div className="flex items-center gap-3">
            {/* Voice Input with Volume Indicator */}
            <div className="relative">
              <button
                onClick={toggleRecording}
                className={`p-3 rounded-full transition-all relative z-10 ${
                  isRecording ? 'animate-pulse' : ''
                }`}
                style={{
                  backgroundColor: isRecording ? '#ef4444' : '#f4f1f2',
                  color: isRecording ? '#ffffff' : '#55371e',
                }}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Volume Indicator Rings */}
              {isRecording && (
                <>
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{
                      backgroundColor: '#ef4444',
                      animationDuration: '1s',
                    }}
                  />
                  <div
                    className="absolute inset-[-8px] rounded-full animate-pulse opacity-50"
                    style={{
                      border: '2px solid #ef4444',
                      animationDuration: '1.5s',
                    }}
                  />
                  <div
                    className="absolute inset-[-16px] rounded-full animate-pulse opacity-30"
                    style={{
                      border: '2px solid #ef4444',
                      animationDuration: '2s',
                    }}
                  />
                </>
              )}
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isRecording ? 'Listening...' : 'Ask me anything about your career...'}
              className="flex-1 px-4 py-3 rounded-xl border-2 transition-colors"
              style={{
                borderColor: isRecording ? '#ef4444' : 'rgba(21, 16, 12, 0.1)',
                outline: 'none',
              }}
              disabled={isRecording}
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isRecording}
              className="p-3 rounded-full transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#02746f',
                color: '#ffffff',
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: '#55371e' }}>
            Try: "Help me learn Python" • "Update my profile" • "What's the salary for ML engineers?"
          </p>
        </div>
      </div>
    </div>
  );
}
