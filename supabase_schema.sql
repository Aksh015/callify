-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Businesses (Owner accounts linked to Supabase Auth via email)
-- A business row is ONLY created after a user completes onboarding + payment.
-- If a user signs in but hasn't bought a plan, they have NO row here → not mapped.
-- The email column is the primary mapping key between Google OAuth and the business.
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,                       -- Supabase auth.users.id (Google OAuth)
    email TEXT NOT NULL UNIQUE,                          -- Google email = mapping key
    name TEXT,                                          -- Owner / contact name
    plan TEXT NOT NULL DEFAULT 'starter',                -- 'starter' | 'pro'
    plan_status TEXT NOT NULL DEFAULT 'pending',         -- 'pending' | 'active' | 'cancelled'
    assigned_number TEXT,                                -- Twilio number assigned to this business
    -- assigned_number is NULL until admin assigns one after payment.
    -- Starter number → AI handles availability + info only
    -- Pro number     → AI handles availability + info + payments + reservations
    -- Each plan type routes to a different Twilio number with different AI capabilities.
    cashfree_order_id TEXT,                              -- Latest Cashfree order for billing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. Hotels (Properties — each business owns one hotel)
CREATE TABLE public.hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,          -- e.g., 'Boutique', 'Luxury', 'Business'
    address TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    phone_number TEXT NOT NULL,  -- Hotel's own front-desk phone (fallback)
    pms_api_key TEXT,            -- Encrypted or simulated key for PMS
    cashfree_app_id TEXT,        -- Payment Gateway Integration (Pro only)
    cashfree_secret_key TEXT,
    stripe_account_id TEXT,      -- Alternative Payment Gateway (Pro only)
    whatsapp_api_token TEXT,     -- WhatsApp API Token for sending payment links (Pro only)
    whatsapp_phone_id TEXT       -- WhatsApp Phone ID (Pro only)
);

-- 2. Rooms (Inventory / Availability)
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL,     -- e.g., 'Standard', 'Deluxe', 'Suite'
    base_price DECIMAL(10,2) NOT NULL,
    capacity INT NOT NULL,
    is_available BOOLEAN DEFAULT true,
    UNIQUE(hotel_id, room_number)
);

-- 3. Reservations (Bookings)
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Cancelled'
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Hotel Services (Concierge / Appointments)
CREATE TABLE public.hotel_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,  -- e.g., 'Spa', 'Restaurant', 'Airport Transfer'
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    special_requests TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled' -- 'Scheduled', 'Completed', 'Cancelled'
);

-- 5. Call Logs / Analytics
CREATE TABLE public.call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    caller_number TEXT NOT NULL,
    call_duration_seconds INT NOT NULL,
    intent TEXT NOT NULL,        -- e.g., 'Booking', 'FAQ', 'Cancellation'
    was_successful BOOLEAN DEFAULT false,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (Example: Allow authenticated users to read/write their hotel's data)
-- For demo purposes, we can allow public access if no auth is implemented yet, or restrict it later.
CREATE POLICY "Enable all access for all users" ON public.businesses FOR ALL USING (true);
CREATE POLICY "Enable read access for all users" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON public.hotels FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.rooms FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.reservations FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.hotel_services FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON public.call_logs FOR ALL USING (true);
