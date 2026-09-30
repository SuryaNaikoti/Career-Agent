import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../../app/router/index.js';
import { ArrowLeft, MoreHorizontal, Bot, RotateCcw } from 'lucide-react';
import { AgentMessage } from '../../components/agent/AgentMessage.js';
import { AgentInput } from '../../components/agent/AgentInput.js';
import { DEMO_AGENT_CONVERSATIONS } from '../../../mock/demo-data/agent.js';
import { AgentConversationItem } from '../../types/agent.js';

export const AgentScreen: React.FC = () => {
  const { goBack, navigate } = useRouter();
  const [messages, setMessages] = useState<AgentConversationItem[]>(
    DEMO_AGENT_CONVERSATIONS.defaultFlow
  );
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    const userMsg: AgentConversationItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'user_query',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Controlled simulation response for foundation module
    setTimeout(() => {
      setIsTyping(false);
      const agentReply: AgentConversationItem = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        text: `Understood! In upcoming Module 10 (Career AI Assistant with Gemini orchestration), I will analyze your request ("${text}") and query verified jobs, tailor resumes, and manage hiring workflows.`,
      };
      setMessages((prev) => [...prev, agentReply]);
    }, 1200);
  };

  const handleResetConversation = () => {
    setMessages(DEMO_AGENT_CONVERSATIONS.defaultFlow.slice(0, 1));
  };

  const handleLoadFullScenario = () => {
    setMessages(DEMO_AGENT_CONVERSATIONS.defaultFlow);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 pt-safe">
        <div className="max-w-[430px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={goBack}
              aria-label="Back"
              className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Career Agent</h1>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Assistant</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetConversation}
              title="Reset to welcome"
              aria-label="Reset conversation"
              className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('Agent Settings: Autonomous actions, Confirmation rules, Gmail sync preferences.')}
              aria-label="Agent options"
              className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Demo Scenario Stepper Notice */}
        <div className="bg-blue-50/80 border-t border-b border-blue-100 px-4 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-blue-900 font-medium">
            Module 00: 10 Interactive Conversation States
          </span>
          <button
            onClick={handleLoadFullScenario}
            className="font-bold text-blue-700 hover:text-blue-900 underline"
          >
            Show full flow
          </button>
        </div>
      </header>

      {/* Conversation Messages Feed */}
      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 flex-1 space-y-2">
        {messages.map((msg) => (
          <AgentMessage
            key={msg.id}
            message={msg}
            onQuickAction={handleSendMessage}
            onPrepareAppForJob={(jobId) => {
              handleSendMessage(`Prepare an application for ${jobId}`);
            }}
            onSubmitApplication={() => {
              handleSendMessage('Continue and submit application');
            }}
          />
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 pl-8 py-2 text-xs font-semibold text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Career Agent is thinking...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Sticky Bottom Agent Command Bar (above bottom nav) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent p-3 pt-6">
        <div className="max-w-[430px] mx-auto">
          <AgentInput onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );
};
