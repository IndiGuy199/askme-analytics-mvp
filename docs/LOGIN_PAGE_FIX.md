# Quick Fix: Add Terms & Conditions to Login Page

## Problem
The login page doesn't have the Terms & Conditions checkbox, so users can sign up without consent.

## Solution: Manual Edit Required

Due to file editing conflicts, please manually add these changes to `web/app/login/page.tsx`:

### Step 1: Add Import (Line 9)
After the lucide-react import, add:
```typescript
import TermsModal from '@/components/TermsModal'
```

### Step 2: Add State Variables (After line 15)
After `const [error, setError] = useState('')`, add:
```typescript
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
```

### Step 3: Add Validation (After line 19, inside handleSignIn function)
After `if (!email) return`, add:
```typescript
    if (!termsAccepted) {
      setError('You must accept the Terms and Conditions to continue')
      return
    }
```

### Step 4: Record Consent (After line 36, in the else block)
Replace:
```typescript
    } else {
      setIsSuccess(true)
    }
```

With:
```typescript
    } else {
      try {
        await fetch('/api/consent/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, termsVersion: '1.0' })
        })
      } catch (err) {
        console.error('Failed to record consent:', err)
      }
      setIsSuccess(true)
    }
```

### Step 5: Add Checkbox (After email input, before error display - around line 118)
After the `</div>` that closes the email input div, add:
```tsx
                {/* Terms and Conditions Checkbox */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed cursor-pointer flex-1">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                    >
                      Terms and Conditions
                    </button>
                    {' '}and consent to the collection and sharing of my data (including email) with PostHog for analytics purposes.
                  </label>
                </div>
```

### Step 6: Update Button Disabled (Around line 131)
Change:
```tsx
disabled={isLoading || !email}
```

To:
```tsx
disabled={isLoading || !email || !termsAccepted}
```

### Step 7: Add Disabled Styles (Same line)
Add to the className:
```tsx
disabled:opacity-50 disabled:cursor-not-allowed
```

### Step 8: Add Modal Component (Before the closing `</div>` and `</div>` at the end, around line 189)
Before the final `</div>` that closes the main container, add:
```tsx
      {/* Terms Modal */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setTermsAccepted(true)
          setShowTermsModal(false)
        }}
        showAcceptButton={true}
      />
```

## Testing After Changes

1. Save the file
2. Go to http://localhost:3000/login
3. Try to click "Send magic link" without checking the box → Should show error
4. Click the "Terms and Conditions" link → Modal should open
5. Read terms, click "I Accept" button in modal → Checkbox should be checked, modal closes
6. Now click "Send magic link" → Should work and record consent in database

## Alternative: Use Pre-Made File

If manual editing is too tedious, I can provide you with a complete pre-made file. Just let me know!
