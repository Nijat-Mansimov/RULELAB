# Billing System - Troubleshooting & Debugging Guide

## Issue 1: "Unexpected token '<', "<!doctype "... is not valid JSON"

### Root Cause
The frontend is receiving HTML (error page) instead of JSON from the API. This happens when:
1. An API endpoint doesn't exist (404 error returns HTML)
2. Server error occurs before JSON response (500 error returns HTML)
3. CORS issue causes fallback to HTML error page
4. Route not registered properly

### Solution Applied

**Fixed Endpoints**:
- Changed `/earnings-stats` → `/my-stats` in EarningsStatsCard.tsx
- Added new `/earnings-report` endpoint for EarningsChart.tsx

**Files Modified**:
1. `rule-guardian/src/components/billing/EarningsStatsCard.tsx`
   - Line 39: Changed fetch URL from `/api/v1/billing/earnings-stats` to `/api/v1/billing/my-stats`

2. `src/controllers/billingController.js`
   - Added `getEarningsReport()` function (lines 437-490)
   - Aggregates daily earnings data
   - Supports period filtering (week, month, year)

3. `src/routes/billingRoutes.js`
   - Added route: `GET /api/v1/billing/earnings-report`
   - Middleware: authenticate

### How to Verify Fix
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open DevTools → Network tab
3. Navigate to `/billing` → Statistics tab
4. Check that `/api/v1/billing/my-stats` returns JSON (not HTML)
5. Check that `/api/v1/billing/earnings-report` returns JSON (not HTML)

### Response Format
**GET /api/v1/billing/my-stats**
```json
{
  "success": true,
  "data": {
    "stats": {
      "thisMonth": 100.00,
      "lastMonth": 80.00,
      "thisWeek": 30.00,
      "lastWeek": 25.00,
      "today": 10.00,
      "totalPendingWithdrawals": 0,
      "availableBalance": 100.00,
      "totalEarnings": 100.00
    }
  }
}
```

**GET /api/v1/billing/earnings-report?period=month**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "daily": [
      {
        "date": "2026-01-22",
        "amount": 50.00,
        "transactions": 2
      },
      {
        "date": "2026-01-21",
        "amount": 30.00,
        "transactions": 1
      }
    ]
  }
}
```

---

## Issue 2: Admin Earnings Not Updating After Purchase

### Root Cause Analysis

When a user purchases a rule:
1. Transaction is created
2. Purchase record is created
3. `billingService.distributePurchaseEarnings()` is called
4. Admin commission should be added to ADMIN user's billing account

**Potential causes for admin not receiving earnings**:
1. ADMIN user doesn't exist in database
2. Admin billing account not created
3. Commission calculation is wrong
4. Wrong user ID being used for admin
5. Billing update not saving properly

### Solution Applied

**Files to Check**:

1. **Backend: src/services/billingService.js**
   ```javascript
   // Around line 85
   const adminUser = await User.findOne({ role: "ADMIN" });
   if (!adminUser) {
     throw new Error("Admin user not found"); // <-- This will throw if no admin
   }
   ```

2. **Backend: src/controllers/transactionController.js**
   ```javascript
   // Line ~197: Distribution call
   const distributionResult = await billingService.distributePurchaseEarnings({
     purchaseId: purchase._id,
     transactionId: transaction._id,
     sellerId: rule.creator._id,  // <-- Must be seller, not buyer
     amount: amount,
   });
   ```

### Debug Steps

**Step 1: Verify Admin User Exists**
```javascript
// In MongoDB or via API
db.users.findOne({ role: "ADMIN" })
// Should return admin user document with _id
```

**Step 2: Check Billing Account Created**
```javascript
// Check if admin has billing account
db.billings.findOne({ user: adminUserId })
// Should have: balance, totalEarnings fields
```

**Step 3: Monitor Transaction Distribution**
Add logging to transactionController.js:
```javascript
console.log("📊 Distribution Result:", distributionResult);
// Should show both admin and seller earnings
```

**Step 4: Verify Admin Balance Updated**
```javascript
// After purchase, check admin billing
db.billings.findOne({ user: adminUserId }).balance
// Should be > 0 if admin commission paid
```

### Manual Testing Procedure

1. **Create Admin User** (if doesn't exist):
   - Sign up and manually change role to ADMIN in database
   - OR create via script:
   ```javascript
   const User = require('./src/models/User');
   await User.create({
     username: 'admin',
     email: 'admin@test.com',
     password: 'hashed_password',
     role: 'ADMIN'
   });
   ```

2. **Create Test Rule**:
   - Sign in as different user
   - Create paid rule ($100)
   - Publish it

3. **Purchase Rule**:
   - Sign in as another user
   - Purchase the rule
   - Confirm payment successful

4. **Check Admin Earnings**:
   - Sign in as ADMIN
   - Navigate to `/admin` (if admin panel available)
   - OR check database:
   ```javascript
   const adminBilling = await Billing.findOne({ user: adminUserId });
   console.log("Admin balance:", adminBilling.balance);
   // Should be 10 (10% of 100)
   ```

5. **Check Seller Earnings**:
   - Sign in as rule creator
   - Go to `/billing` → Overview
   - Balance should show 90 (90% of 100)

### Console Logs to Watch

When purchase completes, backend console should show:

```
✅ Earnings distributed successfully: {
  success: true,
  distribution: {
    adminCommission: { amount: 10.00, userId: ..., ... },
    sellerEarnings: { amount: 90.00, userId: ..., ... }
  }
}
```

If you see an error instead:
```
❌ Error distributing earnings: Error: Admin user not found
```
Then admin user doesn't exist.

---

## Common Issues & Solutions

### Issue: "Admin user not found"
**Solution**:
1. Create ADMIN user in database
2. Verify user.role === "ADMIN"
3. Restart backend server

### Issue: Admin billing shows in database but balance is 0
**Solution**:
1. Check BillingTransaction records
2. Verify transactions have type: "ADMIN_COMMISSION"
3. Check if errors during distributePurchaseEarnings
4. Re-run distribution (implement retry)

### Issue: Purchase successful but no billing transactions created
**Solution**:
1. Check if error is caught but not logged
2. Add try-catch with detailed logging
3. Check database connection during distribution
4. Verify billingService module is properly imported

### Issue: Different user amounts than expected
**Verify**:
- Commission percentage: 10% (check ADMIN_COMMISSION_PERCENT in billingService.js)
- Amount calculation: admin = amount * 0.10, seller = amount * 0.90
- Both accounts updated: adminBilling.balance and sellerBilling.balance

---

## Debugging Checklist

### Backend Debugging
- [ ] Check Node console for error logs
- [ ] Verify MongoDB connection is active
- [ ] Check if ADMIN user exists: `db.users.find({role: "ADMIN"})`
- [ ] Check admin billing account: `db.billings.findOne({user: adminUserId})`
- [ ] Check billing transactions: `db.billingtransactions.find({type: "ADMIN_COMMISSION"})`
- [ ] Check commission percentage in billingService.js
- [ ] Verify routes registered in server.js
- [ ] Verify middleware applied (authenticate, hasRole)

### Frontend Debugging
- [ ] Check browser Network tab for API responses
- [ ] Verify response status (should be 200, not 404 or 500)
- [ ] Check response format (should be JSON, not HTML)
- [ ] Verify token in localStorage
- [ ] Check component state with React DevTools
- [ ] Verify endpoints match backend routes

### Data Verification
- [ ] Admin user exists with correct role
- [ ] Admin has billing account
- [ ] Seller has billing account
- [ ] Billing transactions created
- [ ] Balance fields updated correctly
- [ ] Commission split is 10-90

---

## Testing The Fix

### Test Case 1: Verify Endpoints Exist
```bash
# Test /my-stats endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/billing/my-stats

# Test /earnings-report endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/billing/earnings-report?period=month
```

### Test Case 2: Complete Purchase Flow
1. Create paid rule as User A
2. Purchase as User B (with $100)
3. Check User A balance: should be $90
4. Check Admin balance: should be $10
5. Check both have BillingTransaction records

### Test Case 3: Frontend Components Load
1. User A logs in
2. Navigate to /billing
3. Overview tab loads (no JSON error)
4. Statistics tab loads (no JSON error)
5. Transactions tab shows transactions
6. Withdrawals tab loads

---

## Recovery Steps If Issues Persist

### Step 1: Clear Caches
```bash
# Clear browser cache
# Clear localStorage: DevTools → Application → Clear All

# Clear Node cache (restart server)
npm run dev:backend
```

### Step 2: Reset Test Data
```javascript
// In MongoDB console
db.billings.deleteMany({})  // Clear all billing accounts
db.billingtransactions.deleteMany({})  // Clear all transactions

// Restart server to recreate accounts on next purchase
```

### Step 3: Add Detailed Logging
Modify src/services/billingService.js:
```javascript
console.log("🔍 Distribution started:", {
  sellerId,
  amount,
  adminCommission,
  sellerEarnings
});

console.log("✅ Admin billing updated:", {
  balance: adminBilling.balance,
  totalEarnings: adminBilling.totalEarnings
});
```

### Step 4: Run Diagnostics
```javascript
// Create a test endpoint to check system state
app.get('/api/debug/billing-check', async (req, res) => {
  const adminUser = await User.findOne({ role: "ADMIN" });
  const adminBilling = await Billing.findOne({ user: adminUser?._id });
  const transactionCount = await BillingTransaction.countDocuments();
  
  res.json({
    adminExists: !!adminUser,
    adminBillingExists: !!adminBilling,
    adminBalance: adminBilling?.balance,
    transactionCount
  });
});
```

---

## Files Modified

### Backend
1. **src/controllers/billingController.js**
   - Added: `getEarningsReport()` function
   - Purpose: Return daily earnings breakdown

2. **src/routes/billingRoutes.js**
   - Added: `GET /earnings-report` route
   - Middleware: authenticate

### Frontend
1. **rule-guardian/src/components/billing/EarningsStatsCard.tsx**
   - Changed: Fetch URL to `/my-stats`
   - Reason: Endpoint now correctly named

## Next Steps

1. **Clear browser cache and restart**
2. **Test both issues again**
3. **Monitor console logs during purchase**
4. **Verify admin receives earnings**
5. **Check EarningsStatsCard loads without JSON error**

## Support

If issues persist:
1. Check MongoDB logs
2. Check Node.js console output
3. Verify all files were saved
4. Restart backend server
5. Clear frontend cache
6. Test with fresh data
