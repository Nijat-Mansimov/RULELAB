# Billing & Earnings System - Implementation Guide

## Quick Start

### Step 1: Initialize Billing Accounts for Existing Users

When a user is created, their billing account is automatically initialized. For existing users, you can initialize manually:

```javascript
// In your user creation logic or a migration script
const billingService = require("../services/billingService");

// When creating new user
const user = await User.create({ ... });
await billingService.createBillingAccount(user._id, "USER");

// For admin
const admin = await User.findOne({ role: "ADMIN" });
await billingService.createBillingAccount(admin._id, "ADMIN");
```

### Step 2: Purchase Process (Already Integrated)

The `purchaseRule` endpoint in `transactionController.js` now automatically distributes earnings:

```javascript
// User purchases a rule
POST /api/v1/transactions/purchase
{
  "ruleId": "...",
  "paymentMethodId": "..."
}

// Response includes transaction details
// Earnings are automatically distributed to:
// - ADMIN: 10% commission
// - Rule Creator: 90% earnings
```

### Step 3: Access Billing Endpoints

Users can check their earnings:

```bash
# Get billing account
curl -X GET http://localhost:5000/api/v1/billing/my-account \
  -H "Authorization: Bearer USER_TOKEN"

# Get statistics
curl -X GET http://localhost:5000/api/v1/billing/my-stats \
  -H "Authorization: Bearer USER_TOKEN"

# Get transactions
curl -X GET http://localhost:5000/api/v1/billing/my-transactions \
  -H "Authorization: Bearer USER_TOKEN"
```

## Integration Checklist

### Backend Setup
- ✅ Created `Billing.js` model
- ✅ Created `BillingTransaction.js` model
- ✅ Created `WithdrawalRequest.js` model
- ✅ Created `billingService.js` with core logic
- ✅ Created `billingController.js` with API endpoints
- ✅ Created `billingRoutes.js` with routes
- ✅ Updated `transactionController.js` to distribute earnings
- ✅ Updated `server.js` to register billing routes

### Database
- ✅ Three new collections: `billings`, `billingtransactions`, `withdrawalrequests`
- ✅ Indexes created for performance
- ✅ Foreign key relationships established

### API Routes
```
User Routes:
GET    /api/v1/billing/my-account
GET    /api/v1/billing/my-stats
GET    /api/v1/billing/my-transactions
GET    /api/v1/billing/commission-config
POST   /api/v1/billing/withdrawals/request
GET    /api/v1/billing/withdrawals/my-requests

Admin Routes:
GET    /api/v1/billing/admin/overview
GET    /api/v1/billing/admin/withdrawals
POST   /api/v1/billing/admin/withdrawals/{id}/process
POST   /api/v1/billing/admin/withdrawals/{id}/complete
POST   /api/v1/billing/admin/adjust-balance/{userId}
```

## Commission Configuration

### Current Settings
```javascript
ADMIN_COMMISSION_PERCENT = 0.1  // 10%
```

### To Change Commission Rate

Edit `src/services/billingService.js`:

```javascript
// Change this value
const ADMIN_COMMISSION_PERCENT = 0.15;  // Change to 15%
```

Then update in controller:

```javascript
// All new purchases will use the new rate
// Existing transactions are not affected
```

## Testing the System

### Test 1: Create a Purchase and Verify Earnings

```bash
# 1. Get a rule (already created)
RULE_ID="<rule-id>"
ADMIN_ID="<admin-id>"
USER_B_ID="<user-b-id>"

# 2. Purchase the rule
curl -X POST http://localhost:5000/api/v1/transactions/purchase \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ruleId": "'$RULE_ID'"}'

# 3. Check Admin Earnings
curl -X GET http://localhost:5000/api/v1/billing/admin/overview \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Check Rule Creator Earnings
curl -X GET http://localhost:5000/api/v1/billing/my-stats \
  -H "Authorization: Bearer RULE_CREATOR_TOKEN"
```

### Test 2: Request and Process Withdrawal

```bash
# 1. Request withdrawal
curl -X POST http://localhost:5000/api/v1/billing/withdrawals/request \
  -H "Authorization: Bearer RULE_CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "withdrawalMethod": "PAYPAL",
    "paypalEmail": "user@example.com"
  }'

# 2. Get withdrawal ID from response
WITHDRAWAL_ID="<withdrawal-id>"

# 3. Admin approves withdrawal
curl -X POST http://localhost:5000/api/v1/billing/admin/withdrawals/$WITHDRAWAL_ID/process \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# 4. Admin marks as completed
curl -X POST http://localhost:5000/api/v1/billing/admin/withdrawals/$WITHDRAWAL_ID/complete \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Database Inspection

### View Billing Accounts

```javascript
// MongoDB
db.billings.find()
db.billings.findOne({ user: ObjectId("...") })

// Check a user's balance
db.billings.findOne({ user: ObjectId("...") }, { balance: 1, totalEarnings: 1 })
```

### View Billing Transactions

```javascript
// All transactions
db.billingtransactions.find()

// Transactions for a user
db.billingtransactions.find({ user: ObjectId("...") })

// Only earnings
db.billingtransactions.find({ type: "PURCHASE_EARNINGS" })

// Only admin commissions
db.billingtransactions.find({ type: "ADMIN_COMMISSION" })
```

### View Withdrawal Requests

```javascript
// All withdrawals
db.withdrawalrequests.find()

// Pending withdrawals
db.withdrawalrequests.find({ status: "PENDING" })

// User's withdrawals
db.withdrawalrequests.find({ user: ObjectId("...") })
```

## Monitoring & Debugging

### Check System Health

```bash
curl http://localhost:5000/health
```

### Monitor Earnings Distribution

Add logging to see distribution in action:

```javascript
// In purchaseRule function
console.log("✅ Earnings distributed successfully:", distributionResult);
```

Check server logs:
```bash
# Terminal output shows distribution logs
```

### Debug Billing Issues

```javascript
// In Node REPL or script
const billingService = require("./services/billingService");
const Billing = require("./models/Billing");

// Get a user's billing
const billing = await Billing.findOne({ user: userId });
console.log("Balance:", billing.balance);
console.log("Total Earnings:", billing.totalEarnings);
console.log("Total Withdrawals:", billing.totalWithdrawals);
```

## Frontend Integration (Optional)

If you want to show earnings in the UI:

### Component to Display Earnings

```tsx
// rule-guardian/src/components/EarningsCard.tsx
import React, { useEffect, useState } from 'react';

export function EarningsCard() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const response = await fetch('/api/v1/billing/my-account', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        setBilling(data.data.billing);
      } catch (error) {
        console.error('Error fetching billing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!billing) return <div>No billing data</div>;

  return (
    <div className="billing-card">
      <h2>Your Earnings</h2>
      <div className="stat">
        <span>Balance:</span>
        <strong>${billing.balance.toFixed(2)}</strong>
      </div>
      <div className="stat">
        <span>Total Earnings:</span>
        <strong>${billing.totalEarnings.toFixed(2)}</strong>
      </div>
      <div className="stat">
        <span>Total Withdrawals:</span>
        <strong>${billing.totalWithdrawals.toFixed(2)}</strong>
      </div>
    </div>
  );
}
```

### Withdrawal Request Form

```tsx
// rule-guardian/src/components/WithdrawalForm.tsx
import React, { useState } from 'react';

export function WithdrawalForm({ currentBalance }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PAYPAL');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/billing/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          withdrawalMethod: method,
          paypalEmail: method === 'PAYPAL' ? email : undefined
        })
      });

      if (response.ok) {
        alert('Withdrawal request submitted!');
        setAmount('');
      } else {
        alert('Error submitting withdrawal');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Amount (Max: ${currentBalance})</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          max={currentBalance}
          step="0.01"
          required
        />
      </div>
      <div>
        <label>Withdrawal Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="PAYPAL">PayPal</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CRYPTO">Cryptocurrency</option>
        </select>
      </div>
      {method === 'PAYPAL' && (
        <div>
          <label>PayPal Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      )}
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Request Withdrawal'}
      </button>
    </form>
  );
}
```

## Production Deployment Checklist

- [ ] Encryption for sensitive fields (bank accounts, crypto addresses)
- [ ] Enable rate limiting on withdrawal endpoints
- [ ] Set up email notifications for withdrawal approvals
- [ ] Configure minimum/maximum withdrawal amounts
- [ ] Add two-factor authentication for withdrawal requests
- [ ] Implement KYC verification for large withdrawals
- [ ] Set up automated scheduled payouts
- [ ] Create admin dashboard for withdrawal management
- [ ] Implement transaction signing for audit trail
- [ ] Set up monitoring/alerting for suspicious activity
- [ ] Create user documentation for earnings & withdrawals
- [ ] Test refund scenarios thoroughly
- [ ] Back up billing database regularly

## Common Issues & Solutions

### Issue: Earnings not appearing after purchase
**Check:**
1. Transaction status is "COMPLETED"
2. Seller is not the buyer
3. Admin user exists in database

### Issue: Withdrawal balance shows wrong amount
**Check:**
1. Account has been suspended
2. Multiple pending withdrawals
3. Calculate from transactions: `db.billingtransactions.aggregate([{ $match: { billing: ObjectId("...") } }, { $group: { _id: null, total: { $sum: "$amount" } } }])`

### Issue: Admin commission not distributed
**Check:**
1. Check logs for billing service errors
2. Verify ADMIN_COMMISSION_PERCENT value
3. Inspect billingtransactions for commission entries

## Support Resources

- **Full Documentation:** See `BILLING_EARNINGS_SYSTEM.md`
- **API Tests:** Use Postman collection
- **Database:** MongoDB connection string in `.env`
- **Logs:** Check server console output
- **Code:** `src/services/billingService.js` - core business logic

