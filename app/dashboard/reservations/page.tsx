"use client";
import styles from './reservations.module.css';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type ReservationRow = {
  id: string;
  name: string;
  phone: string;
  dates: string;
  room: string;
  amount: string;
  status: string;
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/reservations')
      .then(r => r.json())
      .then(data => {
        if (data.reservations) {
          setReservations(data.reservations);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>All Bookings</h1>
        <p>Manage reservations created by AI or front desk staff.</p>
      </header>

      <div className={styles.controls}>
        <input type="text" placeholder="Search by name, ID, or phone..." className={styles.searchInput} />
        <select className={styles.filterSelect}>
          <option>All Statuses</option>
          <option>Confirmed</option>
          <option>Pending</option>
          <option>Cancelled</option>
        </select>
        <button className="btn-primary">Export CSV</button>
      </div>

      <div className={`glass-panel`} style={{ padding: '2rem' }}>
        <table className={styles.reservationsTable}>
          <thead>
            <tr>
              <th>Res ID</th>
              <th>Guest Name</th>
              <th>Contact</th>
              <th>Dates</th>
              <th>Room Type</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  Loading reservations...
                </td>
              </tr>
            ) : reservations.length === 0 ? (
               <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No reservations found.
                </td>
              </tr>
            ) : (
              reservations.map((res, i) => (
                <tr key={i}>
                  <td style={{ color: "var(--accent-purple)", fontWeight: "600" }}>#{res.id}</td>
                  <td>{res.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{res.phone}</td>
                  <td>{res.dates}</td>
                  <td>{res.room}</td>
                  <td style={{ fontWeight: "700" }}>{res.amount}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${
                      res.status === 'Confirmed' ? styles.statusConfirmed :
                      res.status === 'Pending' ? styles.statusPending :
                      styles.statusCancelled
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td>
                    <Eye size={16} className={styles.actionIcon} />
                    <Edit3 size={16} className={styles.actionIcon} />
                    <Trash2 size={16} className={styles.actionIcon} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
