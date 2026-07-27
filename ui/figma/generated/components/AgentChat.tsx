import { useEffect, useRef, useState } from 'react';
import { Send, Mic, MicOff, Plus, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface AgentConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: AgentMessage[];
}

interface AgentChatProps {
  conversations: AgentConversationSummary[];
  currentConversationId: string;
  messages: AgentMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  isSending?: boolean;
  errorMessage?: string | null;
}

export function AgentChat({
  conversations,
  currentConversationId,
  messages,
  inputValue,
  onInputChange,
  onSend,
  onSelectConversation,
  onNewConversation,
  isSending = false,
  errorMessage = null,
}: AgentChatProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        onInputChange("How can I improve my Python skills?");
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
            onClick={onNewConversation}
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
                onClick={() => onSelectConversation(conversation.id)}
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
                  suppressHydrationWarning
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-2xl rounded-tl-sm px-3 py-2"
                style={{ background: '#f4f1f2', color: '#55371e' }}
              >
                <p className="text-sm">Thinking…</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
          {errorMessage && (
            <p className="text-xs mb-2" style={{ color: '#ef4444' }}>
              {errorMessage}
            </p>
          )}
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
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder={isRecording ? 'Listening...' : 'Ask me anything about your career...'}
              className="flex-1 px-4 py-3 rounded-xl border-2 transition-colors"
              style={{
                borderColor: isRecording ? '#ef4444' : 'rgba(21, 16, 12, 0.1)',
                outline: 'none',
              }}
              disabled={isRecording || isSending}
            />

            <button
              onClick={onSend}
              disabled={!inputValue.trim() || isRecording || isSending}
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
