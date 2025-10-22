-- Update plan prices and team member limits
-- Basic: $39/month, 2 team members total (was $29, 3 members)
-- Premium: $79/month, 6 team members total (was $99, 10 members)
-- Date: October 22, 2025

-- Update monthly plans (price and team limits)
UPDATE plans 
SET price_cents = 3900,
    max_team_members = 2
WHERE id = 'basic';

UPDATE plans 
SET price_cents = 7900,
    max_team_members = 6
WHERE id = 'premium';

-- Update yearly plans (price and team limits - 10 months worth, 2 months free)
UPDATE plans 
SET price_cents = 39000,
    max_team_members = 2
WHERE id = 'basic_yearly';

UPDATE plans 
SET price_cents = 79000,
    max_team_members = 6
WHERE id = 'premium_yearly';

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
