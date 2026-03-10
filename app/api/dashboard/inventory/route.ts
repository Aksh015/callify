import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business ID for the user
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    // Get the hotel ID
    const { data: hotel } = await supabase
      .from("hotels")
      .select("id")
      .eq("business_id", business.id)
      .single();

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
    }

    // Get all rooms for this hotel
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("room_type, base_price, is_available")
      .eq("hotel_id", hotel.id);

    if (roomsError) {
      console.error("[inventory API] rooms fetch error:", roomsError);
      return NextResponse.json({ error: "Failed to fetch inventory." }, { status: 500 });
    }

    // Aggregate rooms by room_type
    const roomTypeMap = new Map<string, { type: string, basePrice: number, total: number, available: number }>();

    rooms?.forEach(room => {
      if (!roomTypeMap.has(room.room_type)) {
        roomTypeMap.set(room.room_type, {
          type: room.room_type,
          basePrice: room.base_price,
          total: 0,
          available: 0
        });
      }
      const mapItem = roomTypeMap.get(room.room_type)!;
      mapItem.total += 1;
      if (room.is_available) {
        mapItem.available += 1;
      }
    });

    const roomTypes = Array.from(roomTypeMap.values());

    return NextResponse.json({ roomTypes });

  } catch (error) {
    console.error("[inventory API] unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update existing room categories or add new ones
export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { data: business } = await supabaseAdmin
            .from("businesses")
            .select(`hotels ( id )`)
            .eq("user_id", user.id)
            .maybeSingle();

        const hotelId = Array.isArray(business?.hotels)
            ? (business?.hotels as any)[0]?.id
            : (business?.hotels as any)?.id;

        if (!hotelId) {
            return NextResponse.json({ error: "No hotel found" }, { status: 404 });
        }

        const body = await req.json();
        const { rooms } = body;

        if (!rooms || !Array.isArray(rooms)) {
             return NextResponse.json({ error: "Invalid rooms data" }, { status: 400 });
        }

        await supabaseAdmin.from("rooms").delete().eq("hotel_id", hotelId);

        const roomRows = [];
        let floor = 1;
        for (const roomDef of rooms) {
            const numRooms = parseInt(roomDef.total) || 1;
            for (let i = 1; i <= numRooms; i++) {
                roomRows.push({
                    hotel_id: hotelId,
                    room_number: `${floor}0${i}`,
                    room_type: roomDef.type,
                    base_price: parseFloat(roomDef.basePrice) || 0,
                    capacity: 2, // Defaulting for dashboard edit
                    is_available: true
                });
            }
            floor++;
        }

        if (roomRows.length > 0) {
            const { error: roomsError } = await supabaseAdmin
                .from("rooms")
                .insert(roomRows);
                
            if (roomsError) throw roomsError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Inventory POST]", error);
        return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
    }
}
