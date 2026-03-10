/**
 * Default demo context for the Callify hotel chatbot.
 * This is used when no custom context is set by the business user.
 * Business users can update this context from their Dashboard Settings page.
 */

export const DEFAULT_DEMO_CONTEXT = `
=== HOTEL INFORMATION ===
Hotel Name: Sunset Oasis Hotel
Location: 123 Beachfront Drive, Goa, India
Hotel Type: Luxury Beach Resort
Star Rating: 4-Star
Contact Number: +91 9328010328
Email: reservations@sunsetoasis.in
Website: www.sunsetoasis.in
Check-in Time: 2:00 PM
Check-out Time: 11:00 AM

=== ROOM TYPES & PRICING ===
1. Standard Room
   - Price: ₹3,500/night
   - Capacity: 2 guests
   - Available: 15 rooms
   - Amenities: AC, Wi-Fi, TV, Mini bar, Attached bathroom

2. Deluxe Room
   - Price: ₹5,500/night
   - Capacity: 2-3 guests
   - Available: 10 rooms
   - Amenities: AC, Wi-Fi, Smart TV, Mini bar, Sea-facing balcony, Room service

3. Premium Suite
   - Price: ₹9,000/night
   - Capacity: 2-4 guests
   - Available: 5 rooms
   - Amenities: AC, Wi-Fi, Smart TV, Private jacuzzi, Living room area, Butler service, Sea view

4. Family Suite
   - Price: ₹12,000/night
   - Capacity: 4-6 guests
   - Available: 3 rooms
   - Amenities: 2 bedrooms, AC, Wi-Fi, Smart TV, Kids play area, Kitchenette, Ocean view

=== HOTEL AMENITIES ===
- Swimming Pool: Open 7 AM – 9 PM daily
- Spa & Wellness Center: Open 9 AM – 8 PM, advance booking recommended
- Restaurant "Ocean Breeze": Breakfast 7-10 AM, Lunch 12-3 PM, Dinner 7-11 PM
- Bar "Sunset Lounge": Open 5 PM – 12 AM
- Gym & Fitness Center: Open 6 AM – 10 PM
- Free Wi-Fi throughout the property
- 24-hour Room Service
- Airport shuttle service (₹1,500 one way, book 24 hours in advance)
- Complimentary breakfast included with Deluxe and above rooms
- Laundry service available (same-day if submitted before 10 AM)
- Kids Club: Open 10 AM – 6 PM (ages 4-12, complimentary for guests)

=== POLICIES ===
- Cancellation: Free cancellation up to 48 hours before check-in. 50% charge for cancellations within 48 hours.
- Pets: Not allowed (except certified service animals)
- Smoking: Non-smoking property. Designated smoking zones available near the garden area.
- Extra bed: Available at ₹800/night on request
- Early check-in / Late check-out: Subject to availability, ₹500 per hour
- Parking: Free valet parking for all guests
- ID Proof: Valid government-issued ID required at check-in

=== NEARBY ATTRACTIONS ===
- Baga Beach: 5 min walk
- Calangute Market: 10 min drive
- Fort Aguada: 15 min drive
- Saturday Night Market (Arpora): 20 min drive
- Dudhsagar Waterfalls: 2 hour drive (day trip available through concierge)

=== SPECIAL PACKAGES ===
- Honeymoon Package: Premium Suite + Spa couples treatment + candlelight dinner = ₹15,000/night
- Weekend Getaway (Fri-Sun): 10% off on Standard & Deluxe rooms
- Extended Stay (7+ nights): 20% discount on all room types
`.trim();

export function buildDemoSystemPrompt(context: string, hotelName?: string): string {
  const name = hotelName || extractHotelName(context) || "Our Hotel";
  
  return `You are the AI virtual receptionist for "${name}". You are a helpful, professional, and concise hotel assistant.

## YOUR ABSOLUTE RULES:
1. **ONLY answer questions using the RAG CONTEXT provided below.** Do NOT make up information, prices, room types, or amenities that are not in the context. If the answer is not physically present in the context below, proceed to rule #2.
2. **If you do not understand what the user wants to ask or if the answer is NOT in the CONTEXT**, you MUST say exactly: "I am unable to understand what you want to ask, please ask something from the context provided." Do not try to guess or provide outside information.
3. **Handle basic greetings naturally.** Respond to "Hi", "Hello", "How are you?", "Thank you", "Bye" with warm, proper responses.
4. **DO NOT reveal any personal information.** Never share names, phone numbers, email addresses, or any personal details of employees, guests, yourself, or anyone else. 
5. **Give answer to the point, in a proper way.** Keep your responses very brief, concise, and direct. Do not give too much extra information.

## RETRIEVED context (This is your ONLY source of truth):
---
${context}
---

Remember the consequences: If it's not in the context above, strictly say "I am unable to understand what you want to ask...". Be concise and to the point.`;
}

/**
 * Extract hotel name from the context string.
 */
function extractHotelName(context: string): string | null {
  const match = context.match(/Hotel\s*Name\s*:\s*(.+)/i);
  return match ? match[1].trim() : null;
}
