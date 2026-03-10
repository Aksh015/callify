"use client";
import React, { useState, useRef, useEffect } from 'react';
import styles from './demo.module.css';
import { Bot, User, Send, BookOpen, ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react';
import Link from 'next/link';

type Message = {
  role: 'ai' | 'user';
  text: string;
};

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "👋 Welcome to Sunset Oasis Hotel! I'm your virtual receptionist. Ask me anything about our rooms, amenities, pricing, or policies. How can I help you today?" }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState('');
  const [contextLoading, setContextLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the demo context on mount
  useEffect(() => {
    fetch('/api/demo/context')
      .then(r => r.json())
      .then(data => {
        if (data.context) setContext(data.context);
      })
      .catch(err => console.error('Failed to load context:', err))
      .finally(() => setContextLoading(false));
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;

    const userMsg = inputVal.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputVal('');
    setLoading(true);

    try {
      // Build conversation history (exclude the initial welcome message)
      const history = messages.slice(1).map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        text: m.text,
      }));

      const res = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." 
      }]);
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setMessages([
      { role: 'ai', text: "👋 Welcome to Sunset Oasis Hotel! I'm your virtual receptionist. Ask me anything about our rooms, amenities, pricing, or policies. How can I help you today?" }
    ]);
    inputRef.current?.focus();
  };

  const quickQuestions = [
    "What rooms do you have?",
    "What's the price of a Deluxe room?",
    "What are the check-in timings?",
    "Tell me about the pool",
    "Do you allow pets?",
    "Any special packages available?",
  ];

  const handleQuickQuestion = (q: string) => {
    setInputVal(q);
    // Auto-submit
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    setInputVal('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    
    const history = messages.slice(1).map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      text: m.text,
    }));

    fetch('/api/demo/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q, history }),
    })
    .then(r => r.json())
    .then(data => {
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    })
    .catch(() => {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm sorry, something went wrong. Please try again." }]);
    })
    .finally(() => {
      setLoading(false);
      inputRef.current?.focus();
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.headerTitle}>
            <Sparkles size={28} className={styles.sparkleIcon} />
            <h1>AI Chat Demo</h1>
          </div>
          <p>Test your hotel AI assistant. It answers <strong>only</strong> from the business context below.</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleReset} className={styles.resetBtn} title="Reset conversation">
            <RotateCcw size={18} />
          </button>
          <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        </div>
      </header>

      {/* Context Panel — Expandable */}
      <div className={`glass-panel ${styles.contextPanel}`}>
        <button 
          className={styles.contextToggle}
          onClick={() => setShowContext(!showContext)}
        >
          <div className={styles.contextToggleLeft}>
            <BookOpen size={18} />
            <span>Business Context</span>
            <span className={styles.contextBadge}>
              {contextLoading ? 'Loading...' : `${context.length.toLocaleString()} chars`}
            </span>
          </div>
          {showContext ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showContext && (
          <div className={styles.contextContent}>
            <p className={styles.contextNote}>
              💡 This is the knowledge base the AI uses to answer questions. Business users can edit this from <strong>Dashboard → Settings → AI Knowledge Base</strong>.
            </p>
            <pre className={styles.contextText}>
              {contextLoading ? 'Loading context...' : context}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && !loading && (
        <div className={styles.quickQuestions}>
          <p className={styles.quickLabel}>Try asking:</p>
          <div className={styles.quickList}>
            {quickQuestions.map((q, i) => (
              <button 
                key={i} 
                className={styles.quickBtn}
                onClick={() => handleQuickQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className={`glass-panel ${styles.chatWindow}`}>
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.messageRow} ${m.role === 'user' ? styles.user : ''}`}>
              <div className={`${styles.avatar} ${m.role === 'ai' ? styles.ai : ''}`}>
                {m.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className={`${styles.bubble} ${m.role === 'ai' ? styles.aiBubble : styles.userBubble}`}>
                {m.text.split('\n').map((line, li) => (
                  <React.Fragment key={li}>
                    {line}
                    {li < m.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className={styles.messageRow}>
              <div className={`${styles.avatar} ${styles.ai}`}>
                <Bot size={20} />
              </div>
              <div className={`${styles.bubble} ${styles.aiBubble}`}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input 
            ref={inputRef}
            type="text" 
            className={styles.input} 
            placeholder="Ask about rooms, prices, amenities, policies..." 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className={`btn-primary ${styles.sendBtn}`} disabled={loading || !inputVal.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
