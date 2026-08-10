import { useEffect, useRef, useState } from 'react';
import { Send, Plus, MessageSquare, ChevronLeft, ChevronRight, Trash2, Square, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

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
  onCancelSend?: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  isSending?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function AgentChat({
  conversations,
  currentConversationId,
  messages,
  inputValue,
  onInputChange,
  onSend,
  onCancelSend,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isSending = false,
  errorMessage = null,
  onRetry,
}: AgentChatProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversationSearch.trim()
    ? conversations.filter((conversation) => {
        const query = conversationSearch.trim().toLowerCase();
        return (
          conversation.title.toLowerCase().includes(query) ||
          conversation.lastMessage.toLowerCase().includes(query)
        );
      })
    : conversations;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          <div className="relative mb-3">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: '#55371e' }}
            />
            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border outline-none"
              style={{ borderColor: 'rgba(21, 16, 12, 0.1)', color: '#15100c' }}
            />
            {conversationSearch && (
              <button
                onClick={() => setConversationSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                title="Clear search"
              >
                <X className="w-3 h-3" style={{ color: '#55371e' }} />
              </button>
            )}
          </div>
          <h3 className="text-xs font-semibold mb-3 px-2" style={{ color: '#55371e' }}>
            RECENT
          </h3>
          <div className="space-y-2">
            {filteredConversations.length === 0 && (
              <p className="text-xs px-2" style={{ color: '#55371e' }}>No conversations found.</p>
            )}
            {filteredConversations.map((conversation) => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className="w-full text-left p-3 pr-9 rounded-lg transition-all hover:bg-stone-50"
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
                {onDeleteConversation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(conversation.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-stone-200"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#55371e' }} />
                  </button>
                )}
                {confirmDeleteId === conversation.id && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-between gap-2 px-3 rounded-lg"
                    style={{ backgroundColor: '#fff', border: '1px solid rgba(2, 116, 111, 0.3)' }}
                  >
                    <span className="text-xs truncate" style={{ color: '#15100c' }}>
                      Delete this conversation?
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                          onDeleteConversation?.(conversation.id);
                        }}
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#02746f' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                {message.role === 'agent' ? (
                  <div className="text-sm leading-relaxed space-y-3 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:m-0 [&_ol]:pl-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_li]:m-0">
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-line leading-snug">{message.content}</p>
                )}
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
          {isSending && messages[messages.length - 1]?.role !== 'agent' && (
            <div className="flex justify-start">
              <div
                className="flex max-w-[80%] items-center gap-2 rounded-2xl rounded-tl-sm px-3 py-2"
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
            <p className="text-xs mb-2 flex items-center gap-2" style={{ color: '#ef4444' }}>
              <span>{errorMessage}</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  disabled={isSending}
                  className="text-xs font-medium underline underline-offset-2 hover:opacity-70 disabled:opacity-50"
                >
                  Retry
                </button>
              )}
            </p>
          )}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Ask me anything about your career..."
              className="flex-1 px-4 py-3 rounded-xl border-2 transition-colors"
              style={{
                borderColor: 'rgba(21, 16, 12, 0.1)',
                outline: 'none',
              }}
              disabled={isSending}
            />

            {isSending && onCancelSend ? (
              <button
                onClick={onCancelSend}
                title="Stop generating"
                className="p-3 rounded-full transition-all"
                style={{
                  backgroundColor: '#02746f',
                  color: '#ffffff',
                }}
              >
                <Square className="w-5 h-5" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!inputValue.trim() || isSending}
                className="p-3 rounded-full transition-all disabled:opacity-50"
                style={{
                  backgroundColor: '#02746f',
                  color: '#ffffff',
                }}
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: '#55371e' }}>
            Try: "Help me learn Python" • "I finished the Networked Systems course" • "What's the salary for ML engineers?"
          </p>
        </div>
      </div>
    </div>
  );
}
