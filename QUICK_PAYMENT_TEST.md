# Quick Payment System Test Guide

## Prerequisites

```bash
✓ Backend running: npm run dev (port 5000)
✓ Frontend running: npm run dev (port 8080 with /api proxy to :5000)
✓ MongoDB running
✓ Two test users created (buyer + seller)
✓ A paid rule from seller
```

## Quick Test (5 minutes)

### 1. Login as Seller

```
Navigate to: http://localhost:8080/login
Email: seller@test.com
Password: [seller password]
```

### 2. Check Initial Balance

```
Navigate to: http://localhost:8080/billing
View: "Earnings Overview" card
Expected: Balance = 0, Total Earnings = 0
```

### 3. Login as Buyer (Different Browser/Incognito)

```
Navigate to: http://localhost:8080/login
Email: buyer@test.com
Password: [buyer password]
```

### 4. Purchase the Seller's Rule

```
Navigate to: http://localhost:8080/rules
Find seller's paid rule
Click "Purchase" button
Click "Confirm Purchase"
Wait for success message
```

### 5. Check Billing Page (Buyer)

```
Navigate to: http://localhost:8080/billing
View: "Earnings Overview" card
Expected: Balance = 0 (unchanged, buyer doesn't earn from purchase)
View: "Statistics" tab
Expected: No earnings data
```

### 6. Logout & Login as Seller

```
Click logout
Login with seller credentials
Navigate to: http://localhost:8080/billing
```

### 7. Verify Earnings Updated

```
View: "Earnings Overview" card
Expected:
  - Available Balance: $90.00 (90% of purchase)
  - Total Earnings: $90.00
  
View: "Transactions" tab
Expected:
  - New transaction showing +$90
  - Type: PURCHASE_EARNINGS
  - Status: COMPLETED
  
View: "Statistics" tab
Expected:
  - Today: $90.00
  - This week: $90.00
  - This month: $90.00
```

### 8. Login as Admin (If Available)

```
Login with admin credentials
Navigate to: http://localhost:8080/billing
```

### 9. Verify Admin Commission (Admin View)

```
View: "Earnings Overview" card
Expected:
  - Available Balance: $10.00 (10% of purchase)
  - Total Earnings: $10.00
  
View: "Transactions" tab
Expected:
  - New transaction showing +$10
  - Type: ADMIN_COMMISSION
  - Metadata: commissionPercent: 10, originalAmount: 100
```

## Expected Results

| User | Before | After | Change |
|------|--------|-------|--------|
| Seller | $0 | $90 | +$90 (90% of $100) |
| Admin | $0 | $10 | +$10 (10% of $100) |
| Buyer | $0 | $0 | No change |

## Console Logs to Look For (F12 → Console)

```javascript
// When purchase is made, backend logs:
✅ Earnings distributed successfully: {
  success: true,
  message: "Earnings distributed successfully",
  distribution: {
    adminCommission: { amount: 10 },
    sellerEarnings: { amount: 90 }
  }
}

// When fetching billing data, frontend logs:
📊 BillingOverviewCard: Starting fetch
📊 Token exists: true
📊 Fetching URL: /api/v1/billing/my-account
📊 Response status: 200
📊 Response ok: true
📊 Response data: {...}
✅ BillingOverviewCard: Data loaded successfully
```

## Testing Multiple Purchases

To verify system works with multiple purchases:

### Test 1: Buy same seller twice

```
1. Buyer purchases $100 rule from Seller
   - Seller: 0 → 90
   - Admin: 0 → 10

2. Buyer purchases $50 rule from Seller
   - Seller: 90 → 135 (+ 45)
   - Admin: 10 → 15 (+ 5)
   
3. Seller's balance: $135
4. Admin's balance: $15
5. Total revenue: $150 ✓
```

### Test 2: Multiple sellers

```
1. Buyer1 purchases $100 rule from Seller1
   - Seller1: 90
   - Admin: 10

2. Buyer2 purchases $100 rule from Seller2
   - Seller2: 90
   - Admin: 20
   
3. Seller1: $90
4. Seller2: $90
5. Admin: $20
6. Total revenue: $200 ✓
```

## If Something Breaks

### Balance Not Updating?

1. **Check Backend Logs**
   ```
   Look for: "❌ Error distributing earnings:"
   This means billing service failed
   ```

2. **Verify ADMIN User Exists**
   ```javascript
   // In MongoDB shell or Compass
   db.users.findOne({ role: "ADMIN" })
   
   // If not found, create one:
   db.users.updateOne(
     { email: "admin@rulelab.com" },
     { $set: { role: "ADMIN" } }
   )
   ```

3. **Check Billing Accounts Created**
   ```javascript
   db.billings.find()
   // Should show accounts for seller, buyer, and admin
   ```

4. **Clear Frontend Cache**
   ```
   Ctrl+Shift+Delete → Clear all
   Ctrl+R → Hard refresh
   ```

5. **Restart Servers**
   ```bash
   # Kill all Node processes
   Get-Process -Name node | Stop-Process -Force
   
   # Restart backend
   npm run dev
   
   # In another terminal, restart frontend
   npm run dev (in rule-guardian folder)
   ```

### Getting HTML Instead of JSON?

**Solution:** Ensure Vite proxy is set up

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

Then restart frontend server.

### Can't See Billing Page?

```
1. Make sure you're logged in
2. Token should be in localStorage (F12 → Application → Local Storage)
3. Check console for errors (F12 → Console tab)
4. Verify token exists: localStorage.getItem('access_token')
```

## API Endpoints Quick Reference

**Get Your Balance:**
```
GET /api/v1/billing/my-account
Header: Authorization: Bearer {token}
```

**Get Your Transactions:**
```
GET /api/v1/billing/my-transactions?page=1&limit=20
Header: Authorization: Bearer {token}
```

**Get Earnings Report:**
```
GET /api/v1/billing/earnings-report?period=month
Header: Authorization: Bearer {token}
```

**Get Commission Config:**
```
GET /api/v1/billing/commission-config
(No auth required - public endpoint)
```

## Success Criteria

✅ System is working correctly when:

1. Purchase is made successfully
2. No errors in backend console
3. Seller's balance increases by 90% of purchase amount
4. Admin's balance increases by 10% of purchase amount
5. Both transactions appear in /transactions tab
6. Earnings report shows daily breakdown
7. Statistics tab shows correct period earnings
8. Commission config returns 10/90 split

## Next Steps

Once payment system verified:

1. Test withdrawal request functionality
2. Test with multiple rules and prices
3. Load test with multiple concurrent purchases
4. Set up production payment processor integration
5. Implement real payment verification webhooks
