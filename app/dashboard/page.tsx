"use client";

import styles from "./dashboard.module.css";
import { Activity, Users, IndianRupee, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";

type HotelInfo = { name: string; city: string } | null;

type DashboardData = {
  totalCalls: number;
  bookingConversion: string;
  revenue: number;
  newGuests: number;
  recentBookings: Array<{
    id: string;
    guest: string;
    dates: string;
    room: string;
    by: string;
    status: string;
  }>;
};

export default function DashboardOverview() {
  const [hotel, setHotel] = useState<HotelInfo>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/dashboard/overview").then((r) => r.json()),
    ])
      .then(([authData, dashboardData]) => {
        if (authData?.hotel) setHotel(authData.hotel);
        if (dashboardData && !dashboardData.error) setData(dashboardData);
      })
      .finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        {loading ? (
          <>
            <div className={styles.headerTitleSkeleton} />
            <div className={styles.headerSubSkeleton} />
          </>
        ) : (
          <>
            <h1>
              {greeting}
              {hotel?.name ? (
                <>
                  {" "}
                  — <span className={styles.hotelNameAccent}>{hotel.name}</span>
                </>
              ) : null}
            </h1>
            <p>
              Real-time AI performance metrics for your hotel
              {hotel?.city ? ` in ${hotel.city}` : ""}.
            </p>
          </>
        )}
      </header>

      {/* Key Metrics */}
      <section className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Total AI Calls</span>
            <PhoneCall size={20} className={styles.metricIconCyan} />
          </div>
          <div className={styles.metricValue}>{data?.totalCalls ?? 0}</div>
          <div className={`${styles.metricChange} ${styles.positive}`}>
            Real-time
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Booking Conversion</span>
            <Activity size={20} className={styles.metricIconPurple} />
          </div>
          <div className={styles.metricValue}>{data?.bookingConversion ?? "0%"}</div>
          <div className={`${styles.metricChange} ${styles.positive}`}>
            Current week
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Revenue Generated</span>
            <IndianRupee size={20} className={styles.metricIconCyan} />
          </div>
          <div className={styles.metricValue}>₹{data?.revenue.toLocaleString('en-IN') ?? 0}</div>
          <div className={`${styles.metricChange} ${styles.positive}`}>
            Total to date
          </div>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>New Guests</span>
            <Users size={20} className={styles.metricIconPurple} />
          </div>
          <div className={styles.metricValue}>{data?.newGuests ?? 0}</div>
          <div className={`${styles.metricChange} ${styles.positive}`}>
            Total to date
          </div>
        </div>
      </section>

      {/* Recent Reservations */}
      <section className={`glass-panel ${styles.recentReservations}`}>
        <h2>Recent Actioned Bookings</h2>
        <table className={styles.reservationsTable}>
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Dates</th>
              <th>Room Type</th>
              <th>Handled By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentBookings && data.recentBookings.length > 0) ? (
              data.recentBookings.map((row) => (
                <tr key={row.id}>
                  <td>{row.guest}</td>
                  <td>{row.dates}</td>
                  <td>{row.room}</td>
                  <td>{row.by}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        row.status === "Confirmed"
                          ? styles.statusConfirmed
                          : styles.statusPending
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", fontStyle: "italic", opacity: 0.5 }}>
                  No recent bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
