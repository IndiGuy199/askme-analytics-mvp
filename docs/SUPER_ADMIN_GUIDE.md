# Super Admin Feature Documentation

## Overview

The Super Admin feature allows designated administrators to impersonate any client company for troubleshooting purposes. All impersonation sessions are logged for security and compliance.

## Setup

### 1. Run the Database Migration

Apply the super admin migration to add required tables and columns:

```bash
# Using psql
psql $DATABASE_URL -f database/migrations/add_super_admin.sql

# Or via Supabase dashboard
# Copy and paste the contents of add_super_admin.sql into the SQL Editor
```

### 2. Grant Super Admin Access

The migration automatically grants super admin access to `proservices330@gmail.com`. To add more super admins:

```sql
UPDATE users 
SET is_super_admin = true 
WHERE email = 'your-admin@example.com';
```

## Usage

### Accessing the Super Admin Dashboard

1. **Login** as a super admin user (proservices330@gmail.com)
2. **Navigate** to `/admin` or click the "Super Admin" button in the dashboard header
3. **Search** for a company using the search bar
4. **Click "Impersonate"** on any company to view their analytics

### Impersonation Flow

1. **Start Impersonation**
   - From `/admin`, find the target company
   - Click "Impersonate" button
   - Enter an optional reason for troubleshooting
   - You'll be redirected to `/analytics` viewing that company's data

2. **Active Impersonation**
   - A red banner appears at the top showing the impersonated company
   - All analytics show data for the target company
   - The banner displays company name, slug, and start time

3. **End Impersonation**
   - Click "End Impersonation" in the red banner
   - You'll be returned to the Super Admin dashboard
   - The session is logged with start and end times

### Features

#### Super Admin Dashboard (`/admin`)

- **Company List**: View all companies with subscription status
- **Search**: Filter by company name, slug, or PostHog client ID
- **Stats Overview**: Total companies, active subscriptions, trial accounts
- **Company Details**: 
  - Subscription status (active, trialing, canceled, etc.)
  - PostHog configuration (client ID, project ID)
  - User count
  - Created date
  - Active/inactive status

#### Impersonated View

- View the exact same analytics as the client sees
- Check if charts and metrics are appearing correctly
- Troubleshoot data collection issues
- Verify PostHog integration

## Security & Compliance

### Audit Trail

All impersonation sessions are logged in the `impersonation_logs` table:

```sql
SELECT 
  il.started_at,
  il.ended_at,
  il.reason,
  u.email as super_admin,
  c.name as target_company
FROM impersonation_logs il
JOIN users u ON il.super_admin_id = u.id
JOIN companies c ON il.target_company_id = c.id
ORDER BY il.started_at DESC;
```

### Row Level Security (RLS)

- Only super admins can view/create/update impersonation logs
- Regular users cannot access the `/admin` routes
- Server-side checks validate super admin status

### Best Practices

1. **Always provide a reason** when impersonating (e.g., "Investigating missing analytics data")
2. **End sessions promptly** after troubleshooting
3. **Review logs regularly** for compliance auditing
4. **Use only for legitimate troubleshooting** - all actions are logged

## API Endpoints

### POST `/api/admin/impersonate`

Start an impersonation session.

**Request:**
```json
{
  "companyId": "uuid",
  "reason": "Troubleshooting analytics display"
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": "uuid",
    "name": "Company Name",
    "slug": "company-slug"
  }
}
```

### DELETE `/api/admin/impersonate`

End the current impersonation session.

**Response:**
```json
{
  "success": true
}
```

### GET `/api/admin/companies`

Get all companies for the super admin dashboard.

**Response:**
```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "Company Name",
      "slug": "company-slug",
      "posthog_client_id": "client-123",
      "posthog_project_id": 12345,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "user_count": 5,
      "subscriptions": [
        {
          "id": "uuid",
          "status": "active",
          "plan_id": "premium",
          "trial_end": null,
          "current_period_end": "2025-02-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

## Database Schema

### `users` Table Changes

```sql
-- New column
is_super_admin BOOLEAN DEFAULT false
```

### `impersonation_logs` Table

```sql
CREATE TABLE impersonation_logs (
    id UUID PRIMARY KEY,
    super_admin_id UUID REFERENCES users(id),
    target_company_id UUID REFERENCES companies(id),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

## Troubleshooting

### Can't access `/admin`

- Verify you're logged in as proservices330@gmail.com
- Check `is_super_admin` flag: `SELECT is_super_admin FROM users WHERE email = 'proservices330@gmail.com'`
- Ensure the migration ran successfully

### Companies not showing

- Check the API response at `/api/admin/companies`
- Verify RLS policies allow super admin access
- Check browser console for errors

### Impersonation not working

- Clear browser cache and cookies
- Check that the company has `is_active = true`
- Verify the company has valid PostHog configuration

### Can't end impersonation

- Navigate directly to `/admin`
- Clear session: `DELETE /api/admin/impersonate`
- As last resort, log out and log back in

## File Structure

```
web/
├── app/
│   ├── admin/
│   │   └── page.tsx              # Super admin dashboard
│   ├── analytics/
│   │   └── page.tsx              # Updated with impersonation banner
│   ├── dashboard/
│   │   └── page.tsx              # Updated with super admin button
│   └── api/
│       └── admin/
│           ├── impersonate/
│           │   └── route.ts       # Impersonation API
│           └── companies/
│               └── route.ts       # Companies list API
└── lib/
    └── auth.ts                    # Auth helpers with super admin functions

database/
└── migrations/
    └── add_super_admin.sql        # Database migration
```

## Future Enhancements

- [ ] Activity log viewer in super admin dashboard
- [ ] Export impersonation logs to CSV
- [ ] Session timeout warnings
- [ ] Multi-factor authentication for super admins
- [ ] Impersonation permissions granularity (read-only vs full access)
- [ ] Slack/email notifications when impersonation starts
- [ ] Company health dashboard with automated issue detection

## Support

For issues or questions:
- Check the troubleshooting section above
- Review impersonation logs for clues
- Contact the development team with specific error messages
