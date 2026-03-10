-- Add demo_context column to businesses table
-- This column stores the custom knowledge base text that powers the AI chatbot demo.
-- Business users can edit this from Dashboard > Settings > AI Knowledge Base.
-- When NULL, the system falls back to the default demo context defined in lib/demo-context.ts.

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS demo_context TEXT;

COMMENT ON COLUMN public.businesses.demo_context IS 
  'Custom AI chatbot knowledge base context. When NULL, the default demo context is used.';
