"use client";
import styles from './analytics.module.css';

import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/analytics')
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setData(d);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const frequentQuestions = data?.frequentQuestions || [
    { label: 'Check-in Time', value: 0 },
    { label: 'Wifi PW', value: 0 },
    { label: 'Spa Booking', value: 0 },
    { label: 'Parking', value: 0 },
  ];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Voice AI Call Analytics</h1>
        <p>Deep insights into guest interactions and conversion trends.</p>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          Loading your call analytics...
        </div>
      ) : (
        <div className={styles.chartsGrid}>
          {/* Frequent Inquiries Bar Chart */}
          <div className={`glass-panel ${styles.chartCard}`}>
            <h2>Frequent Guest Inquiries (AI Context)</h2>
            <div className={styles.barChartContainer}>
              {frequentQuestions.map((q: any, i: number) => (
                <div className={styles.barGroup} key={i}>
                  <div className={styles.barTitle} style={{ color: "var(--accent-cyan)", fontWeight: "bold" }}>{q.value}%</div>
                  <div className={styles.bar} style={{ height: `${q.value}%` }}></div>
                  <div className={styles.barLabel}>{q.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Call Hours Heatmap */}
          <div className={`glass-panel ${styles.chartCard}`}>
            <h2>Peak Call Hours Heatmap</h2>
            <div className={styles.heatmapContainer}>
              {days.map(d => <div key={d} className={styles.heatmapDay}>{d}</div>)}
              {/* 7 columns, 4 rows representing time blocks (morning, afternoon, evening, night) */}
              {Array.from({ length: 28 }).map((_, i) => {
                const heatValue = data?.heatmap ? data.heatmap[i] : 0;
                const heatClass = heatValue > 0.8 ? styles.heatHigh : heatValue > 0.4 ? styles.heatMed : heatValue > 0 ? styles.heatLow : "";
                return <div key={i} className={`${styles.heatmapCell} ${heatClass}`}></div>
              })}
            </div>
            <p style={{ marginTop: '1rem', color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
              X-Axis: Days | Y-Axis: Time Blocks (Morning to Night)
            </p>
          </div>

          {/* Extra text insights */}
          <div className={`glass-panel ${styles.chartCard}`} style={{ gridColumn: "1 / -1", flexDirection: "row", gap: "2rem" }}>
            <div style={{ flex: 1 }}>
              <h2>AI Assistant Performance Summary</h2>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                Over the last 30 days, Callify successfully deflected <strong>{data?.stats?.deflectionRate || '0%'}</strong> of routine front desk inquiries without human intervention. The primary driver of call abandonment remains callers seeking highly specific localized recommendations outside of the uploaded knowledge base.
              </p>
            </div>
            <div className={styles.statsList} style={{ flex: 1 }}>
               <div className={styles.statRow}>
                 <span className={styles.statTitle}>Avg. Handle Time</span>
                 <span className={styles.statVal}>{data?.stats?.avgHandleTime || '0s'}</span>
               </div>
               <div className={styles.statRow}>
                 <span className={styles.statTitle}>Human Escalation Rate</span>
                 <span className={styles.statVal}>{data?.stats?.escalationRate || '0%'}</span>
               </div>
               <div className={styles.statRow}>
                 <span className={styles.statTitle}>IVR Payment Success</span>
                 <span className={styles.statVal}>{data?.stats?.paymentSuccess || '0%'}</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
