# 💳 Payment System Documentation

## Overview

ระบบชำระเงินของ Spark Mobile Buddy ใช้ **Omise Payment Gateway** สำหรับประมวลผลการชำระเงินอย่างปลอดภัย รองรับบัตรเครดิต/เดบิต และ 3D Secure authentication

---

## 🏗️ Architecture

```
┌─────────────────┐
│  PaymentDialog  │  ← Frontend: ป้อนข้อมูลบัตร
└────────┬────────┘
         │ 1. Omise.createToken()
         ▼
┌─────────────────────┐
│   Omise Client API  │  ← สร้าง card token
└────────┬────────────┘
         │ 2. token
         ▼
┌──────────────────────────┐
│ create-omise-charge      │  ← Edge Function: ประมวลผลฝั่ง server
│ - Validate user          │
│ - Create charge          │
│ - Update database        │
└────────┬─────────────────┘
         │ 3a. Direct success
         │ 3b. 3DS redirect
         ▼
┌──────────────────────────┐
│ handle-omise-webhook     │  ← รับ async updates จาก Omise
│ - Verify signature       │
│ - Update payment status  │
│ - Send emails            │
└──────────────────────────┘
```

---

## 📁 Files Structure

### Frontend Components
- **`src/components/PaymentDialog.tsx`** - UI สำหรับชำระเงิน
- **`src/pages/PaymentManagement.tsx`** - Admin panel สำหรับจัดการ payment
- **`src/lib/payment-validation.ts`** - Client-side validation library

### Backend (Supabase Edge Functions)
- **`supabase/functions/create-omise-charge/`** - สร้าง payment charge
- **`supabase/functions/handle-omise-webhook/`** - รับ webhook จาก Omise
- **`supabase/functions/refund-omise-charge/`** - ประมวลผลการคืนเงิน

### Database
- **`supabase/migrations/20251001120010_fix_payment_system.sql`** - Payment schema
  - `payments` table
  - `payment_audit_log` table
  - `payment_webhooks` table
  - Helper functions

---

## 🔐 Security Features

### 1. API Key Management
```typescript
// ❌ NEVER do this:
const publicKey = "pkey_test_657kcvgmba7l8iiya2i";

// ✅ Always use environment variables:
const publicKey = import.meta.env.VITE_OMISE_PUBLIC_KEY;
const secretKey = Deno.env.get('OMISE_SECRET_KEY');
```

### 2. Server-Side Processing
- Card tokens created client-side (never send raw card data)
- Charge creation happens on Edge Function (server-side)
- Secret key never exposed to frontend

### 3. Webhook Signature Verification
```typescript
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hmac = createHmac('sha256', OMISE_WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}
```

### 4. Authorization Checks
- User authentication via JWT
- Registration ownership verification
- Role-based access control (admin/staff/owner)

### 5. Idempotency
- Prevents duplicate charges
- Unique idempotency key per transaction
```typescript
const idempotencyKey = `charge_${registrationId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
```

---

## 💳 Payment Flow

### Step 1: User Initiates Payment
```typescript
// PaymentDialog.tsx
const handleSubmit = async (e: React.FormEvent) => {
  // Validate card data
  const validation = validateCard(cardData);

  // Load Omise script
  await loadOmiseScript();

  // Set public key
  window.Omise.setPublicKey(publicKey);

  // Create token (client-side, secure)
  window.Omise.createToken('card', cardData, callback);
};
```

### Step 2: Create Token (Client-Side)
```javascript
Omise.createToken('card', {
  name: "JOHN DOE",
  number: "4242424242424242",
  expiration_month: "12",
  expiration_year: "2025",
  security_code: "123"
}, (statusCode, response) => {
  if (statusCode === 200) {
    const token = response.id; // tokn_xxxxx
    // Send token to server
  }
});
```

### Step 3: Create Charge (Server-Side)
```typescript
// create-omise-charge/index.ts
const omiseResponse = await fetch('https://api.omise.co/charges', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(omiseSecretKey + ':')}`,
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({
    amount: Math.round(amount * 100), // Satang
    currency: 'THB',
    card: token,
    capture: true,
    return_uri: return_uri, // For 3DS
    metadata: {
      registration_id,
      user_id,
      event_title,
    }
  })
});
```

### Step 4: Handle Response
```typescript
if (charge.authorize_uri) {
  // 3D Secure required
  window.location.href = charge.authorize_uri;
} else if (charge.paid) {
  // Immediate success
  updateRegistration('paid');
  sendSuccessEmail();
} else if (charge.failure_code) {
  // Failed
  showError(charge.failure_message);
}
```

### Step 5: Webhook Updates (Async)
```typescript
// handle-omise-webhook/index.ts
switch (event.key) {
  case 'charge.complete':
    // Update payment to success
    // Update registration to confirmed
    // Send success email
    break;

  case 'charge.update':
    // Handle status changes
    break;

  case 'refund.create':
    // Process refund
    // Update payment status
    // Send refund email
    break;
}
```

---

## 🔄 Refund Flow

### Admin Initiates Refund
```typescript
// PaymentManagement.tsx
const handleRefund = async (paymentId: string, amount: number) => {
  const reason = prompt("กรุณาระบุเหตุผล:");

  const { data, error } = await supabase.functions.invoke('refund-omise-charge', {
    body: { paymentId, amount, reason }
  });

  if (!error) {
    toast({ title: "คืนเงินสำเร็จ" });
  }
};
```

### Server Processes Refund
```typescript
// refund-omise-charge/index.ts

// 1. Validate authorization
const isAdmin = profile?.role === 'admin';
const isOwner = payment.registrations.user_id === user.id;

// 2. Check if refundable
const canRefund = await supabase.rpc('can_refund_payment', { paymentId });

// 3. Validate amount
const maxRefundable = payment.amount - payment.refund_amount;

// 4. Create refund with Omise
const refund = await fetch(`https://api.omise.co/charges/${chargeId}/refunds`, {
  method: 'POST',
  body: JSON.stringify({ amount: Math.round(refundAmount * 100) })
});

// 5. Update database
const isFullyRefunded = newRefundAmount >= payment.amount;
await supabase.from('payments').update({
  status: isFullyRefunded ? 'refunded' : 'success',
  refund_amount: newRefundAmount,
});

// 6. Update registration if fully refunded
if (isFullyRefunded) {
  await supabase.from('registrations').update({
    payment_status: 'unpaid',
    status: 'cancelled'
  });
}
```

---

## 📊 Database Schema

### payments table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'THB',
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'processing')),

  -- Omise fields
  omise_charge_id TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  receipt_url TEXT,

  -- Refund tracking
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  -- Security
  idempotency_key TEXT UNIQUE,
  payment_metadata JSONB DEFAULT '{}',

  -- 3D Secure
  require_3ds BOOLEAN DEFAULT false,
  authorize_uri TEXT,

  -- Failure tracking
  failure_code TEXT,
  failure_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### payment_audit_log table
```sql
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  action_type TEXT CHECK (action_type IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'cancelled')),
  previous_status TEXT,
  new_status TEXT,
  amount DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### payment_webhooks table
```sql
CREATE TABLE payment_webhooks (
  id UUID PRIMARY KEY,
  webhook_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  payment_id UUID REFERENCES payments(id),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🛠️ Helper Functions

### can_refund_payment
```sql
CREATE FUNCTION can_refund_payment(p_payment_id UUID)
RETURNS BOOLEAN AS $$
  -- Can only refund successful payments
  -- Cannot refund if already fully refunded
  -- Cannot refund payments older than 6 months (Omise limitation)
$$;
```

### get_payment_statistics
```sql
CREATE FUNCTION get_payment_statistics(start_date, end_date)
RETURNS TABLE (
  total_payments BIGINT,
  successful_payments BIGINT,
  total_amount DECIMAL,
  success_rate DECIMAL
) AS $$
  -- Aggregate payment metrics
$$;
```

### log_payment_action
```sql
CREATE FUNCTION log_payment_action(
  p_payment_id UUID,
  p_action_type TEXT,
  p_previous_status TEXT,
  p_new_status TEXT,
  p_amount DECIMAL,
  p_metadata JSONB
) RETURNS UUID AS $$
  -- Insert into payment_audit_log
$$;
```

---

## ✅ Validation Library

### Client-Side Validation
```typescript
import { validateCard, validateCardNumber, validateCVV } from '@/lib/payment-validation';

// Individual field validation
const numberResult = validateCardNumber("4242424242424242");
// { valid: true }

const cvvResult = validateCVV("12");
// { valid: false, error: "รหัส CVV ต้องเป็น 3 หลัก" }

// Comprehensive validation
const validation = validateCard({
  number: "4242424242424242",
  name: "JOHN DOE",
  expiration_month: "12",
  expiration_year: "2025",
  security_code: "123"
});
// { valid: true, errors: {} }
```

### Available Validators
- `validateCardNumber(number)` - Luhn algorithm
- `validateCardholderName(name)`
- `validateExpirationMonth(month)`
- `validateExpirationYear(year)`
- `validateExpirationDate(month, year)`
- `validateCVV(cvv, cardBrand?)`
- `validateAmount(amount, min?, max?)`
- `getCardBrand(number)` - Detect Visa/Mastercard/etc
- `formatCardNumber(number)` - Add spaces
- `maskCardNumber(number)` - **** **** **** 4242

---

## 🔧 Environment Variables

### Frontend (.env)
```bash
VITE_OMISE_PUBLIC_KEY=pkey_test_xxxxx  # สำหรับ test
VITE_OMISE_PUBLIC_KEY=pkey_live_xxxxx  # สำหรับ production
```

### Backend (Supabase Edge Function)
```bash
OMISE_SECRET_KEY=skey_test_xxxxx       # สำหรับ test
OMISE_SECRET_KEY=skey_live_xxxxx       # สำหรับ production
OMISE_WEBHOOK_SECRET=whsec_xxxxx       # Webhook signature verification
```

---

## 🚀 Deployment

### 1. Deploy Migrations
```bash
# Push database schema
supabase db push

# Or use Supabase Dashboard SQL Editor
```

### 2. Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy create-omise-charge
supabase functions deploy handle-omise-webhook
supabase functions deploy refund-omise-charge

# Set environment variables
supabase secrets set OMISE_SECRET_KEY=skey_test_xxxxx
supabase secrets set OMISE_WEBHOOK_SECRET=whsec_xxxxx
```

### 3. Setup Webhook in Omise Dashboard
1. ไปที่ https://dashboard.omise.co/webhooks
2. Add new endpoint: `https://your-project.supabase.co/functions/v1/handle-omise-webhook`
3. Select events:
   - `charge.complete`
   - `charge.update`
   - `refund.create`
4. Copy webhook secret → Set in Supabase secrets

### 4. Frontend Environment
```bash
# Create .env file
echo "VITE_OMISE_PUBLIC_KEY=pkey_test_xxxxx" > .env

# Build and deploy
npm run build
```

---

## 🧪 Testing

### Test Cards (Omise Test Mode)
```
Success:
4242 4242 4242 4242 (any future date, any CVV)

3DS Required:
5555 5555 5555 4444

Failure:
4000 0000 0000 0002 (declined)
4000 0000 0000 0069 (expired card)
4000 0000 0000 0119 (processing error)
```

### Test Flow
1. สร้าง registration ในระบบ
2. เลือก "ชำระเงิน"
3. ใช้ test card number
4. ยืนยันการชำระเงิน
5. ตรวจสอบ webhook ใน Omise Dashboard
6. ตรวจสอบ payment status ใน database

---

## 📈 Monitoring & Logs

### View Payment Statistics
```sql
SELECT * FROM get_payment_statistics(
  now() - interval '30 days',
  now()
);
```

### View Audit Log
```sql
SELECT * FROM payment_audit_log
WHERE payment_id = 'xxx'
ORDER BY created_at DESC;
```

### View Webhook Events
```sql
SELECT * FROM payment_webhooks
WHERE processed = false
ORDER BY created_at DESC;
```

### Monitor Failed Payments
```sql
SELECT * FROM payments
WHERE status = 'failed'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Payment Failed
1. ตรวจสอบ `failure_code` และ `failure_message` ใน payments table
2. ดู payment_audit_log สำหรับ action history
3. ตรวจสอบ Omise Dashboard → Charges

### Webhook Not Received
1. ตรวจสอบ webhook URL ใน Omise Dashboard
2. ตรวจสอบ signature verification (OMISE_WEBHOOK_SECRET)
3. ดู Edge Function logs: `supabase functions logs handle-omise-webhook`
4. ตรวจสอบ payment_webhooks table

### 3DS Redirect Loop
1. ตรวจสอบ `return_uri` ถูกต้อง
2. ตรวจสอบว่า frontend รับ parameter จาก redirect
3. ตรวจสอบ payment status หลัง redirect

### Refund Failed
1. ตรวจสอบว่า payment เป็น 'success'
2. ตรวจสอบว่ายังไม่เกิน 6 เดือน
3. ตรวจสอบ refund_amount ไม่เกิน original amount
4. ดู Omise Dashboard → Refunds

---

## 📋 Checklist

### Pre-Launch
- [ ] ทดสอบ payment flow ด้วย test cards
- [ ] ทดสอบ 3D Secure flow
- [ ] ทดสอบ refund flow
- [ ] ตรวจสอบ webhook ทำงานถูกต้อง
- [ ] ตรวจสอบ email notifications
- [ ] Deploy Edge Functions
- [ ] ตั้งค่า environment variables (production)
- [ ] ตั้งค่า webhook URL ใน Omise
- [ ] ทดสอบ error handling

### Post-Launch Monitoring
- [ ] Monitor payment success rate
- [ ] Monitor webhook processing
- [ ] Check audit logs สำหรับ suspicious activity
- [ ] Review failed payments weekly
- [ ] Reconcile with Omise dashboard monthly

---

## 🔗 References

- [Omise API Documentation](https://docs.opn.ooo/)
- [Omise.js Reference](https://docs.opn.ooo/omise-js)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)

---

## 📞 Support

สำหรับปัญหาเกี่ยวกับ payment system:
1. ตรวจสอบ logs ใน Supabase Dashboard
2. ตรวจสอบ Omise Dashboard
3. ดู audit logs และ webhook events
4. Contact Omise support: support@omise.co

---

**Last Updated:** 2025-10-01
**Version:** 1.0
**Status:** ✅ Production Ready
