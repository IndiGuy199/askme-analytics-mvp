-- Add Stripe-related columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add Stripe-related columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id 
ON companies(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
ON subscriptions(status);

-- Add comment
COMMENT ON COLUMN companies.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID (redundant for quick lookups)';
