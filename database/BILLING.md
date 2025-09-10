# Billing and Subscription Schema

This document explains the billing and subscription system for the AskMe Analytics MVP.

## Schema Overview

### Core Tables

#### Companies
- **Purpose**: Represents organizations using the platform
- **Key Fields**: `name`, `slug`, `billing_email`, `trial_ends_at`
- **Relationships**: Has many users, subscriptions, clients

#### Users
- **Purpose**: Individual users within companies
- **Key Fields**: `email`, `name`, `role` (owner/admin/member)
- **Relationships**: Belongs to company

#### Plans
- **Purpose**: Subscription tiers with feature entitlements
- **Key Fields**: `price_cents`, `max_projects`, `ai_insights`, etc.
- **Plans Available**:
  - `free`: $0/month, 1 project, basic features
  - `basic`: $29/month, 3 projects, AI insights
  - `premium`: $99/month, 10 projects, all features
  - `enterprise`: $299/month, unlimited, white-label

#### Subscriptions
- **Purpose**: Active billing subscriptions
- **Key Fields**: `status`, `current_period_end`, `stripe_subscription_id`
- **Statuses**: `trialing`, `active`, `past_due`, `canceled`, `unpaid`

#### Payments
- **Purpose**: Payment transaction records
- **Key Fields**: `amount_cents`, `status`, `provider_payment_id`
- **Providers**: Stripe, PayPal, manual

#### Usage Tracking
- **Purpose**: Monitor feature usage against plan limits
- **Metrics**: `projects`, `team_members`, `ai_insights`, `api_calls`

## Feature Entitlements

| Feature | Free | Basic | Premium | Enterprise |
|---------|------|-------|---------|------------|
| Projects | 1 | 3 | 10 | Unlimited |
| Team Members | 1 | 3 | 10 | Unlimited |
| Data Retention | 7 days | 30 days | 90 days | 365 days |
| AI Insights | ❌ | ✅ | ✅ | ✅ |
| Custom Benchmarks | ❌ | ❌ | ✅ | ✅ |
| Slack Integration | ❌ | ✅ | ✅ | ✅ |
| Email Digest | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

## Useful Views

### company_dashboard
Complete company overview with subscription status, plan details, and current usage.

```sql
SELECT * FROM company_dashboard WHERE company_id = $1;
```

### subscription_health
System-wide subscription health metrics for admin dashboard.

```sql
SELECT * FROM subscription_health;
```

### revenue_analytics
Monthly revenue breakdown by plan and currency.

```sql
SELECT * FROM revenue_analytics WHERE month >= '2025-01-01';
```

## Common Queries

### Check if company can create new project
```sql
SELECT 
    cd.*,
    CASE 
        WHEN cd.max_projects = -1 THEN true
        ELSE cd.current_projects < cd.max_projects
    END as can_create_project
FROM company_dashboard cd
WHERE cd.company_id = $1;
```

### Get active subscriptions expiring in 7 days
```sql
SELECT 
    co.name,
    co.billing_email,
    s.current_period_end,
    p.name as plan_name
FROM subscriptions s
JOIN companies co ON s.company_id = co.id
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active'
AND s.current_period_end BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days';
```

### Track feature usage
```sql
-- Increment project count
INSERT INTO usage_tracking (company_id, metric, value, period_start, period_end)
VALUES ($1, 'projects', 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month')
ON CONFLICT (company_id, metric, period_start)
DO UPDATE SET value = usage_tracking.value + 1;
```

## Integration Points

### Stripe Webhooks
Handle subscription events and update database:
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Middleware for Plan Limits
Check entitlements before allowing actions:
```javascript
// Example middleware
async function checkProjectLimit(req, res, next) {
  const dashboard = await getCompanyDashboard(req.user.company_id);
  
  if (dashboard.projects_limit_reached) {
    return res.status(403).json({ 
      error: 'Project limit reached', 
      upgrade_url: '/billing' 
    });
  }
  
  next();
}
```

## Migration Strategy

If upgrading from existing schema:
1. Create new billing tables
2. Migrate existing clients to companies structure
3. Create default free subscriptions for existing users
4. Update application code to use company-based permissions

## Security Considerations

- Encrypt API keys in `clients.api_key_encrypted`
- Store payment provider IDs but never payment details
- Use row-level security for multi-tenant isolation
- Validate plan limits on both client and server side

## Next Steps

1. **Payment Integration**: Set up Stripe/PayPal webhooks
2. **Plan Enforcement**: Add middleware to check limits
3. **Billing UI**: Create subscription management interface
4. **Usage Tracking**: Implement real-time usage counters
5. **Admin Dashboard**: Build system health monitoring
