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
        totalCalls: 0,
        bookingConversion: "0%",
        revenue: 0,
        newGuests: 0,
        recentBookings: [],
      });
    }

    // 1. Total AI Calls
    const { count: totalCalls } = await supabaseAdmin
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("hotel_id", hotelId);

    // 2. Revenue & New Guests via Reservations
    const { data: reservations } = await supabaseAdmin
      .from("reservations")
      .select("*, rooms (room_type)")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false });

    const totalReservations = reservations?.length || 0;
    const revenue =
      reservations?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0;
    const newGuests = totalReservations; // Approximating new guests as total reservations

    // Booking Conversion logic
    // Just reservations count / total calls * 100
    let bookingConversion = "0%";
    const callsCount = totalCalls || 0;
    if (callsCount > 0 && totalReservations > 0) {
      const val = (totalReservations / callsCount) * 100;
      bookingConversion = val.toFixed(1) + "%";
    }

    // 3. Recent Actioned Bookings
    const recentBookings = (reservations || []).slice(0, 5).map((r) => {
      // Date formatting
      const cIn = new Date(r.check_in_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const cOut = new Date(r.check_out_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Handle rooms array or single object correctly
      let roomType = "Standard";
      if (Array.isArray(r.rooms)) {
        roomType = r.rooms[0]?.room_type || roomType;
      } else if (r.rooms && typeof r.rooms === 'object') {
        // @ts-ignore
        roomType = r.rooms.room_type || roomType;
      }

      return {
        id: r.id,
        guest: r.guest_name,
        dates: `${cIn} – ${cOut}`,
        room: roomType,
        by: "Voice AI", // Assumed
        status: r.status, // 'Pending', 'Confirmed', 'Cancelled'
      };
    });

    return NextResponse.json({
      totalCalls: callsCount,
      bookingConversion,
      revenue,
      newGuests,
      recentBookings,
    });
  } catch (error) {
    console.error("[Overview API]", error);
    return NextResponse.json(
      { error: "Failed to fetch overview metrics" },
      { status: 500 }
    );
  }
}
