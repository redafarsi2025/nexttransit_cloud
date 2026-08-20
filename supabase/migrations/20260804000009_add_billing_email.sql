-- Add billing_email to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
