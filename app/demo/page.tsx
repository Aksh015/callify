"use client";
import React, { useState } from 'react';
import styles from './demo.module.css';
import { Bot, User, Send, PhoneCall } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Welcome to Sunset Oasis Hotel. How can I assist you today? Are you looking to book a room, or do you have a question?' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputVal('');
    setLoading(true);

    // Simulate AI response based on context.txt flow
    setTimeout(() => {
      let aiResponse = "I can help with that. Let me check our availability.";
      
      if (userMsg.toLowerCase().includes('deluxe') || userMsg.toLowerCase().includes('weekend')) {
        aiResponse = "Yes, we have deluxe rooms available from Friday to Sunday. The total rate is $300. Would you like me to book one for you right now?";
      } else if (userMsg.toLowerCase().includes('book') || userMsg.toLowerCase().includes('yes')) {
        aiResponse = "Perfect. Your deluxe room is on hold. To complete this reservation, I am transferring you to our secure payment gateway. Please enter your 16-digit card number using your phone's keypad.";
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Voice Assistant Simulator</h1>
          <p>Test your hotel AI's conversation flow natively (Text mode simulation).</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </header>

      <div className={`glass-panel ${styles.chatWindow}`}>
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.messageRow} ${m.role === 'user' ? styles.user : ''}`}>
              <div className={`${styles.avatar} ${m.role === 'ai' ? styles.ai : ''}`}>
                {m.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className={styles.bubble}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className={`${styles.messageRow}`}>
              <div className={`${styles.avatar} ${styles.ai}`}>
                <Bot size={20} />
              </div>
              <div className={styles.bubble} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Agent is thinking...</span>
              </div>
            </div>
          )}
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="Type your request (e.g., 'Do you have a deluxe room available this weekend?')" 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className={`btn-primary ${styles.sendBtn}`} disabled={loading}>
            <Send size={20} style={{ marginLeft: '-2px' }}/>
          </button>
        </form>
      </div>
    </div>
  );
}
