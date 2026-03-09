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
      return NextResponse.json({ reservations: [] });
    }

    // Fetch reservations
    const { data: reservations } = await supabaseAdmin
      .from("reservations")
      .select("*, rooms (room_type)")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false });

    const formattedReservations = (reservations || []).map((r) => {
      const cIn = new Date(r.check_in_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const cOut = new Date(r.check_out_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      let roomType = "Standard";
      if (Array.isArray(r.rooms)) {
        roomType = r.rooms[0]?.room_type || roomType;
      } else if (r.rooms && typeof r.rooms === "object") {
        // @ts-ignore
        roomType = r.rooms.room_type || roomType;
      }

      // Formatting currency (assuming total_amount is numeric)
      const amountFormat = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
      }).format(Number(r.total_amount) || 0);

      return {
        id: r.id.substring(0, 8), // shorten UUID for display
        name: r.guest_name,
        phone: r.guest_phone,
        dates: `${cIn} – ${cOut}`,
        room: roomType,
        amount: amountFormat,
        status: r.status, // e.g. 'Confirmed', 'Pending', 'Cancelled'
      };
    });

    return NextResponse.json({ reservations: formattedReservations });
  } catch (error) {
    console.error("[Reservations API]", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}
