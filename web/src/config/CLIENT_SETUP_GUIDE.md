# Client Setup Guide

## Overview

The analytics system now supports **automatic client configuration**. You don't need to add every client to `clients.js` if they only use standard metrics!

## When to Add a Client to `clients.js`

### ✅ Add to CLIENTS array ONLY if you need:

1. **Custom Funnel Queries** - Beyond standard metrics (e.g., `profileFunnel`, `renewalFunnel`)
2. **Specific API Keys** - Direct PostHog integration with `projectId` and `apiKey`
3. **Custom Names** - Display name different from client ID
4. **Special Configuration** - Any non-standard settings

### ❌ Don't Add to CLIENTS array if:

- Client only needs standard metrics (traffic, lifecycle, retention, device mix, geography, etc.)
- Client uses database-stored PostHog credentials
- Client has no custom funnels or queries

## Usage Examples

### Example 1: Simple Client (No Configuration Needed!)

Just use the component with any `clientId`:

```tsx
// No need to add 'new-client-123' to clients.js!
<SimpleAnalyticsCard clientId="new-client-123" dateRange="30d" />
```

The system will automatically:
- Generate all standard queries with `client_id = 'new-client-123'` filtering
- Return all standard metrics (12 query templates)
- Work without any configuration

### Example 2: Client with Custom Funnels

If you need custom queries, add to `clients.js`:

```javascript
{
  clientId: 'e-commerce-app',
  name: 'E-Commerce Platform',
  queries: {
    // ✅ Get all standard queries automatically
    ...generateStandardQueries('e-commerce-app'),
    
    // ✅ Add custom funnels
    checkoutFunnel: {
      query: {
        kind: "InsightVizNode",
        source: {
          kind: "FunnelsQuery",
          series: [
            { kind: "EventsNode", event: "product_viewed" },
            { kind: "EventsNode", event: "add_to_cart" },
            { kind: "EventsNode", event: "checkout_started" },
            { kind: "EventsNode", event: "purchase_completed" }
          ]
        }
      }
    }
  }
}
```

### Example 3: Multiple Unconfigured Clients

All of these work without configuration:

```tsx
<SimpleAnalyticsCard clientId="marketing-site" />
<SimpleAnalyticsCard clientId="mobile-app" />
<SimpleAnalyticsCard clientId="admin-portal" />
```

Each will automatically get standard queries filtered by their respective `client_id`.

## Standard Queries Available

When you use `generateStandardQueries(clientId)` or rely on automatic configuration, you get:

1. **traffic** - Daily active users & page views
2. **lifecycle** - New, Returning, Resurrecting, Dormant users
3. **retention** - 7-day & 30-day retention rates
4. **deviceMix** - Desktop/Mobile/Tablet breakdown (with DAU math)
5. **geography** - World map by country
6. **cityGeography** - Top cities breakdown
7. **pages** - Most visited pages
8. **referringSources** - Traffic sources
9. **newUsers** - New user count
10. **returningUsers** - Returning user count
11. **pageviews** - Total page views
12. **uniqueUsers** - Unique visitor count

## Benefits

✅ **Zero Configuration** - New clients work immediately  
✅ **Consistent Metrics** - All clients use same standard queries  
✅ **Easy Maintenance** - Update templates once, all clients benefit  
✅ **Flexibility** - Add custom queries only when needed  
✅ **Type Safety** - Automatic client_id filtering prevents data leaks  

## Migration Path

If you currently have clients like this:

```javascript
// OLD - Unnecessarily verbose
{
  clientId: 'simple-client',
  queries: {
    ...generateStandardQueries('simple-client')
  }
}
```

You can **remove them entirely**! Just use:

```tsx
<SimpleAnalyticsCard clientId="simple-client" />
```

## Checking Configuration

Use the helper function to check if a client has custom queries:

```javascript
import { hasCustomQueries } from '@/src/config/clients';

if (hasCustomQueries('ask-me-ltp')) {
  console.log('Client has custom funnels configured');
} else {
  console.log('Client uses only standard queries');
}
```

## Summary

**Before:** Every client needed explicit configuration in `clients.js`  
**Now:** Only configure clients with custom needs; others work automatically!
