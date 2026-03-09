"use client";
import styles from './page.module.css';
import Link from 'next/link';
import { Bot } from 'lucide-react';

export default function NotFound() {
  return (
    <div className={styles.wrapper} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className={`glass-panel`} style={{ padding: '4rem', textAlign: 'center', maxWidth: '500px' }}>
        <Bot size={64} color="var(--accent-cyan)" style={{ marginBottom: '2rem' }} />
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Oops! The page you're looking for has checked out. This concierge can't find it.
        </p>
        <Link href="/" className="btn-primary">Return to Lobby</Link>
      </div>
    </div>
  );
}
