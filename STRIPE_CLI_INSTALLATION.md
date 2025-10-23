# Installing Stripe CLI on Windows - Manual Instructions

## ✅ Fixed Issue: SQL View Error

The error `column "plan_id" specified more than once` occurred because both `payment_transactions` and `subscriptions` tables have a `plan_id` column. I've fixed this by:
- Explicitly listing all columns from `payment_transactions`
- Renaming `s.plan_id` to `subscription_plan_id` to avoid conflict

**The migration file has been updated and is now ready to run!**

---

## 📦 Installing Stripe CLI on Windows

Since automated installation methods aren't working, here are the **manual installation steps**:

### Method 1: Direct Download (Recommended)

1. **Download Stripe CLI:**
   - Go to: https://github.com/stripe/stripe-cli/releases/latest
   - Download: `stripe_X.X.X_windows_x86_64.zip` (latest version)
   - Or use this direct link: https://github.com/stripe/stripe-cli/releases

2. **Extract the ZIP file:**
   ```powershell
   # Create a directory for Stripe CLI
   New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\stripe" -Force
   
   # Extract the downloaded ZIP to this folder
   # (You can use Windows Explorer to extract to C:\Users\YourName\AppData\Local\stripe)
   ```

3. **Add to PATH:**
   ```powershell
   # Add Stripe CLI to your PATH (PowerShell as Administrator)
   $stripePath = "$env:LOCALAPPDATA\stripe"
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
   if ($currentPath -notlike "*$stripePath*") {
       [Environment]::SetEnvironmentVariable("Path", "$currentPath;$stripePath", "User")
       Write-Host "✅ Added Stripe CLI to PATH. Please restart your terminal."
   }
   ```

4. **Verify Installation:**
   ```powershell
   # Close and reopen PowerShell, then run:
   stripe --version
   ```

### Method 2: Using Scoop (Package Manager)

If you have Scoop installed:

```powershell
# Install Scoop if you don't have it
# Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
# irm get.scoop.sh | iex

# Add Stripe bucket and install
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### Method 3: Using Chocolatey

If you have Chocolatey:

```powershell
choco install stripe-cli
```

---

## 🚀 After Installation: Quick Start

Once Stripe CLI is installed, follow these steps:

### 1. Login to Stripe:
```powershell
stripe login
```
This will open your browser to authenticate.

### 2. Forward Webhooks to Local Server:

**Start your Next.js dev server first:**
```powershell
cd web
npm run dev
```

**Then in a NEW terminal, forward webhooks:**
```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**You'll see output like:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### 3. Update Your .env.local:

Copy the webhook secret from step 2 and update:

```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### 4. Restart Dev Server:

After updating `.env.local`, restart your dev server:
```powershell
# Press Ctrl+C to stop
# Then restart:
npm run dev
```

---

## 🧪 Testing Webhooks

Keep both terminals running:
- **Terminal 1:** Next.js dev server (`npm run dev`)
- **Terminal 2:** Stripe webhook forwarder (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)

When you make a test payment:
1. Terminal 2 will show webhook events being forwarded
2. Terminal 1 will show your webhook handler logs
3. Database will record the payment transaction

---

## 🔍 Verify Stripe CLI Installation

After installation, verify it works:

```powershell
# Check version
stripe --version

# Test connection
stripe config --list

# View available commands
stripe --help
```

---

## 📝 Common Commands

```powershell
# Login (first time setup)
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger specific webhook events (for testing)
stripe trigger payment_intent.succeeded
stripe trigger checkout.session.completed

# View recent events
stripe events list --limit 10

# View logs
stripe logs tail

# Test API calls
stripe customers list --limit 5
```

---

## 🐛 Troubleshooting

### "stripe: command not found"
- Make sure you added Stripe CLI to your PATH
- Restart your terminal/PowerShell
- Verify the stripe.exe file exists in the installation directory

### "Authentication required"
- Run `stripe login` first
- This connects the CLI to your Stripe account

### Webhooks not receiving events
- Ensure `stripe listen` is running in a separate terminal
- Check that webhook secret matches in `.env.local`
- Restart dev server after changing `.env.local`

---

## ✅ Next Steps After Installation

1. ✅ **Run the Fixed Migration:**
   - The SQL view error is now fixed
   - Run `create_payment_transactions.sql` in Supabase SQL Editor

2. ✅ **Get Correct Price IDs:**
   - Go to Stripe Dashboard (Test Mode)
   - Create products and get `price_*` IDs (not `prod_*`)
   - Update `.env.local`

3. ✅ **Start Testing:**
   - Follow the main STRIPE_TESTING_GUIDE.md
   - Make test payment with card `4242 4242 4242 4242`
   - Verify transaction recorded in database

---

## 📚 Resources

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Download Page:** https://github.com/stripe/stripe-cli/releases
- **Test Cards:** https://stripe.com/docs/testing#cards
- **Webhook Events:** https://stripe.com/docs/api/events/types

---

**Need Help?**
If you encounter issues:
1. Check Stripe CLI is in PATH: `stripe --version`
2. Verify authentication: `stripe config --list`
3. Check webhook is running: Look for "Ready!" message in terminal
4. Review logs in both terminals for errors
