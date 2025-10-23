-- Create payment_transactions table to record all payment events
-- This serves as proof of payment and audit trail

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe identifiers
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- succeeded, failed, pending, refunded
    payment_method_type VARCHAR(50), -- card, bank_transfer, etc.
    
    -- Payment metadata
    description TEXT,
    receipt_url TEXT,
    invoice_pdf_url TEXT,
    
    -- Plan information
    plan_id VARCHAR(50),
    billing_period VARCHAR(20), -- monthly, yearly
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional metadata as JSON
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Indexes for faster queries
    CONSTRAINT unique_stripe_payment_intent UNIQUE(stripe_payment_intent_id),
    CONSTRAINT unique_stripe_charge UNIQUE(stripe_charge_id)
);

-- Create indexes for common queries
CREATE INDEX idx_payment_transactions_company_id ON payment_transactions(company_id);
CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_stripe_customer_id ON payment_transactions(stripe_customer_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_paid_at ON payment_transactions(paid_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Add RLS policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's payment transactions
CREATE POLICY "Users can view their company's payment transactions"
    ON payment_transactions
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Service role can do everything (for webhooks)
CREATE POLICY "Service role can manage all payment transactions"
    ON payment_transactions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE payment_transactions IS 'Records all payment transactions as proof of payment and audit trail';
COMMENT ON COLUMN payment_transactions.stripe_payment_intent_id IS 'Stripe PaymentIntent ID - unique identifier for the payment';
COMMENT ON COLUMN payment_transactions.amount IS 'Amount in the smallest currency unit (e.g., cents for USD)';
COMMENT ON COLUMN payment_transactions.status IS 'Payment status: succeeded, failed, pending, refunded';
COMMENT ON COLUMN payment_transactions.receipt_url IS 'URL to Stripe receipt for customer';

-- Create a view for successful payments
CREATE OR REPLACE VIEW successful_payments AS
SELECT 
    pt.id,
    pt.company_id,
    pt.subscription_id,
    pt.stripe_payment_intent_id,
    pt.stripe_charge_id,
    pt.stripe_invoice_id,
    pt.stripe_subscription_id,
    pt.stripe_customer_id,
    pt.amount,
    pt.currency,
    pt.status,
    pt.payment_method_type,
    pt.description,
    pt.receipt_url,
    pt.invoice_pdf_url,
    pt.billing_period,
    pt.paid_at,
    pt.created_at,
    pt.updated_at,
    pt.metadata,
    c.name as company_name,
    s.plan_id as subscription_plan_id,
    s.status as subscription_status
FROM payment_transactions pt
JOIN companies c ON c.id = pt.company_id
LEFT JOIN subscriptions s ON s.id = pt.subscription_id
WHERE pt.status = 'succeeded'
ORDER BY pt.paid_at DESC;

COMMENT ON VIEW successful_payments IS 'View of all successful payment transactions with company and subscription details';
