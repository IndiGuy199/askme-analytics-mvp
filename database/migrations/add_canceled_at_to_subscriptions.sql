-- Add canceled_at column to subscriptions table
-- This tracks when a subscription was canceled

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN subscriptions.canceled_at IS 'Timestamp when the subscription was canceled';
