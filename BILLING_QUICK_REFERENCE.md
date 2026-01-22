# Billing System Quick Reference

## What's Been Implemented

### ✅ Backend (Complete)
- 3 Database Models (Billing, BillingTransaction, WithdrawalRequest)
- 1 Billing Service with 8+ functions
- 1 Billing Controller with 7 API endpoints
- Billing Routes integrated into server
- Payment distribution: 10% Admin, 90% Seller

### ✅ Frontend (Complete)
- 8 React/TypeScript Components
- 1 Main Billing Page with Tabs
- Navigation Integration (Sidebar + Header)
- Full API Integration
- Responsive Design with Dark Mode

## Quick Start for Users

### Accessing Billing
1. Click **Billing & Earnings** in sidebar or user menu
2. Choose tab: Overview, Statistics, Transactions, or Withdrawals
3. View earnings and manage withdrawals

### Requesting a Withdrawal
1. Go to Billing → Withdrawals tab
2. Fill withdrawal form with:
   - Amount (min $10)
   - Withdrawal method (PayPal/Bank/Crypto)
   - Method details
3. Click Submit
4. Check status in withdrawal list

## API Endpoints Quick Reference

### User Endpoints
```
GET  /api/v1/billing/my-account           → Billing account details
GET  /api/v1/billing/my-stats             → Statistics
GET  /api/v1/billing/my-transactions      → Transaction history
GET  /api/v1/billing/commission-config    → Commission info
POST /api/v1/billing/withdrawals/request  → Request withdrawal
GET  /api/v1/billing/withdrawals/my-requests → My withdrawals
GET  /api/v1/billing/earnings-report      → Earnings trends
GET  /api/v1/billing/earnings-stats       → Earnings stats
```

### Admin Endpoints
```
GET  /api/v1/billing/admin/overview       → Admin earnings
GET  /api/v1/billing/admin/withdrawals    → All withdrawals
POST /api/v1/billing/admin/withdrawals/:id/process → Approve/Reject
```

## Component Quick Reference

| Component | Purpose | Route | Props |
|-----------|---------|-------|-------|
| **BillingOverviewCard** | Dashboard summary | — | None |
| **BillingTransactionList** | Transaction history | `/billing#transactions` | None |
| **WithdrawalsList** | Withdrawal requests | `/billing#withdrawals` | None |
| **WithdrawalRequestForm** | Submit withdrawal | `/billing#withdrawals` | currentBalance, minimumAmount, onSuccess |
| **CommissionInfoCard** | Commission explanation | `/billing#overview` | None |
| **EarningsChart** | Earnings visualization | `/billing#statistics` | None |
| **EarningsStatsCard** | Statistics | `/billing#statistics` | None |
| **AdminBillingDashboard** | Admin panel | `/admin` | None |

## File Locations

### Frontend
```
src/
├── pages/Billing.tsx                      ← Main page
├── components/billing/
│   ├── BillingOverviewCard.tsx
│   ├── BillingTransactionList.tsx
│   ├── WithdrawalsList.tsx
│   ├── WithdrawalRequestForm.tsx
│   ├── CommissionInfoCard.tsx
│   ├── EarningsChart.tsx
│   ├── EarningsStatsCard.tsx
│   └── AdminBillingDashboard.tsx
├── components/layout/
│   ├── AppSidebar.tsx                    ← Updated with billing link
│   └── AppHeader.tsx                     ← Updated with billing link
└── App.tsx                               ← Updated with /billing route
```

### Backend
```
src/
├── models/
│   ├── Billing.js
│   ├── BillingTransaction.js
│   └── WithdrawalRequest.js
├── services/billingService.js
├── controllers/billingController.js
├── routes/billingRoutes.js
└── server.js                             ← Routes registered
```

## Payment Flow

```
User Purchases Rule ($100)
    ↓
Create Transaction Record
    ↓
Create Purchase Record
    ↓
Call billingService.distributeFunds()
    ├─ Split: 10% admin ($10) + 90% seller ($90)
    ├─ Create billing transactions
    ├─ Update account balances
    ├─ Send notifications
    └─ Return success
    ↓
Update Rule Statistics
    ↓
Send Notifications to Both Users
```

## Withdrawal Flow

```
User Requests Withdrawal
    ↓
Form Validation (amount >= $10, details filled)
    ↓
Submit to POST /api/v1/billing/withdrawals/request
    ↓
Server Validation & Database Insert
    ↓
Withdrawal Created (Status: PENDING)
    ↓
Admin Reviews in Admin Panel
    ├─ Approve → Status: APPROVED → Processing → COMPLETED
    └─ Reject → Status: REJECTED → Funds Returned
    ↓
User Notified of Status
```

## Common Issues & Solutions

### Issue: Billing page won't load
**Check**: 
- User is authenticated (has valid token)
- API endpoints are accessible
- Backend server is running
- Browser console for errors

### Issue: Withdrawal form shows error
**Check**:
- Amount >= $10
- All required fields filled
- Valid withdrawal method details
- User has sufficient balance

### Issue: Admin endpoints return 403
**Check**:
- User has ADMIN role
- Token includes correct role
- Using hasRole("ADMIN") not authorize()

## Configuration

### Commission Settings (In billingService.js)
```javascript
const PLATFORM_COMMISSION_PERCENT = 0.10; // 10% to admin
// Change this value to adjust commission split
```

### Minimum Withdrawal (In WithdrawalRequestForm.tsx)
```typescript
const minimumAmount = 10; // Minimum $10
// Pass different value in Billing.tsx to adjust
```

## Testing

### Manual Testing Checklist
- [ ] User can navigate to /billing
- [ ] Overview tab shows balance
- [ ] Statistics tab shows trends
- [ ] Transactions tab shows history
- [ ] Can submit withdrawal request
- [ ] Withdrawal appears in list
- [ ] Admin can see pending withdrawals
- [ ] Admin can approve/reject

### Test Data
- Purchase a test rule to generate earnings
- Request withdrawal to test form
- Check admin panel for pending requests

## Performance Tips

1. **For Large Datasets**: Pagination handles up to 1000+ transactions
2. **For Real-time Updates**: Use refresh triggers in Billing.tsx
3. **For Charts**: SVG-based rendering is lightweight
4. **For Mobile**: All components are responsive

## Security

- All endpoints require JWT authentication
- Admin endpoints require ADMIN role
- Sensitive data (account numbers) masked
- Form inputs validated on client and server
- CORS configured for origin validation

## Next Steps

1. **For Developers**:
   - Review Billing.tsx for component structure
   - Check billingService.js for business logic
   - Test API endpoints with Postman

2. **For Admins**:
   - Navigate to /admin for withdrawal management
   - Review pending withdrawals regularly
   - Process approved withdrawals

3. **For Users**:
   - Start publishing paid rules
   - Monitor earnings in Billing page
   - Request withdrawals when ready

## Support

For issues or questions:
1. Check console for error messages
2. Verify API endpoints are correct
3. Ensure backend server is running
4. Check authentication token validity
5. Review documentation files:
   - BILLING_FRONTEND_INTEGRATION.md
   - BILLING_EARNINGS_SYSTEM.md
   - API_REFERENCE.md

## Related Documentation

- 📄 `BILLING_FRONTEND_INTEGRATION.md` - Frontend implementation details
- 📄 `BILLING_EARNINGS_SYSTEM.md` - System design and architecture
- 📄 `BILLING_EARNINGS_IMPLEMENTATION_GUIDE.md` - Setup guide
- 📄 `API_REFERENCE.md` - Complete API documentation
