# Digital Offerings Setup Guide

This guide will help you set up the digital offerings system for parishes, enabling parishioners to make one-time offerings via Stripe Checkout.

## Prerequisites

- Supabase project configured
- Stripe account (test or live)
- Next.js application running

## 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Stripe Configuration
# Get these from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (use sk_live_... for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key (use pk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_...  # Your Stripe webhook signing secret

# Next.js App URL (for redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Use your production URL in production

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### Getting Your Stripe Keys

1. **Stripe Secret Key**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers → API keys
   - Copy your "Secret key" (starts with `sk_test_` for test mode or `sk_live_` for production)

2. **Stripe Webhook Secret**:
   - Go to Developers → Webhooks
   - Create a new webhook endpoint (see step 4 below)
   - Copy the "Signing secret" (starts with `whsec_`)

## 2. Database Migrations

The offerings system requires the following database tables. These should already be created by migrations:

- `offerings` table (created in `20250202000000_create_offerings_table.sql`)
- `parishes` table with Stripe fields (updated in `20250202000001_add_stripe_to_parishes.sql`)

To apply migrations:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase Dashboard SQL Editor
```

## 3. Stripe Webhook Configuration

### For Development (Local Testing)

Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI if not already installed
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

The CLI will display a webhook signing secret. Use this as your `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### For Production

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_failed`
5. Copy the "Signing secret" and add it to your production environment variables

## 4. Configure Parish Stripe Accounts (Stripe Connect)

For production, you'll want to set up Stripe Connect so funds go directly to each parish's Stripe account:

### Option A: Standard Accounts (Recommended for Production)

1. Each parish creates their own Stripe account
2. Connect the parish's Stripe account to your platform using Stripe Connect
3. Store the connected account ID in the `parishes` table:
   ```sql
   UPDATE parishes 
   SET stripe_account_id = 'acct_...', 
       stripe_enabled = true 
   WHERE id = 'parish-uuid';
   ```

### Option B: Test Mode (Development)

For development, you can use your platform's Stripe account:
- Set `stripe_enabled = true` in the database
- Leave `stripe_account_id` as NULL (funds will go to your platform account)

## 5. Testing the System

### Test Cards

Use these Stripe test cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

### Test Flow

1. **As a Parishioner**:
   - Navigate to `/offerings`
   - Select a preset amount or enter custom amount
   - Add optional intention note
   - Click "Continue to Payment"
   - Complete payment with test card
   - Verify redirect to success page

2. **As an Admin**:
   - Navigate to `/donations`
   - Verify the offering appears in the list
   - Check totals are calculated correctly
   - Test CSV export functionality

### Test Webhook

1. Start Stripe CLI webhook forwarding (see step 3)
2. Complete a test payment
3. Verify the offering status updates from "pending" to "completed" in the database

## 6. Production Checklist

Before going live:

- [ ] Switch to Stripe live mode keys (`sk_live_...`)
- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Set up Stripe Connect accounts for each parish (if using)
- [ ] Test with real payment (small amount)
- [ ] Verify webhook events are being received
- [ ] Ensure RLS policies are correctly configured
- [ ] Review security settings and access controls

## 7. Troubleshooting

### Webhook Not Receiving Events

- Verify webhook URL is correct in Stripe Dashboard
- Check that `STRIPE_WEBHOOK_SECRET` matches the signing secret
- Ensure webhook endpoint is publicly accessible (not behind firewall)
- Check server logs for webhook errors

### Payments Not Completing

- Verify `stripe_enabled = true` for the parish
- Check Stripe Dashboard for payment errors
- Ensure Stripe account is in good standing
- Verify API keys are correct (test vs live)

### Offerings Not Appearing in Admin View

- Verify user has admin role (priest, secretary, or editor)
- Check RLS policies are correctly applied
- Ensure parish_id matches between user and offerings

## 8. Support

For issues or questions:
- Check Stripe Dashboard for payment details
- Review Supabase logs for database errors
- Check Next.js server logs for API errors

## Design Principles

This implementation follows:

✅ **Trust-first design**: Clear payment flow, transparent amounts  
✅ **Financial clarity**: Shows exact amounts, currency, and status  
✅ **No dark patterns**: No hidden fees, clear cancel option  
✅ **Simple one-time flow**: No recurring donations (Phase 2)  
✅ **No analytics dashboards**: Basic totals only (as requested)



