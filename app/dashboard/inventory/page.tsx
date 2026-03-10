"use client";
import styles from './inventory.module.css';
import { Edit2 } from 'lucide-react';

import { useEffect, useState } from 'react';

type RoomData = { type: string; basePrice: number; total: number; available: number };

export default function InventoryPage() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const [roomsData, setRoomsData] = useState<RoomData[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("All Room Types");

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    fetch('/api/dashboard/inventory')
      .then(res => res.json())
      .then(data => {
        if (data.roomTypes) {
          setRoomsData(data.roomTypes);
          if (data.roomTypes.length > 0) {
            setSelectedRoom(data.roomTypes[0].type);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Use the selected room data
  const currentRoom = roomsData.find(r => r.type === selectedRoom) || { basePrice: 0, total: 0, available: 0 };

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; 

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  
  // Empty slots for days before the 1st
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ empty: true, date: 0, available: 0, total: 0, price: 0 });
  }

  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      empty: false,
      date: i,
      available: currentRoom.available,
      total: currentRoom.total,
      price: currentRoom.basePrice,
    });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Inventory & Pricing</h1>
          <p>Real-time availability synced with Voice AI bookings.</p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
            {roomsData.map(room => (
                <option key={room.type} value={room.type}>{room.type}</option>
            ))}
          </select>
          <input type="month" className={styles.dateInput} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </div>
      </header>

      <div className={`glass-panel`} style={{ padding: '2rem' }}>
        <div className={styles.calendarGrid}>
          {days.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
          
          {calendarDays.map((day, idx) => (
            day.empty ? (
                <div key={idx} className={styles.dayCell} style={{ visibility: "hidden" }}></div>
            ) : (
                <div 
                  key={idx} 
                  className={`${styles.dayCell} ${day.date === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? styles.currentDay : ''}`}
                >
                  <div className={styles.dateNumber}>{day.date}</div>
                  <div className={styles.availability}>
                    <span>Left:</span>
                    <span className={styles.availableCount}>{day.available}/{day.total}</span>
                  </div>
                  <div className={styles.price}>
                    <span>₹{day.price}</span>
                    <Edit2 size={14} className={styles.editIcon} />
                  </div>
                </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
