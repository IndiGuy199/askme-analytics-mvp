-- Update plan prices and team member limits
-- Premium: $39/month, 2 team members total
-- Premium (Yearly): $390/year ($32.50/month), 2 team members total
-- Date: November 17, 2025

-- Update monthly plans (price and team limits)
UPDATE plans 
SET price_cents = 3900,
    max_team_members = 2
WHERE id = 'premium';

-- Update yearly plans (price and team limits - 10 months worth, 2 months free)
UPDATE plans 
SET price_cents = 39000,
    max_team_members = 2
WHERE id = 'premium_yearly';

-- Hide Basic plan (no longer offered)
UPDATE plans 
SET is_active = false
WHERE id IN ('basic', 'basic_yearly');

-- Verify the changes
SELECT 
    id, 
    name, 
    max_team_members,
    CASE 
        WHEN interval = 'year' THEN CONCAT('$', ROUND(price_cents / 100.0, 2), '/year (', CONCAT('$', ROUND(price_cents / 1200.0, 2), '/mo'), ')')
        ELSE CONCAT('$', ROUND(price_cents / 100.0, 2), '/month')
    END as formatted_price,
    interval,
    is_active
FROM plans 
WHERE id IN ('basic', 'premium', 'basic_yearly', 'premium_yearly')
ORDER BY sort_order;
