# Billing & Earnings System Documentation

## Overview

The Billing & Earnings System provides a complete solution for tracking, managing, and distributing revenue from paid rule purchases. The system ensures transparent fund allocation between the platform (ADMIN) and rule creators (rule owners).

## System Architecture

### Key Components

1. **Billing Model** (`src/models/Billing.js`)
   - User's earnings account
   - Tracks balance, total earnings, withdrawals
   - Stores withdrawal method preferences
   - Links to billing transactions and withdrawal requests

2. **BillingTransaction Model** (`src/models/BillingTransaction.js`)
   - Immutable ledger entries
   - Records all earnings, commissions, refunds, and adjustments
   - Maintains audit trail
   - Links to original purchase transactions

3. **WithdrawalRequest Model** (`src/models/WithdrawalRequest.js`)
   - Tracks withdrawal requests from users
   - Supports multiple withdrawal methods (Bank Transfer, PayPal, Crypto)
   - Admin approval workflow
   - Status tracking (PENDING → APPROVED → PROCESSING → COMPLETED)

4. **Billing Service** (`src/services/billingService.js`)
   - Core business logic for earnings distribution
   - Handles account initialization, balance updates, refunds
   - Manages commission calculations

5. **Billing Controller** (`src/controllers/billingController.js`)
   - REST API endpoints
   - User and admin endpoints
   - Authorization checks

## Commission Structure

### Default Configuration
- **Admin Commission:** 10% of purchase price
- **Rule Owner Earnings:** 90% of purchase price

Example:
```
Purchase Amount:     $100.00
Admin Commission:    $10.00 (10%)
Rule Owner Earnings: $90.00 (90%)
```

## Purchase Flow with Billing

When a user purchases a paid rule:

```
1. User initiates purchase
   └─ POST /api/v1/transactions/purchase
      ├─ Validate rule exists and is PAID
      ├─ Check purchase eligibility
      ├─ Create Transaction record
      ├─ Create Purchase record
      │
      └─ BILLING DISTRIBUTION:
         ├─ Ensure billing accounts exist (ADMIN + Rule Creator)
         ├─ Calculate commission (10%)
         ├─ Create BillingTransaction for ADMIN_COMMISSION
         │  └─ Amount: $10.00
         ├─ Create BillingTransaction for PURCHASE_EARNINGS
         │  └─ Amount: $90.00
         ├─ Update Billing.balance for both accounts
         ├─ Update Billing.totalEarnings for both accounts
         └─ Add transactions to Billing.transactions array

2. Notifications sent
   ├─ Rule owner: "Your rule was purchased - $90.00 credited"
   └─ Buyer: "Purchase successful - License key: XXX"

3. Return success response with transaction data
```

## API Endpoints

### User Endpoints

#### Get My Billing Account
```http
GET /api/v1/billing/my-account
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "billing": {
      "_id": "...",
      "user": "...",
      "accountType": "USER",
      "balance": 450.50,
      "totalEarnings": 500.00,
      "totalWithdrawals": 49.50,
      "currency": "USD",
      "minimumWithdrawalAmount": 10
    }
  }
}
```

#### Get My Billing Statistics
```http
GET /api/v1/billing/my-stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 450.50,
    "totalEarnings": 500.00,
    "totalWithdrawals": 49.50,
    "currency": "USD",
    "transactions": [
      {
        "_id": "...",
        "type": "PURCHASE_EARNINGS",
        "amount": 90.00,
        "description": "Earnings from rule purchase",
        "createdAt": "2026-01-20T10:30:00Z"
      }
    ]
  }
}
```

#### Get My Billing Transactions
```http
GET /api/v1/billing/my-transactions?page=1&limit=20&type=PURCHASE_EARNINGS
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by transaction type
  - `PURCHASE_EARNINGS`
  - `ADMIN_COMMISSION`
  - `WITHDRAWAL`
  - `REFUND`
  - `ADJUSTMENT`
  - `BONUS`
- `status`: Filter by status
  - `PENDING`
  - `COMPLETED`
  - `FAILED`
  - `REVERSED`

#### Request Withdrawal
```http
POST /api/v1/billing/withdrawals/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.00,
  "withdrawalMethod": "BANK_TRANSFER",
  "bankAccount": {
    "accountHolder": "John Doe",
    "accountNumber": "****1234",
    "bankName": "Chase Bank",
    "routingNumber": "021000021",
    "accountType": "CHECKING"
  }
}
```

**Or for PayPal:**
```json
{
  "amount": 100.00,
  "withdrawalMethod": "PAYPAL",
  "paypalEmail": "user@example.com"
}
```

**Or for Crypto:**
```json
{
  "amount": 100.00,
  "withdrawalMethod": "CRYPTO",
  "cryptoAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42453",
  "cryptoNetwork": "ETHEREUM"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request created successfully",
  "data": {
    "withdrawalRequest": {
      "_id": "...",
      "amount": 100.00,
      "status": "PENDING",
      "withdrawalMethod": "BANK_TRANSFER",
      "createdAt": "2026-01-22T15:45:00Z"
    }
  }
}
```

#### Get My Withdrawal Requests
```http
GET /api/v1/billing/withdrawals/my-requests?status=PENDING
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status

#### Get Commission Configuration
```http
GET /api/v1/billing/commission-config
```

**Response:**
```json
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

### Admin Endpoints

#### Get Admin Billing Overview
```http
GET /api/v1/billing/admin/overview
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "adminEarnings": {
      "balance": 5000.00,
      "totalEarnings": 5500.00,
      "totalWithdrawals": 500.00,
      "transactions": [...]
    },
    "adminBilling": {...},
    "pendingWithdrawals": [...],
    "recentTransactions": [...]
  }
}
```

#### Get All Withdrawal Requests
```http
GET /api/v1/billing/admin/withdrawals?status=PENDING
Authorization: Bearer <admin_token>
```

#### Process Withdrawal Request (Approve/Reject)
```http
POST /api/v1/billing/admin/withdrawals/{id}/process
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "approved": true,
  "transactionHash": "0x123abc...",
  "estimatedArrivalDate": "2026-01-25T00:00:00Z"
}
```

**Or to reject:**
```json
{
  "approved": false,
  "failureReason": "Invalid account number"
}
```

#### Mark Withdrawal as Completed
```http
POST /api/v1/billing/admin/withdrawals/{id}/complete
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "trackingNumber": "TRACK123456",
  "completedAt": "2026-01-24T10:30:00Z"
}
```

#### Adjust User Balance
```http
POST /api/v1/billing/admin/adjust-balance/{userId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "amount": 50.00,
  "reason": "Promotional bonus"
}
```

## Data Models

### Billing Model

```javascript
{
  _id: ObjectId,
  user: ObjectId,                    // Reference to User
  accountType: "USER" | "ADMIN",     // Type of account
  balance: Number,                   // Current available balance
  totalEarnings: Number,             // Cumulative earnings
  totalWithdrawals: Number,          // Cumulative withdrawals
  currency: "USD",                   // Currency code
  transactions: [ObjectId],          // Array of BillingTransaction IDs
  withdrawalRequests: [ObjectId],    // Array of WithdrawalRequest IDs
  bankAccount: {
    accountHolder: String,
    accountNumber: String,           // Should be encrypted in production
    bankName: String,
    routingNumber: String,           // Should be encrypted in production
    accountType: "CHECKING" | "SAVINGS",
    isVerified: Boolean,
    verifiedAt: Date
  },
  paypalEmail: String,
  cryptoAddress: String,
  lastWithdrawalAt: Date,
  minimumWithdrawalAmount: Number,   // Default: 10
  isActive: Boolean,                 // Suspend account if needed
  suspendedReason: String,
  suspendedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### BillingTransaction Model

```javascript
{
  _id: ObjectId,
  billing: ObjectId,                 // Reference to Billing account
  user: ObjectId,                    // Reference to User
  type: "PURCHASE_EARNINGS" | "ADMIN_COMMISSION" | "WITHDRAWAL" | 
        "REFUND" | "ADJUSTMENT" | "BONUS",
  amount: Number,                    // Can be positive or negative
  currency: "USD",
  description: String,               // Human-readable description
  relatedTransaction: ObjectId,      // Reference to Transaction (purchase)
  relatedPurchase: ObjectId,         // Reference to Purchase record
  relatedWithdrawal: ObjectId,       // Reference to WithdrawalRequest
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED",
  metadata: Map,                     // Additional context (flexible)
  processedBy: ObjectId,             // Admin who processed (for adjustments)
  createdAt: Date,
  updatedAt: Date
}
```

### WithdrawalRequest Model

```javascript
{
  _id: ObjectId,
  billing: ObjectId,                 // Reference to Billing account
  user: ObjectId,                    // Reference to User
  amount: Number,
  currency: "USD",
  status: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | 
          "FAILED" | "CANCELLED",
  withdrawalMethod: "BANK_TRANSFER" | "PAYPAL" | "CRYPTO",
  bankAccount: {
    accountHolder: String,
    accountNumber: String,
    bankName: String,
    routingNumber: String
  },
  paypalEmail: String,
  cryptoAddress: String,
  cryptoNetwork: String,
  transactionHash: String,           // For crypto withdrawals
  trackingNumber: String,            // For bank transfers
  estimatedArrivalDate: Date,
  completedAt: Date,
  failureReason: String,
  notes: String,
  processedBy: ObjectId,             // Admin who processed
  createdAt: Date,
  updatedAt: Date
}
```

## Refund Handling

When a purchase is refunded:

```javascript
1. User requests refund
   └─ /api/v1/transactions/{id}/requestRefund

2. Admin approves refund
   └─ /api/v1/transactions/{id}/processRefund

3. BILLING REVERSAL:
   ├─ Call billingService.recordRefund()
   ├─ Create REFUND BillingTransaction for ADMIN (-$10)
   ├─ Create REFUND BillingTransaction for Rule Creator (-$90)
   ├─ Update Billing.balance (reduce for both)
   └─ Keep totalEarnings unchanged (historical record)
```

## Security & Best Practices

### Encryption
- Bank account numbers should be encrypted at rest (currently stored plaintext for demo)
- Routing numbers should be encrypted at rest
- Crypto private keys should never be stored

### Audit Trail
- All billing transactions are immutable
- Every change is recorded with user/admin who made it
- Timestamps for all operations
- Metadata preserved for investigations

### Transaction Integrity
- Atomic operations (purchase + billing distribution happen together)
- Rollback mechanism if distribution fails
- Separate billing transaction failures from purchase failures

### Compliance
- Prepare for KYC (Know Your Customer) verification
- Support for tax reporting (by country/region)
- Withdrawal limits per user
- Suspicious activity detection

## Database Indexes

For optimal performance, the following indexes are created:

```javascript
// Billing
- { user: 1 }
- { accountType: 1 }
- { createdAt: -1 }
- { balance: -1 }

// BillingTransaction
- { billing: 1, createdAt: -1 }
- { user: 1, createdAt: -1 }
- { type: 1 }
- { status: 1 }
- { relatedTransaction: 1 }

// WithdrawalRequest
- { billing: 1, createdAt: -1 }
- { user: 1, status: 1 }
- { status: 1 }
```

## Testing Scenarios

### Scenario 1: Purchase Creates Earnings
```
1. User A purchases Rule by User B ($100)
2. Check Admin Billing:
   - balance: $10.00
   - totalEarnings: $10.00
3. Check User B Billing:
   - balance: $90.00
   - totalEarnings: $90.00
4. Check BillingTransactions: 2 entries created
```

### Scenario 2: Refund Reverses Earnings
```
1. Admin approves refund for purchase
2. Check Admin Billing:
   - balance: $0.00 (reverted from $10)
   - totalEarnings: $10.00 (unchanged - historical)
3. Check User B Billing:
   - balance: $0.00 (reverted from $90)
   - totalEarnings: $90.00 (unchanged - historical)
4. Check BillingTransactions: 4 entries (2 original + 2 refund)
```

### Scenario 3: Withdrawal Request
```
1. User B requests withdrawal of $50
2. Check User B Billing:
   - balance: $40.00 (reduced from $90)
   - totalWithdrawals: still 0 (not completed yet)
3. Check WithdrawalRequest:
   - status: PENDING
   - amount: $50.00
4. Admin approves withdrawal
5. Admin marks as completed
6. Check User B Billing:
   - totalWithdrawals: $50.00
   - balance: $40.00 (unchanged)
```

## Migration from Old System

If migrating from a system without proper billing accounts:

```javascript
// Create Billing accounts for existing users
const users = await User.find();
for (const user of users) {
  await billingService.createBillingAccount(user._id, user.role === "ADMIN" ? "ADMIN" : "USER");
}

// Migrate existing earnings to Billing accounts
// This requires mapping old transaction data to BillingTransaction records
```

## Future Enhancements

1. **Payment Gateway Integration**
   - Stripe Connect for real-time payouts
   - PayPal Commerce Platform
   - Crypto payment processors

2. **Tax & Compliance**
   - W-9 / 1099 tax forms
   - Tax calculation by jurisdiction
   - Automated tax reporting

3. **Advanced Reporting**
   - Earnings over time (charts)
   - Commission breakdown
   - Withdrawal history
   - Tax summaries

4. **Fraud Detection**
   - Unusual activity alerts
   - Multiple withdrawal methods flag
   - Chargebacks tracking

5. **Commission Flexibility**
   - Tiered commission based on volume
   - Special rates for verified contributors
   - Promotional commission rates

## Troubleshooting

### Billing Account Not Created
**Issue:** User can't access billing endpoints
**Solution:** 
```javascript
// Create missing billing account
await billingService.createBillingAccount(userId);
```

### Balance Mismatch
**Issue:** Balance doesn't match transactions
**Solution:**
```javascript
// Recalculate from transactions
const transactions = await BillingTransaction.find({ billing: billingId });
const balance = transactions.reduce((sum, t) => sum + t.amount, 0);
```

### Withdrawal Stuck in PENDING
**Issue:** Admin approval not processed
**Solution:**
1. Check WithdrawalRequest in database
2. Verify approval payload is correct
3. Check admin authorization
4. Process manually if needed

## Support & Contact

For questions about the billing system:
- Check commission configuration: `GET /api/v1/billing/commission-config`
- Review billing documentation in this file
- Check recent transactions: `GET /api/v1/billing/my-transactions`
- For admins: Check overview: `GET /api/v1/billing/admin/overview`
