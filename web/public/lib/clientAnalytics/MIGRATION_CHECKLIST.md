# Quick Migration Checklist: v1 → v2

## Pre-Migration

- [ ] **Backup current implementation**
  ```bash
  cp web/public/lib/clientAnalytics/askme-analytics-init.js web/public/lib/clientAnalytics/askme-analytics-init.js.backup
  ```

- [ ] **Document current configuration**
  - Note all `productConfig` settings
  - Note all `steps` definitions
  - Document any custom event handlers

## Migration Steps

### 1. Update HTML Script Tag

**Before**:
```html
<script src="/lib/clientAnalytics/askme-analytics-init.js"></script>
```

**After**:
```html
<script src="/lib/clientAnalytics/askme-analytics-init-v2.js"></script>
```

- [ ] Update script tag in HTML/JSP files
- [ ] Verify path is correct for your environment

### 2. Configuration (NO CHANGES NEEDED)

Your existing configuration works as-is:

```javascript
window.AskMeAnalyticsConfig = {
    // All existing settings work unchanged
    apiKey: 'phc_xxx',
    productConfig: { /* existing config */ },
    steps: [ /* existing steps */ ]
};
```

- [ ] Confirm configuration is loaded before init script
- [ ] No changes required to existing config

### 3. Test Basic Functionality

- [ ] **Load page in browser**
  - Open DevTools Console
  - Look for: `[init-v2] 🎉 AskMe Analytics v2.0 initialization complete`

- [ ] **Verify module loading**
  ```javascript
  // In browser console:
  console.log('PHUtils:', window.PHUtils);
  console.log('PHExtractors:', window.PHExtractors);
  console.log('PHEventCapture:', window.PHEventCapture);
  // All should be objects, not undefined
  ```

- [ ] **Check PostHog connection**
  ```javascript
  console.log('PostHog ready:', window.posthog?.__loaded);
  console.log('Queue length:', PHEventCapture?.getQueueLength());
  ```

### 4. Test Product Tracking

- [ ] **Navigate to pricing page**
- [ ] **Click pricing card button**
- [ ] **Check PostHog debugger** (bottom-left icon)
  - Event should appear: `subscription_click` or custom event name
  - Properties should include: product, price, currency, quantity

- [ ] **Verify metadata annotation**
  ```javascript
  // In browser console:
  document.querySelectorAll('[data-product]').forEach(btn => {
      console.log({
          product: btn.getAttribute('data-product'),
          price: btn.getAttribute('data-price'),
          currency: btn.getAttribute('data-currency')
      });
  });
  ```

### 5. Test Step Events

- [ ] **Navigate through funnel**
  - Pricing page → Dashboard → etc.
- [ ] **Check PostHog debugger**
  - Verify all step events fire: PRICING_PAGE_VIEWED, SUBSCRIPTION_PRODUCT_SELECTED, etc.
- [ ] **Test deduplication**
  - Refresh page → event should NOT fire again (if `oncePerPath: true`)
  - Navigate away and back → event should fire again

### 6. Test Dynamic Content

- [ ] **Toggle pricing interval** (monthly/yearly)
  - Prices should update
  - Button metadata should refresh
  - Check `data-price` attribute updates

- [ ] **Test SPA navigation** (if applicable)
  - Navigate without page reload
  - Verify events fire on route change
  - Check console for: `[ph-observers] Route changed: /old → /new`

## Post-Migration Validation

### Smoke Test Checklist

- [ ] All pricing buttons have `data-product`, `data-price`, `data-currency` attributes
- [ ] Clicking buttons fires product events in PostHog
- [ ] Step events fire at correct funnel stages
- [ ] No duplicate events (check PostHog event count)
- [ ] UTM parameters captured and attached to events
- [ ] No console errors or warnings
- [ ] Module loading completes successfully

### Performance Check

- [ ] Page load time unchanged (modules are small)
- [ ] No memory leaks (check DevTools Performance tab)
- [ ] Event queue flushes correctly when PostHog loads

## Rollback Plan

If issues occur:

1. **Revert script tag**:
   ```html
   <script src="/lib/clientAnalytics/askme-analytics-init.js"></script>
   ```

2. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Restore backup** (if needed):
   ```bash
   cp web/public/lib/clientAnalytics/askme-analytics-init.js.backup web/public/lib/clientAnalytics/askme-analytics-init.js
   ```

## Optional: Enable New Features

### Checkbox-Based Product Selection (Amazon-style)

Only if you need multi-product selection:

```javascript
window.AskMeAnalyticsConfig = {
    productConfig: {
        // ... existing config ...
        checkboxMode: true,
        checkboxItemSelector: '.product-item' // Container for each checkbox
    }
};
```

**Test**:
- [ ] Create test page with checkboxes
- [ ] Select multiple products
- [ ] Click single "Add to Cart" button
- [ ] Verify event fires with comma-separated products: `product1,product2`
- [ ] Verify total price calculated correctly

## Troubleshooting

### Issue: "Missing dependencies" error

**Fix**: Ensure modules load in correct order. Check console for:
```
[init-v2] ❌ Failed to load module: Utils from /lib/clientAnalytics/ph-utils.js
```

Verify file paths are correct.

### Issue: Events not firing

**Fix**:
1. Check PostHog connection: `console.log(window.posthog?.__loaded)`
2. Check queue: `console.log(PHEventCapture.getQueueLength())`
3. Enable debug: `window.AskMeAnalyticsConfig.debug = true`

### Issue: Product metadata not attached

**Fix**:
1. Check config selectors: `console.log(window.AskMeAnalyticsConfig.productConfig)`
2. Verify buttons are inside pricing containers
3. Check for console warnings: `[ph-injector] Failed to extract product data`

### Issue: Duplicate events

**Fix**:
1. Check `oncePerPath` setting in step rules
2. Clear sessionStorage: `sessionStorage.clear()`
3. Hard refresh page

## Success Criteria

✅ Migration complete when:

- [ ] All modules load without errors
- [ ] Product clicks fire events with correct metadata
- [ ] Step events fire at appropriate stages
- [ ] No duplicate events
- [ ] UTM tracking works
- [ ] SPA navigation works (if applicable)
- [ ] No console errors
- [ ] PostHog debugger shows expected events

## Next Steps After Migration

1. **Monitor PostHog for 24 hours**
   - Check event counts match expectations
   - Verify revenue tracking accuracy
   - Confirm funnel metrics unchanged

2. **Deploy to production**
   - Test in staging first
   - Deploy during low-traffic period
   - Monitor error logs

3. **Optimize** (optional)
   - Add client-specific extraction strategies
   - Create custom event handlers
   - Extend modules for new features

## Support

If you encounter issues:
1. Check `MODULAR_ARCHITECTURE_GUIDE.md` for detailed documentation
2. Review browser console for specific errors
3. Enable debug mode for verbose logging
4. Compare with v1 backup to identify differences
