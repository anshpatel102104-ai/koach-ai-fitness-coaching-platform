import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/api/supabaseClient';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export default function AssistantChat({ initialPrompt, onPromptConsumed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // The ported claudeAssistant is a request/response Edge Function (there is no
  // realtime agent conversation), so the
  // transcript lives in React state and each turn invokes the function with the
  // prior history.
  const sendMessage = async (text) => {
    if (!text?.trim() || isLoading) return;
    setIsLoading(true);
    setInput('');
    const history = messages;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      const res = await db.functions.invoke('claudeAssistant', {
        userMessage: text,
        conversationHistory: history,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data?.response || '' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry — I hit a problem. Please try again.' }]);
    }
    setIsLoading(false);
  };

  // Handle initial prompt from quick actions
  useEffect(() => {
    if (initialPrompt && !isLoading) {
      sendMessage(initialPrompt);
      onPromptConsumed?.();
    }
  }, [initialPrompt]);

  const handleSend = () => sendMessage(input);
  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const visibleMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <p className="font-heading font-semibold">AI Coach Assistant</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Use quick actions above or ask anything about your clients — calorie adjustments, workout progressions, compliance issues, and more.
            </p>
          </div>
        ) : visibleMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about a client, request an analysis..."
            className="flex-1"
            disabled={isLoading }
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim() } size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-primary/20' : 'bg-primary/10'
      )}>
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-primary" />}
      </div>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'
      )}>
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:font-heading prose-headings:font-semibold"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="my-0">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
              code: ({ children }) => <code className="px-1 py-0.5 rounded bg-muted text-xs">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}