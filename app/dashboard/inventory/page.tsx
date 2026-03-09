"use client";
import styles from './inventory.module.css';
import { Edit2 } from 'lucide-react';

export default function InventoryPage() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Simulated data
  const calendarDays = Array.from({ length: 30 }, (_, i) => ({
    date: i + 1,
    available: Math.floor(Math.random() * 20),
    total: 20,
    price: 350 + Math.floor(Math.random() * 100),
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Inventory & Pricing</h1>
          <p>Real-time availability synced with Voice AI bookings.</p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select}>
            <option>All Room Types</option>
            <option>Deluxe Suite</option>
            <option>Standard Double</option>
            <option>Ocean View</option>
          </select>
          <input type="month" className={styles.dateInput} defaultValue="2026-10" />
        </div>
      </header>

      <div className={`glass-panel`} style={{ padding: '2rem' }}>
        <div className={styles.calendarGrid}>
          {days.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
          
          {calendarDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`${styles.dayCell} ${day.date === 15 ? styles.currentDay : ''}`}
            >
              <div className={styles.dateNumber}>{day.date}</div>
              <div className={styles.availability}>
                <span>Left:</span>
                <span className={styles.availableCount}>{day.available}/{day.total}</span>
              </div>
              <div className={styles.price}>
                <span>${day.price}</span>
                <Edit2 size={14} className={styles.editIcon} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
