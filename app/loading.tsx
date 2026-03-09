"use client";
import styles from './dashboard/dashboard.module.css';

export default function Loading() {
  return (
    <div className={styles.layoutWrapper} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid var(--panel-border)', 
          borderTop: '5px solid var(--accent-cyan)', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1.5rem auto'
        }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Syncing with AI Concierge...</p>
      </div>
    </div>
  );
}
