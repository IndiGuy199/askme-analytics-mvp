-- Rename BASIC plan to PREMIUM
-- This updates all references in the database

-- Update plan IDs and names in plans table
UPDATE plans 
SET id = 'premium', 
    name = 'Premium'
WHERE id = 'basic';

UPDATE plans 
SET id = 'premium_yearly', 
    name = 'Premium (Yearly)'
WHERE id = 'basic_yearly';

-- Update subscriptions table to reference new plan IDs
UPDATE subscriptions 
SET plan_id = 'premium'
WHERE plan_id = 'basic';

UPDATE subscriptions 
SET plan_id = 'premium_yearly'
WHERE plan_id = 'basic_yearly';

-- Update any historical records in payment_transactions
UPDATE payment_transactions 
SET plan_id = 'premium'
WHERE plan_id = 'basic';

UPDATE payment_transactions 
SET plan_id = 'premium_yearly'
WHERE plan_id = 'basic_yearly';

-- Update description
UPDATE plans
SET description = 'Advanced analytics for growing teams'
WHERE id = 'premium';

UPDATE plans
SET description = 'Advanced analytics - 2 months free'
WHERE id = 'premium_yearly';

-- Update table comment
COMMENT ON TABLE plans IS 'Three subscription tiers: premium, enterprise';
