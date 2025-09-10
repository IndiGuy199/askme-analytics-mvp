# Database Setup

This directory contains the database schema and migration files for the AskMe Analytics MVP.

## Files

- `schema.sql` - Complete database schema with tables, indexes, and initial data
- `migrations/` - Database migration files (if you plan to use migrations)
- `seeds/` - Sample data for development/testing

## Setup Instructions

### PostgreSQL Setup

1. Install PostgreSQL (if not already installed)
2. Create a new database:
   ```sql
   CREATE DATABASE askme_analytics;
   ```

3. Run the schema file:
   ```bash
   psql -d askme_analytics -f database/schema.sql
   ```

### Environment Variables

Make sure your `.env` file includes:
```
DATABASE_URL=postgresql://username:password@localhost:5432/askme_analytics
```

### Using with Node.js

Install a PostgreSQL client like `pg`:
```bash
npm install pg
npm install --save-dev @types/pg  # if using TypeScript
```

### Database Connection

Create a database connection file in `src/config/database.js`:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
```

## Schema Overview

### Main Tables
- **clients** - Client configurations and PostHog settings
- **analytics_snapshots** - Historical KPI data storage
- **ai_insights** - AI-generated insights and recommendations
- **email_digests** - Email delivery tracking
- **query_configurations** - PostHog query configurations

### Views
- **latest_analytics_snapshots** - Most recent snapshot per client/date range
- **client_summary** - Overview of client activity and data

## Migration Strategy

If you need to modify the schema later:
1. Create migration files in `migrations/` directory
2. Use tools like `node-pg-migrate` or `knex.js` for schema changes
3. Always backup your database before running migrations
