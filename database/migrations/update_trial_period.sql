-- Update trial period from 14 days to 30 days
-- Date: October 22, 2025

-- Recreate the start_trial function with new default
CREATE OR REPLACE FUNCTION start_trial(
    p_company_id UUID,
    p_plan_id VARCHAR(50),
    p_trial_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
BEGIN
    INSERT INTO subscriptions (
        company_id,
        plan_id,
        status,
        trial_end,
        current_period_start,
        current_period_end
    )
    VALUES (
        p_company_id,
        p_plan_id,
        'trialing',
        CURRENT_TIMESTAMP + (p_trial_days || ' days')::INTERVAL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + (p_trial_days || ' days')::INTERVAL
    )
    RETURNING id INTO subscription_id;
    
    -- Update company trial end date
    UPDATE companies
    SET trial_ends_at = CURRENT_TIMESTAMP + (p_trial_days || ' days')::INTERVAL
    WHERE id = p_company_id;
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Extend existing active trials to 30 days (optional - only if you want to extend current trials)
-- Uncomment if you want to extend trials already in progress:
/*
UPDATE companies
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE trial_ends_at IS NOT NULL 
  AND trial_ends_at > CURRENT_TIMESTAMP
  AND trial_ends_at = created_at + INTERVAL '14 days';

UPDATE subscriptions
SET trial_end = current_period_start + INTERVAL '30 days',
    current_period_end = current_period_start + INTERVAL '30 days'
WHERE status = 'trialing'
  AND trial_end > CURRENT_TIMESTAMP
  AND trial_end = current_period_start + INTERVAL '14 days';
*/

-- Verify the function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'start_trial';
