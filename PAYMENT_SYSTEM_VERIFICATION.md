# Payment System Verification Guide

## Overview

The RULELAB platform includes a complete payment distribution and transaction tracking system that automatically allocates funds when users purchase paid rules.

## System Architecture

### Components

1. **Billing Model** (`src/models/Billing.js`)
   - Stores user account balances
   - Tracks total earnings and withdrawals
   - Links to withdrawal requests and bank account info
   - Maintains separate accounts for ADMIN and USER roles

2. **BillingTransaction Model** (`src/models/BillingTransaction.js`)
   - Records every financial event
   - Types: PURCHASE_EARNINGS, ADMIN_COMMISSION, WITHDRAWAL, REFUND, ADJUSTMENT, BONUS
   - Links to original transactions and purchases for audit trail
   - Status tracking: PENDING, COMPLETED, FAILED, REVERSED

3. **Billing Service** (`src/services/billingService.js`)
   - `distributePurchaseEarnings()` - Core payment split logic
   - Automatically calculates 10% admin commission, 90% seller earnings
   - Creates billing transactions for both parties
   - Updates account balances

4. **Transaction Controller** (`src/controllers/transactionController.js`)
   - `purchaseRule()` - Handles rule purchase
   - Calls billing service for automatic fund distribution
   - Creates notifications for buyer and seller

## Payment Flow

### Step 1: User Purchases a Paid Rule

```
User1 buys Rule from User2
↓
/api/v1/transactions/purchase [POST]
  - ruleId: "rule_id"
  - paymentMethodId: "method_id" (optional for mock)
```

### Step 2: Payment Processing

```
Transaction Controller:
  1. Validates rule exists and is PAID type
  2. Checks user hasn't already purchased
  3. Checks user isn't buying own rule
  4. Creates Transaction record (COMPLETED status for mock)
  5. Creates Purchase record with license key
  6. Updates rule statistics
  7. → Calls distributePurchaseEarnings()
```

### Step 3: Automatic Fund Distribution

```
Billing Service - distributePurchaseEarnings():
  
  Input: { purchaseId, transactionId, sellerId, amount }
  
  1. Validates inputs
  2. Gets ADMIN user from database
  3. Calculates splits:
     - Admin Commission: amount × 10%
     - Seller Earnings: amount × 90%
  
  4. Creates 2 BillingTransaction records:
     ├─ Admin: type="ADMIN_COMMISSION", amount=adminCommission
     └─ Seller: type="PURCHASE_EARNINGS", amount=sellerEarnings
  
  5. Updates Billing accounts:
     ├─ Admin: balance += commission, totalEarnings += commission
     └─ Seller: balance += earnings, totalEarnings += earnings
  
  6. Links transactions to related purchase/transaction
```

### Step 4: Notifications

```
Notifications created for:
  - Seller: "Your rule was purchased"
  - Buyer: "Purchase successful"
  
Both include:
  - Transaction ID
  - Rule ID
  - Earnings amount (for seller)
  - License key (for buyer)
```

## Commission Structure

**Current Split: 10% Admin / 90% Seller**

Example:
```
Purchase Amount: $100
├─ Admin Commission: $10 (10%)
└─ Seller Earnings: $90 (90%)

ADMIN billing account:
  - balance += $10
  - totalEarnings += $10

Seller billing account:
  - balance += $90
  - totalEarnings += $90
```

## Transaction Tracking

### Available Endpoints

**User Endpoints:**

```
GET /api/v1/billing/my-account
  Returns: User's current balance, total earnings, withdrawal info
  
GET /api/v1/billing/my-stats
  Returns: This month, last month, this week, last week earnings
  
GET /api/v1/billing/my-transactions
  Returns: All billing transactions (paginated)
  Query params: ?page=1&limit=20&type=&status=
  
GET /api/v1/billing/earnings-report?period=month
  Returns: Daily earnings breakdown
  Period options: week, month, year
  
GET /api/v1/billing/commission-config
  Returns: Current commission percentages (public endpoint)
  
GET /api/v1/billing/withdrawals/my-requests
  Returns: User's withdrawal requests
```

**Admin Endpoints:**

```
GET /api/v1/billing/admin/overview
  Returns: Total platform revenue, transaction counts, admin balance
  
GET /api/v1/billing/admin/withdrawals
  Returns: All user withdrawal requests
  
POST /api/v1/billing/admin/withdrawals/:id/process
  Body: { action: "APPROVE"|"REJECT", note: "reason" }
  
POST /api/v1/billing/admin/withdrawals/:id/complete
  Mark withdrawal as completed
```

### Transaction Types

```
PURCHASE_EARNINGS  - Rule seller's earnings from a purchase
ADMIN_COMMISSION   - Admin's commission from a purchase
WITHDRAWAL         - User withdrawing funds
REFUND             - Refund of purchase
ADJUSTMENT         - Admin manual balance adjustment
BONUS              - Admin bonus reward
```

## Verification Steps

### 1. Pre-Purchase Setup

```bash
# Make sure you have:
✓ Backend running on localhost:5000
✓ Frontend running with proxy to /api → localhost:5000
✓ User logged in
✓ At least 2 users (buyer and seller)
✓ A paid rule from seller
```

### 2. Verify Billing Accounts Exist

```javascript
// Check in MongoDB console
db.billings.find()

Expected output:
[
  { user: ObjectId("seller_id"), balance: 0, totalEarnings: 0, ... },
  { user: ObjectId("buyer_id"), balance: 0, totalEarnings: 0, ... },
  { user: ObjectId("admin_id"), balance: 0, totalEarnings: 0, ... }
]
```

### 3. View Initial Balances

```javascript
// GET /api/v1/billing/my-account

Response (Seller before purchase):
{
  "success": true,
  "data": {
    "billing": {
      "_id": "...",
      "user": "seller_id",
      "balance": 0,
      "totalEarnings": 0,
      "totalWithdrawals": 0,
      "currency": "USD",
      "isActive": true,
      ...
    }
  }
}
```

### 4. Execute Purchase

```javascript
// POST /api/v1/transactions/purchase
// Headers: Authorization: Bearer {token}
// Body: { ruleId: "rule_id" }

Response:
{
  "success": true,
  "data": {
    "transaction": {
      "_id": "tx_id",
      "buyer": "buyer_id",
      "seller": "seller_id",
      "rule": "rule_id",
      "amount": 100,
      "status": "COMPLETED",
      "platformFee": 10,
      "sellerEarnings": 90,
      "metadata": {
        "billingDistribution": {
          "adminCommission": { "amount": 10 },
          "sellerEarnings": { "amount": 90 },
          "distributedAt": "2026-01-22T..."
        }
      }
    },
    "purchase": {
      "_id": "...",
      "user": "buyer_id",
      "rule": "rule_id",
      "licenseKey": "ABCDEF..."
    }
  }
}
```

### 5. Verify Balances Updated

**For Seller (after $100 purchase):**

```javascript
// GET /api/v1/billing/my-account (as seller)

Response:
{
  "billing": {
    "balance": 90,        // ← Updated!
    "totalEarnings": 90,  // ← Updated!
    "totalWithdrawals": 0
  }
}
```

**For Admin (after $100 purchase):**

```javascript
// GET /api/v1/billing/my-account (as admin)

Response:
{
  "billing": {
    "balance": 10,        // ← Updated!
    "totalEarnings": 10,  // ← Updated!
    "totalWithdrawals": 0
  }
}
```

**For Buyer:**

```javascript
// GET /api/v1/billing/my-account (as buyer)

Response:
{
  "billing": {
    "balance": 0,         // ← No change
    "totalEarnings": 0,   // ← No change
    "totalWithdrawals": 0
  }
}
```

### 6. Check Transaction History

```javascript
// GET /api/v1/billing/my-transactions?limit=10 (as seller)

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "...",
        "billing": "seller_billing_id",
        "user": "seller_id",
        "type": "PURCHASE_EARNINGS",  // ← Seller earning
        "amount": 90,
        "status": "COMPLETED",
        "description": "Earnings from rule purchase",
        "relatedPurchase": "purchase_id",
        "createdAt": "2026-01-22T..."
      }
    ],
    "pagination": { "total": 1, "page": 1, "pages": 1 }
  }
}
```

```javascript
// GET /api/v1/billing/my-transactions?type=ADMIN_COMMISSION (as admin)

Response:
{
  "transactions": [
    {
      "type": "ADMIN_COMMISSION",  // ← Admin commission
      "amount": 10,
      "status": "COMPLETED",
      "metadata": {
        "commissionPercent": 10,
        "originalAmount": 100
      }
    }
  ]
}
```

### 7. Verify Earnings Report

```javascript
// GET /api/v1/billing/earnings-report?period=month (as seller)

Response:
{
  "success": true,
  "data": {
    "period": "month",
    "daily": [
      {
        "date": "2026-01-22",
        "amount": 90,
        "transactions": 1
      }
    ]
  }
}
```

### 8. Check Commission Configuration

```javascript
// GET /api/v1/billing/commission-config (public endpoint)

Response:
{
  "success": true,
  "data": {
    "config": {
      "adminCommissionPercent": 10,
      "sellerPercentage": 90
    }
  }
}
```

## Testing Scenarios

### Scenario 1: Single Purchase

```
1. Seller: 0 → 90
2. Admin: 0 → 10
3. Buyer: 0 → 0 (unchanged)
4. Total transferred: 100
```

### Scenario 2: Multiple Purchases

```
Purchase 1: $100
├─ Seller gets: 90
└─ Admin gets: 10

Purchase 2: $50
├─ Seller gets: 45
└─ Admin gets: 5

After 2 purchases:
├─ Seller balance: 135
├─ Admin balance: 15
└─ Total platform revenue: 150
```

### Scenario 3: Multiple Sellers

```
Buyer purchases:
- Rule A from Seller1: $100 → S1:90, Admin:10
- Rule B from Seller2: $100 → S2:90, Admin:10

Results:
├─ Seller1 balance: 90
├─ Seller2 balance: 90
├─ Admin balance: 20
└─ Total: 200
```

## Troubleshooting

### Issue: Balance Not Updating After Purchase

**Possible Causes:**

1. **ADMIN user not found**
   ```bash
   # Check in MongoDB
   db.users.findOne({ role: "ADMIN" })
   # If null, create one:
   db.users.updateOne(
     { email: "admin@rulelab.com" },
     { $set: { role: "ADMIN" } }
   )
   ```

2. **Billing accounts not created**
   ```bash
   # Check
   db.billings.find()
   # Should have entries for buyer, seller, and admin
   ```

3. **BillingTransaction not created**
   ```bash
   # Check
   db.billingtransactions.find()
   # Should see PURCHASE_EARNINGS and ADMIN_COMMISSION records
   ```

4. **Frontend not getting updated data**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Refresh page (Ctrl+R)
   - Check Console tab for errors
   - Verify token is in localStorage

### Issue: Frontend Returning HTML Instead of JSON

**Solution:** Ensure Vite proxy is configured correctly

File: `rule-guardian/vite.config.ts`
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
},
```

After changing, restart frontend:
```bash
# Kill existing process
Get-Process -Name node | Stop-Process -Force

# Restart
npm run dev
```

## Database Structure

### Billing Collection

```javascript
{
  "_id": ObjectId,
  "user": ObjectId,           // Reference to User
  "accountType": "USER|ADMIN",
  "balance": Number,
  "totalEarnings": Number,
  "totalWithdrawals": Number,
  "currency": "USD",
  "transactions": [ObjectId], // Array of BillingTransaction refs
  "withdrawalRequests": [ObjectId],
  "bankAccount": {            // Optional withdrawal account
    "accountHolder": String,
    "accountNumber": String,  // Encrypted in production
    "bankName": String,
    "routingNumber": String,  // Encrypted in production
    "isVerified": Boolean
  },
  "paypalEmail": String,      // Optional
  "cryptoAddress": String,    // Optional
  "minimumWithdrawalAmount": Number,
  "isActive": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}
```

### BillingTransaction Collection

```javascript
{
  "_id": ObjectId,
  "billing": ObjectId,              // Reference to Billing account
  "user": ObjectId,                 // Reference to User
  "type": "PURCHASE_EARNINGS|ADMIN_COMMISSION|WITHDRAWAL|...",
  "amount": Number,
  "currency": "USD",
  "description": String,
  "relatedTransaction": ObjectId,   // Reference to Transaction
  "relatedPurchase": ObjectId,      // Reference to Purchase
  "relatedWithdrawal": ObjectId,    // Reference to WithdrawalRequest
  "status": "PENDING|COMPLETED|FAILED|REVERSED",
  "metadata": {
    "purchaseId": ObjectId,
    "transactionId": ObjectId,
    "commissionPercent": Number,
    "originalAmount": Number,
    ...
  },
  "processedBy": ObjectId,          // Admin who processed (if applicable)
  "createdAt": Date,
  "updatedAt": Date
}
```

## Next Steps: Production Implementation

When integrating with a real payment processor (Stripe, PayPal, etc.):

1. **Replace mock status**: Change `status: "COMPLETED"` to `status: "PENDING"`
2. **Add webhook handler**: Listen for payment success events
3. **Only distribute after confirmation**: Call `distributePurchaseEarnings()` after payment processor confirms
4. **Add retry logic**: Handle failed distributions with retry mechanism
5. **Encrypt sensitive data**: Bank account numbers, crypto addresses
6. **Add KYC verification**: Verify user identity for withdrawals
7. **Implement rate limiting**: Prevent abuse of withdrawal requests
8. **Add audit logging**: Track all financial changes for compliance

## Summary

✅ **Full payment system implemented:**
- Automatic fund distribution (10% admin, 90% seller)
- Complete transaction tracking
- Multiple withdrawal method support
- Commission configuration
- Earning reports and statistics
- Mock purchase simulation for testing

**Current Status:** Ready for end-to-end testing with simulated payments
**Next Phase:** Integration with real payment processor
