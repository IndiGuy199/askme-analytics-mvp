# Client Configuration Files

This directory contains client-specific configuration files for AskMe Analytics.

## Usage

Each client has a JSON configuration file that defines their analytics setup. The universal init script (`askme-analytics-init.js`) loads these configs dynamically based on the `clientId`.

## File Naming Convention

```
{clientId}.json
```

Examples:
- `ask-me-ltp.json` - Leisure Time Passport client
- `askme-analytics-app.json` - Default AskMe Analytics application
- `client-name.json` - Your client name

## Configuration Schema

```json
{
  "clientId": "string (required)",
  "debug": "boolean (optional, default: false)",
  "apiKey": "string (required)",
  "apiHost": "string (required)",
  "autocapture": "boolean (optional, default: true)",
  "useBuiltInPageview": "boolean (optional, default: true)",
  "capture_pageview": "boolean (optional, default: true)",
  "capture_pageleave": "boolean (optional, default: true)",
  "enableCustomDomTracking": "boolean (optional, default: false)",
  "preferCustomOverAutocapture": "boolean (optional, default: false)",
  "emailSelectors": "string (optional, CSS selector)",
  "analyticsLibraryPath": "string (required, URL or path)",
  "constantsPath": "string (required, URL or path)",
  "injectorPath": "string (required, URL or path)",
  "productConfig": {
    "eventName": "string (required)",
    "pageMatch": "string (required, URL pattern)",
    "panelClass": "string (optional)",
    "panelSelector": "string (optional)",
    "titleClass": "string (optional)",
    "titleSelector": "string (optional)",
    "priceClass": "string (optional)",
    "priceSelector": "string (optional)",
    "productButtonSelectors": "string (required)"
  },
  "steps": [
    {
      "key": "string (required, step key from PH_KEYS)",
      "url": "string (required, URL pattern)",
      "urlMatch": "string (required: 'exact' | 'contains' | 'regex')",
      "autoFire": "boolean (required)",
      "oncePerPath": "boolean (optional)",
      "selector": "string (optional, CSS selector)",
      "requireSelectorPresent": "boolean (optional)"
    }
  ]
}
```

## Adding a New Client

1. Copy an existing config file:
   ```bash
   cp ask-me-ltp.json your-client-id.json
   ```

2. Edit the new file with client-specific settings:
   - Update `clientId`
   - Configure `productConfig` for their pricing page structure
   - Define `steps` for their conversion funnel

3. Provide client with integration code:
   ```html
   <script>
     window.AskMeAnalyticsClientId = 'your-client-id';
   </script>
   <script src="https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/askme-analytics-init.js"></script>
   ```

4. Test the configuration:
   - Load client's site with the script
   - Check browser console for initialization logs
   - Verify events in PostHog dashboard

## Path Types

### Relative Paths (for internal clients)
```json
"analyticsLibraryPath": "/lib/clientAnalytics/ask-me-analytics.min.js"
```
Use for clients hosted on the same domain as the analytics server.

### Absolute URLs (for external clients)
```json
"analyticsLibraryPath": "https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ask-me-analytics.min.js"
```
Use for clients hosted on different domains (recommended for most clients).

## Configuration Inheritance

If a config file is not found or fails to load, the init script falls back to:
1. Inline `window.AskMeAnalyticsConfig` (if defined)
2. Default config with basic settings

## Validation

Before deploying a new config:

1. **JSON Syntax**: Validate JSON structure
   ```bash
   cat your-client-id.json | jq .
   ```

2. **Required Fields**: Ensure all required fields are present
   - `clientId`
   - `apiKey`
   - `apiHost`
   - `analyticsLibraryPath`
   - `constantsPath`
   - `injectorPath`

3. **URL Patterns**: Test URL patterns match client's actual URLs

4. **CSS Selectors**: Verify selectors exist on client's pages

## Troubleshooting

### Config Not Loading

Check browser console for:
```
⚠️ Config not found for {clientId}, using defaults
```

**Solution**: Verify config file name matches `clientId` exactly.

### Product Tracking Not Working

1. Verify `pageMatch` pattern matches current URL
2. Check that CSS selectors exist on the page
3. Ensure `productButtonSelectors` targets the correct buttons

### Step Events Not Firing

1. Check `url` pattern matches the actual page URL
2. Verify `selector` exists if `requireSelectorPresent` is true
3. Check `autoFire` is set to `true` for automatic tracking

## Example Configurations

### Minimal Config (Basic Tracking Only)

```json
{
  "clientId": "minimal-client",
  "apiKey": "phc_xxx",
  "apiHost": "https://us.i.posthog.com",
  "analyticsLibraryPath": "https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ask-me-analytics.min.js",
  "constantsPath": "https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ph-constants.js",
  "injectorPath": "https://askme-analytics-mvp.vercel.app/lib/clientAnalytics/ph-product-injector.js"
}
```

### Full Config (All Features)

See `ask-me-ltp.json` or `askme-analytics-app.json` for complete examples.

## Version Control

All config changes should be:
1. Committed to git
2. Reviewed via pull request
3. Tested on staging before production deploy

## Security Notes

- Never commit API keys for production environments
- Use environment-specific configs (dev, staging, prod)
- Rotate API keys regularly

## Support

For questions about configuration:
- Check the main `CLIENT_CONFIGURATION_GUIDE.md` in the project root
- Review console logs during initialization
- Contact the analytics team
