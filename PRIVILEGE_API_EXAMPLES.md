# Privilege-Based Features - API Usage Examples

## Authentication Context
All examples assume user is authenticated with Bearer token in Authorization header.

---

## VERIFIED_CONTRIBUTOR Features

### 1. Publish a Rule

**Endpoint:** `POST /api/v1/rules/:id/publish`

**Frontend:**
```typescript
const response = await api.publishRule(
  '507f1f77bcf86cd799439011',
  'PUBLIC', 
  {
    isPaid: true,
    price: 29.99
  }
);
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439011/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visibility": "PUBLIC",
    "pricing": {
      "isPaid": true,
      "price": 29.99
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Rule submitted for review",
  "data": {
    "rule": {
      "_id": "507f1f77bcf86cd799439011",
      "title": "SQL Injection Detector",
      "status": "UNDER_REVIEW",
      "visibility": "PUBLIC",
      "pricing": { "isPaid": true, "price": 29.99 },
      "author": "user123"
    }
  }
}
```

---

### 2. Get Rule Analytics

**Endpoint:** `GET /api/v1/rules/:id/analytics`

**Frontend:**
```typescript
const response = await api.getMyRuleAnalytics('507f1f77bcf86cd799439011');

console.log(response.data.analytics);
// {
//   downloads: 156,
//   views: 1200,
//   rating: 4.5,
//   totalRatings: 48,
//   likes: 89,
//   forks: 12,
//   purchases: 28,
//   earnings: 84.00  // 28 purchases × $30 × 0.1
// }
```

**cURL:**
```bash
curl http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439011/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Earnings Breakdown

**Endpoint:** `GET /api/v1/transactions/earnings?period=month`

**Frontend:**
```typescript
// Get earnings for last 30 days
const earningsMonth = await api.getMyEarnings('month');

// Get earnings for last year
const earningsYear = await api.getMyEarnings('year');

// Get all-time earnings
const earningsAll = await api.getMyEarnings('all');

console.log(earningsMonth.data);
// {
//   total: 245.50,
//   breakdown: [
//     { date: "2026-01", amount: 124.30 },
//     { date: "2025-12", amount: 121.20 }
//   ]
// }
```

**cURL:**
```bash
# Last month
curl "http://localhost:5000/api/v1/transactions/earnings?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"

# All time
curl "http://localhost:5000/api/v1/transactions/earnings?period=all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Request Withdrawal

**Endpoint:** `POST /api/v1/transactions/withdraw`

**Frontend:**
```typescript
const response = await api.requestWithdrawal(500.00, 'stripe');

console.log(response);
// {
//   success: true,
//   message: "Withdrawal request submitted",
//   data: {
//     transaction: {
//       _id: "507f1f77bcf86cd799439012",
//       type: "WITHDRAWAL",
//       amount: 500.00,
//       paymentMethod: "stripe",
//       status: "PENDING",
//       createdAt: "2026-01-22T10:30:00Z"
//     }
//   }
// }
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/transactions/withdraw \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "paymentMethod": "stripe"
  }'
```

**Error - Insufficient Balance:**
```json
{
  "success": false,
  "message": "Insufficient balance"
}
```

---

## MODERATOR Features

### 1. Get Moderation Queue

**Endpoint:** `GET /api/v1/moderation/queue?page=1&limit=20&status=UNDER_REVIEW`

**Frontend:**
```typescript
const response = await api.getModerationQueue(1, 20, 'UNDER_REVIEW');

console.log(response.data);
// {
//   rules: [
//     {
//       _id: "507f1f77bcf86cd799439011",
//       title: "SQL Injection Detector",
//       description: "Detects SQL injection attacks...",
//       author: {
//         _id: "user123",
//         username: "john_doe",
//         email: "john@example.com"
//       },
//       status: "UNDER_REVIEW",
//       createdAt: "2026-01-22T08:00:00Z"
//     }
//   ],
//   pagination: {
//     total: 5,
//     page: 1,
//     limit: 20,
//     pages: 1
//   }
// }
```

**cURL:**
```bash
curl "http://localhost:5000/api/v1/moderation/queue?page=1&limit=20&status=UNDER_REVIEW" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Approve a Rule

**Endpoint:** `POST /api/v1/moderation/rules/:id/approve`

**Frontend:**
```typescript
const response = await api.approveRule(
  '507f1f77bcf86cd799439011',
  'Great rule, well documented!'
);

console.log(response);
// {
//   success: true,
//   message: "Rule approved successfully",
//   data: {
//     rule: {
//       _id: "507f1f77bcf86cd799439011",
//       status: "APPROVED",
//       // ... full rule data
//     }
//   }
// }
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/moderation/rules/507f1f77bcf86cd799439011/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Great rule, well documented!"
  }'
```

---

### 3. Reject a Rule

**Endpoint:** `POST /api/v1/moderation/rules/:id/reject`

**Frontend:**
```typescript
const response = await api.rejectRule(
  '507f1f77bcf86cd799439011',
  'Missing MITRE ATT&CK mappings and insufficient documentation'
);

console.log(response);
// {
//   success: true,
//   message: "Rule rejected successfully",
//   data: {
//     rule: {
//       _id: "507f1f77bcf86cd799439011",
//       status: "REJECTED",
//       // ... full rule data
//     }
//   }
// }
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/moderation/rules/507f1f77bcf86cd799439011/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Missing MITRE ATT&CK mappings and insufficient documentation"
  }'
```

---

### 4. Warn a User

**Endpoint:** `POST /api/v1/moderation/users/:id/warn`

**Frontend:**
```typescript
const response = await api.warnUser(
  'user456',
  'Submitted multiple low-quality rules',
  'medium'
);

console.log(response);
// {
//   success: true,
//   message: "User warned successfully",
//   data: {
//     user: {
//       _id: "user456",
//       username: "bad_contributor",
//       email: "bad@example.com"
//     }
//   }
// }
```

**Severity Levels:**
- `'low'` - Warning recorded, user notified
- `'medium'` - Warning recorded, user notified
- `'high'` - Warning recorded, user notified, account disabled temporarily

**cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/moderation/users/user456/warn \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Submitted multiple low-quality rules",
    "severity": "medium"
  }'
```

---

### 5. Get Moderation History

**Endpoint:** `GET /api/v1/moderation/history?page=1&limit=50&moderator=mod123`

**Frontend:**
```typescript
// Get all moderation actions
const history = await api.getModerationHistory(1, 50);

console.log(history.data);
// {
//   history: [
//     {
//       _id: "activity123",
//       user: {
//         _id: "mod123",
//         username: "moderator_john",
//         role: "MODERATOR"
//       },
//       type: "RULE_APPROVED",
//       target: "rule_id",
//       description: "Rule approved",
//       createdAt: "2026-01-22T14:30:00Z"
//     },
//     {
//       _id: "activity124",
//       user: { ... },
//       type: "RULE_REJECTED",
//       target: "rule_id",
//       description: "Missing documentation",
//       createdAt: "2026-01-22T13:15:00Z"
//     }
//   ],
//   pagination: { ... }
// }
```

**cURL:**
```bash
curl "http://localhost:5000/api/v1/moderation/history?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Get Moderation Statistics

**Endpoint:** `GET /api/v1/moderation/stats?period=month`

**Frontend:**
```typescript
const stats = await api.getModerationStats('month');

console.log(stats.data);
// {
//   pendingRules: 5,
//   approvedRules: 23,
//   rejectedRules: 8,
//   actionsByModerator: [
//     {
//       _id: "mod123",
//       count: 12,
//       moderator: [{ username: "john_mod", role: "MODERATOR" }]
//     },
//     {
//       _id: "mod456",
//       count: 19,
//       moderator: [{ username: "sarah_mod", role: "MODERATOR" }]
//     }
//   ],
//   averageReviewTime: 3.5  // hours
// }
```

**Periods:**
- `'week'` - Last 7 days
- `'month'` - Last 30 days (default)
- `'quarter'` - Last 90 days

**cURL:**
```bash
curl "http://localhost:5000/api/v1/moderation/stats?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ADMIN Features (Existing)

Admin can use all MODERATOR features plus:

### 1. Get Admin Users List

**Endpoint:** `GET /api/v1/admin/users?page=1&limit=20`

**Frontend:**
```typescript
const response = await api.getAdminUsers(1, 20, 'VERIFIED_CONTRIBUTOR', 'active');

console.log(response.data);
// {
//   users: [
//     {
//       _id: "user123",
//       username: "contributor_1",
//       email: "user@example.com",
//       role: "VERIFIED_CONTRIBUTOR",
//       isActive: true,
//       isBanned: false,
//       statistics: { totalRules: 5, totalEarnings: 234.50 }
//     }
//   ],
//   pagination: { ... }
// }
```

---

### 2. Suspend User

**Endpoint:** `POST /api/v1/admin/users/:userId/suspend`

**Frontend:**
```typescript
const response = await api.suspendUser(
  'user123',
  'Violation of community guidelines',
  30  // days
);

console.log(response);
// {
//   success: true,
//   message: "User suspended successfully"
// }
```

---

### 3. Update User Role

**Endpoint:** `PUT /api/v1/admin/users/:userId/role`

**Frontend:**
```typescript
const response = await api.updateUserRole('user123', 'VERIFIED_CONTRIBUTOR');

console.log(response);
// {
//   success: true,
//   message: "User role updated successfully"
// }
```

**Valid Roles:**
- USER
- VERIFIED_CONTRIBUTOR
- MODERATOR
- ADMIN

---

## Error Handling Examples

### Missing Permission
```json
{
  "statusCode": 403,
  "message": "Unauthorized: You do not have permission to perform this action"
}
```

### Invalid Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be at least $1"
    }
  ]
}
```

### Resource Not Found
```json
{
  "statusCode": 404,
  "message": "Rule not found"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Failed to publish rule",
  "error": "Internal server error"
}
```

---

## Rate Limiting Considerations

**Current Status:** Rate limiters are DISABLED for testing.  
When enabled, limits will be:
- Auth endpoints: 5 requests per minute
- Payment endpoints: 10 requests per hour
- Reviews: 20 per hour
- User actions: 100 per hour

---

## Postman Collection

A Postman collection with all these examples can be imported from:
- `Postman_Collection.json` (in root directory)

Contains:
- Pre-configured Bearer token auth
- Environment variables for base URL and IDs
- All endpoint examples
- Response validation tests
- Error scenario tests

---

## Testing Script Example

```javascript
// Test Verified Contributor workflow
async function testContributorWorkflow() {
  try {
    // 1. Create draft rule
    const ruleResp = await api.createRule({
      title: 'Test Rule',
      description: 'This is a test rule',
      queryLanguage: 'SIGMA',
      vendor: 'ELASTIC',
      category: 'DETECTION',
      severity: 'HIGH'
    });
    const ruleId = ruleResp._id;

    // 2. Publish rule
    const publishResp = await api.publishRule(ruleId, 'PUBLIC', {
      isPaid: true,
      price: 19.99
    });
    console.log('✓ Rule published:', publishResp.data.rule.status);

    // 3. Get analytics
    const analyticsResp = await api.getMyRuleAnalytics(ruleId);
    console.log('✓ Analytics:', analyticsResp.data.analytics);

    // 4. Get earnings
    const earningsResp = await api.getMyEarnings('month');
    console.log('✓ Earnings:', earningsResp.data.total);

    // 5. Request withdrawal
    if (earningsResp.data.total >= 100) {
      const withdrawResp = await api.requestWithdrawal(100, 'stripe');
      console.log('✓ Withdrawal requested:', withdrawResp.data.transaction.status);
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

// Test Moderator workflow
async function testModeratorWorkflow() {
  try {
    // 1. Get queue
    const queueResp = await api.getModerationQueue(1, 20);
    console.log('✓ Pending rules:', queueResp.data.rules.length);

    if (queueResp.data.rules.length > 0) {
      const ruleId = queueResp.data.rules[0]._id;

      // 2. Approve rule
      const approveResp = await api.approveRule(ruleId);
      console.log('✓ Rule approved:', approveResp.data.rule.status);

      // 3. Get stats
      const statsResp = await api.getModerationStats('month');
      console.log('✓ Stats:', statsResp.data);

      // 4. Get history
      const historyResp = await api.getModerationHistory(1, 50);
      console.log('✓ History entries:', historyResp.data.history.length);
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}
```

---

## Additional Resources

- Full API documentation: `/api/v1` (GET)
- Health check: `/health` (GET)
- Permission model: `src/models/User.js` (User schema)
- Controller implementations:
  - `src/controllers/ruleController.js`
  - `src/controllers/moderationController.js`
  - `src/controllers/transactionController.js`

