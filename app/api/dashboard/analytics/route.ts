import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get hotel id
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select(`
        id,
        hotels ( id )
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    const hotelId = Array.isArray(business?.hotels)
      ? (business?.hotels as any)[0]?.id
      : (business?.hotels as any)?.id;

    if (!hotelId) {
      return NextResponse.json({
        frequentQuestions: [],
        heatmap: [],
        stats: {
          avgHandleTime: "0s",
          escalationRate: "0%",
          paymentSuccess: "0%",
          deflectionRate: "0%",
        },
      });
    }

    // Fetch call logs
    const { data: callLogs } = await supabaseAdmin
      .from("call_logs")
      .select("intent, call_duration_seconds, was_successful, created_at")
      .eq("hotel_id", hotelId);

    const logs = callLogs || [];

    // 1. Frequent Questions (grouped by intent)
    const intentCounts: Record<string, number> = {};
    logs.forEach((log) => {
      intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1;
    });

    const totalLogs = logs.length;
    let frequentQuestions = Object.entries(intentCounts)
      .map(([label, count]) => ({
        label,
        value: totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // If no data, provide a realistic empty fallback purely for presentation
    if (frequentQuestions.length === 0) {
      frequentQuestions = [
        { label: "Booking", value: 0 },
        { label: "Check-in time", value: 0 },
        { label: "Wifi Password", value: 0 },
        { label: "Parking Info", value: 0 },
        { label: "Cancellation", value: 0 },
      ];
    }

    // 2. Heatmap
    // 7 days (Mon-Sun), 4 time blocks (0: Morning, 1: Afternoon, 2: Evening, 3: Night)
    // 1-indexed for JS getDay(): 0=Sun, 1=Mon... we'll map Mon=0, Sun=6.
    const heatmapData = Array.from({ length: 28 }).fill(0) as number[];

    logs.forEach((log) => {
      const d = new Date(log.created_at);
      let dayIndex = d.getDay() - 1; // Mon=0, Tue=1...
      if (dayIndex === -1) dayIndex = 6; // Sunday

      const hour = d.getHours();
      let timeBlock = 0; // Morning 6 AM - 12 PM
      if (hour >= 12 && hour < 17) timeBlock = 1; // Afternoon 12 PM - 5 PM
      else if (hour >= 17 && hour < 22) timeBlock = 2; // Evening 5 PM - 10 PM
      else timeBlock = 3; // Night 10 PM - 6 AM

      const index = timeBlock * 7 + dayIndex;
      if (index >= 0 && index < 28) heatmapData[index]++;
    });

    const maxHeat = Math.max(...heatmapData, 1);
    const normalizedHeatmap = heatmapData.map((val) => val / maxHeat);

    // 3. Stats
    let totalSecs = 0;
    let successfulLogs = 0;
    logs.forEach((log) => {
      totalSecs += log.call_duration_seconds;
      if (log.was_successful) successfulLogs++;
    });

    const avgSecs = totalLogs > 0 ? Math.round(totalSecs / totalLogs) : 0;
    const mins = Math.floor(avgSecs / 60);
    const secs = avgSecs % 60;
    const avgHandleTime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Escalation = 100 - success rate (for demo purposes)
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;
    const escalationRate = totalLogs > 0 ? (100 - successRate).toFixed(1) + "%" : "0%";
    const deflectionRate = totalLogs > 0 ? successRate.toFixed(1) + "%" : "0%";

    // Payment Success — computed from reservations payment_status
    const { data: reservations } = await supabaseAdmin
      .from("reservations")
      .select("payment_status")
      .eq("hotel_id", hotelId);

    const totalReservations = reservations?.length || 0;
    const paidReservations = reservations?.filter((r) => r.payment_status?.toLowerCase() === "paid").length || 0;
    const paymentSuccess = totalReservations > 0 ? Math.round((paidReservations / totalReservations) * 100) + "%" : "0%";

    return NextResponse.json({
      frequentQuestions,
      heatmap: normalizedHeatmap,
      stats: {
        avgHandleTime,
        escalationRate,
        paymentSuccess,
        deflectionRate,
      },
      totalCalls: totalLogs,
    });
  } catch (error) {
    console.error("[Analytics API]", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
