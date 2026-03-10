import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { hotel, tier, rooms } = body as {
      hotel: {
        hotelName: string;
        city: string;
        phone: string;
        timezone: string;
        systemPrompt?: string;
      };
      tier: 1 | 2;
      rooms?: {
          id: string;
          type: string;
          price: string;
          count: string;
          capacity: string;
      }[];
    };

    // 3. Validate required fields
    if (!hotel?.hotelName?.trim()) {
      return NextResponse.json({ error: "Hotel name is required." }, { status: 400 });
    }
    if (!hotel?.city?.trim()) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }
    if (!hotel?.phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (tier !== 1 && tier !== 2) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const planName = tier === 1 ? "starter" : "pro";

    // 4. Upsert the business record (link to Supabase auth user)
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name ?? user.email,
          plan: planName,
          plan_status: "pending", // becomes 'active' after payment verified
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (bizError || !business) {
      console.error("[onboarding] business upsert error:", bizError);
      return NextResponse.json(
        { error: "Failed to create business record." },
        { status: 500 }
      );
    }

    // 5. Save hotel record — check if one already exists for this business
    const { data: existingHotel } = await supabaseAdmin
      .from("hotels")
      .select("id")
      .eq("business_id", business.id)
      .maybeSingle();

    const hotelPayload = {
      business_id: business.id,
      name: hotel.hotelName.trim(),
      type: "Hotel", // hotel-only platform
      address: hotel.city.trim(),
      timezone: hotel.timezone?.trim() || "Asia/Kolkata",
      phone_number: hotel.phone.trim(),
    };

    let hotelId = existingHotel?.id;

    if (existingHotel) {
      // Update existing hotel record
      const { error } = await supabaseAdmin
        .from("hotels")
        .update(hotelPayload)
        .eq("id", existingHotel.id);
      if (error) {
        console.error("[onboarding] hotel update error:", error);
        return NextResponse.json({ error: "Failed to update hotel details." }, { status: 500 });
      }
    } else {
      // Insert new hotel record
      const { data: newHotel, error } = await supabaseAdmin
        .from("hotels")
        .insert(hotelPayload)
        .select("id")
        .single();
        
      if (error || !newHotel) {
        console.error("[onboarding] hotel insert error:", error);
        return NextResponse.json({ error: "Failed to create hotel details." }, { status: 500 });
      }
      hotelId = newHotel.id;

    }

    if (rooms && rooms.length > 0) {
      // Clear old rooms if re-running onboarding
      if (existingHotel) {
        await supabaseAdmin.from("rooms").delete().eq("hotel_id", hotelId);
      }

      const roomRows = [];
      let floor = 1;
      for (const roomDef of rooms) {
          const numRooms = parseInt(roomDef.count) || 1;
          for (let i = 1; i <= numRooms; i++) {
              roomRows.push({
                  hotel_id: hotelId,
                  room_number: `${floor}0${i}`,
                  room_type: roomDef.type,
                  base_price: parseFloat(roomDef.price) || 0,
                  capacity: parseInt(roomDef.capacity) || 2,
                  is_available: true
              });
          }
          floor++;
      }

      if (roomRows.length > 0) {
          const { error: roomsError } = await supabaseAdmin
            .from("rooms")
            .insert(roomRows);
            
          if (roomsError) {
            console.error("[onboarding] user rooms insert error:", roomsError);
          }
      }
    }

    return NextResponse.json({ businessId: business.id });
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
