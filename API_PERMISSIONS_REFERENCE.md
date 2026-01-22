# API Endpoints - Permission Requirements Reference

**Generated:** January 22, 2026  
**Status:** ✅ Complete with Permission Checks

---

## Rule Management Endpoints

### 1. Create Rule (Draft)
```
POST /api/v1/rules
```
**Permission Required:** Authenticated user (any role)  
**Response Status:** 201 Created  
**Default Status:** DRAFT (always)  
**Who Can Call:** USER, VERIFIED_CONTRIBUTOR, MODERATOR, ADMIN

```bash
curl -X POST http://localhost:5000/api/v1/rules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "SQL Injection Detector",
    "description": "Detects SQL injection attacks",
    "queryLanguage": "SIGMA",
    "vendor": "ELASTIC",
    "category": "DETECTION",
    "severity": "HIGH"
  }'

# Response
{
  "success": true,
  "message": "Rule created successfully",
  "data": {
    "rule": {
      "_id": "507f1f77bcf86cd799439011",
      "title": "SQL Injection Detector",
      "status": "DRAFT",  ← Always DRAFT
      "author": "507f1f77bcf86cd799439001"
    }
  }
}
```

---

### 2. Publish Rule (Submit for Review)
```
POST /api/v1/rules/:id/publish
```
**Permission Required:** `rule:publish` (VERIFIED_CONTRIBUTOR+)  
**Ownership Check:** Owner only (or ADMIN)  
**Status Transition:** DRAFT → UNDER_REVIEW  
**Response Status:** 200 OK  
**Who Can Call:**
- ✅ VERIFIED_CONTRIBUTOR (own rules only)
- ✅ MODERATOR (own rules only)
- ✅ ADMIN (any rule)

```bash
# VERIFIED_CONTRIBUTOR publishes own rule
curl -X POST http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439011/publish \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visibility": "PUBLIC",
    "pricing": {
      "isPaid": true,
      "price": 29.99
    }
  }'

# Response
{
  "success": true,
  "message": "Rule submitted for review",
  "data": {
    "rule": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "UNDER_REVIEW",  ← Changed
      "visibility": "PUBLIC",
      "pricing": { "isPaid": true, "price": 29.99 }
    }
  }
}

# USER tries to publish (no rule:publish permission)
curl -X POST http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439011/publish \
  -H "Authorization: Bearer USER_TOKEN"

# Response (403)
{
  "success": false,
  "message": "Insufficient permissions"
}

# VERIFIED_CONTRIBUTOR tries to publish another user's rule
curl -X POST http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439012/publish \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN"

# Response (403)
{
  "success": false,
  "message": "You do not have permission to publish this rule"
}
```

---

### 3. Get Rule Analytics
```
GET /api/v1/rules/:id/analytics
```
**Permission Required:** `rule:read` (any authenticated user)  
**Ownership Check:** Owner only (or ADMIN)  
**Response Status:** 200 OK  
**Who Can Call:**
- ✅ VERIFIED_CONTRIBUTOR (own rules)
- ✅ MODERATOR (own rules)
- ✅ ADMIN (any rule)

```bash
# Rule owner gets analytics
curl -X GET http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439011/analytics \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN"

# Response
{
  "success": true,
  "data": {
    "analytics": {
      "downloads": 156,
      "views": 1200,
      "rating": 4.5,
      "totalRatings": 48,
      "likes": 89,
      "forks": 12,
      "purchases": 28,
      "earnings": 84.00
    }
  }
}

# Non-owner tries to get analytics
curl -X GET http://localhost:5000/api/v1/rules/507f1f77bcf86cd799439012/analytics \
  -H "Authorization: Bearer OTHER_CONTRIBUTOR_TOKEN"

# Response (403)
{
  "success": false,
  "message": "You do not have permission to view analytics"
}
```

---

### 4. Get My Rules
```
GET /api/v1/rules/my-rules
```
**Permission Required:** Authenticated user  
**Response Status:** 200 OK  
**Who Can Call:** All authenticated users (returns only their own rules)

```bash
curl -X GET http://localhost:5000/api/v1/rules/my-rules \
  -H "Authorization: Bearer TOKEN"

# Response
{
  "success": true,
  "data": {
    "rules": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "SQL Injection Detector",
        "status": "DRAFT",
        "author": "507f1f77bcf86cd799439001"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "title": "XSS Detector",
        "status": "UNDER_REVIEW",
        "author": "507f1f77bcf86cd799439001"
      }
    ]
  }
}
```

---

## Moderation Endpoints

### 5. Get Moderation Queue
```
GET /api/v1/moderation/queue
```
**Permission Required:** `rule:approve` (MODERATOR+)  
**Response Status:** 200 OK  
**Who Can Call:**
- ❌ USER
- ❌ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR
- ✅ ADMIN

```bash
# MODERATOR gets queue
curl -X GET "http://localhost:5000/api/v1/moderation/queue?page=1&limit=20&status=UNDER_REVIEW" \
  -H "Authorization: Bearer MODERATOR_TOKEN"

# Response
{
  "success": true,
  "data": {
    "rules": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "SQL Injection Detector",
        "status": "UNDER_REVIEW",
        "author": {
          "_id": "507f1f77bcf86cd799439001",
          "username": "john_doe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}

# VERIFIED_CONTRIBUTOR tries to access queue
curl -X GET "http://localhost:5000/api/v1/moderation/queue" \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN"

# Response (403)
{
  "success": false,
  "message": "Insufficient permissions"
}
```

---

### 6. Approve Rule
```
POST /api/v1/moderation/rules/:ruleId/approve
```
**Permission Required:** `rule:approve` (MODERATOR+)  
**Status Transition:** UNDER_REVIEW → APPROVED  
**Response Status:** 200 OK  
**Who Can Call:**
- ❌ USER
- ❌ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR (any rule)
- ✅ ADMIN (any rule)

```bash
# MODERATOR approves rule
curl -X POST http://localhost:5000/api/v1/moderation/rules/507f1f77bcf86cd799439011/approve \
  -H "Authorization: Bearer MODERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Well documented and comprehensive"
  }'

# Response
{
  "success": true,
  "message": "Rule approved successfully",
  "data": {
    "rule": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "APPROVED",
      "title": "SQL Injection Detector"
    }
  }
}

# VERIFIED_CONTRIBUTOR tries to approve rule
curl -X POST http://localhost:5000/api/v1/moderation/rules/507f1f77bcf86cd799439011/approve \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN"

# Response (403)
{
  "success": false,
  "message": "Insufficient permissions"
}
```

---

### 7. Reject Rule
```
POST /api/v1/moderation/rules/:ruleId/reject
```
**Permission Required:** `rule:reject` (MODERATOR+)  
**Status Transition:** UNDER_REVIEW → REJECTED  
**Response Status:** 200 OK  
**Who Can Call:**
- ❌ USER
- ❌ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR (any rule)
- ✅ ADMIN (any rule)

```bash
# MODERATOR rejects rule with reason
curl -X POST http://localhost:5000/api/v1/moderation/rules/507f1f77bcf86cd799439011/reject \
  -H "Authorization: Bearer MODERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Missing MITRE ATT&CK mappings and insufficient documentation"
  }'

# Response
{
  "success": true,
  "message": "Rule rejected successfully",
  "data": {
    "rule": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "REJECTED",
      "title": "SQL Injection Detector"
    }
  }
}
```

---

### 8. Get Moderation History
```
GET /api/v1/moderation/history
```
**Permission Required:** `rule:approve` (MODERATOR+)  
**Response Status:** 200 OK  
**Who Can Call:**
- ❌ USER
- ❌ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR
- ✅ ADMIN

```bash
# MODERATOR views history
curl -X GET "http://localhost:5000/api/v1/moderation/history?page=1&limit=50" \
  -H "Authorization: Bearer MODERATOR_TOKEN"

# Response
{
  "success": true,
  "data": {
    "history": [
      {
        "_id": "activity123",
        "user": {
          "_id": "moderator_id",
          "username": "bob_moderator",
          "role": "MODERATOR"
        },
        "type": "RULE_APPROVED",
        "target": "507f1f77bcf86cd799439011",
        "description": "Rule approved",
        "createdAt": "2026-01-22T14:30:00Z"
      }
    ],
    "pagination": { "total": 45, "page": 1, "limit": 50, "pages": 1 }
  }
}
```

---

### 9. Get Moderation Statistics
```
GET /api/v1/moderation/stats
```
**Permission Required:** `rule:approve` (MODERATOR+)  
**Response Status:** 200 OK  
**Query Params:** `period=month|quarter|year|week`  
**Who Can Call:**
- ❌ USER
- ❌ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR
- ✅ ADMIN

```bash
# MODERATOR views stats for the month
curl -X GET "http://localhost:5000/api/v1/moderation/stats?period=month" \
  -H "Authorization: Bearer MODERATOR_TOKEN"

# Response
{
  "success": true,
  "data": {
    "pendingRules": 5,
    "approvedRules": 23,
    "rejectedRules": 8,
    "actionsByModerator": [
      {
        "_id": "mod123",
        "count": 12,
        "moderator": [
          { "username": "john_mod", "role": "MODERATOR" }
        ]
      }
    ],
    "averageReviewTime": 3.5
  }
}
```

---

### 10. Warn User
```
POST /api/v1/moderation/users/:userId/warn
```
**Permission Required:** `user:moderate` (MODERATOR+)  
**Response Status:** 200 OK  
**Severity Levels:**
- `low` - Warning recorded, user notified
- `medium` - Warning recorded, user notified, flagged
- `high` - Warning recorded, user notified, account disabled  
**Who Can Call:**
- ❌ USER
- ❌ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR
- ✅ ADMIN

```bash
# MODERATOR warns user
curl -X POST http://localhost:5000/api/v1/moderation/users/507f1f77bcf86cd799439002/warn \
  -H "Authorization: Bearer MODERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Submitted multiple low-quality rules",
    "severity": "medium"
  }'

# Response
{
  "success": true,
  "message": "User warned successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439002",
      "username": "bad_contributor",
      "email": "bad@example.com"
    }
  }
}

# USER tries to warn another user
curl -X POST http://localhost:5000/api/v1/moderation/users/507f1f77bcf86cd799439003/warn \
  -H "Authorization: Bearer USER_TOKEN"

# Response (403)
{
  "success": false,
  "message": "Insufficient permissions"
}
```

---

## Transaction/Earnings Endpoints

### 11. Get My Earnings
```
GET /api/v1/transactions/earnings
```
**Permission Required:** `rule:read` (any authenticated user)  
**Response Status:** 200 OK  
**Query Params:** `period=month|quarter|year|all`  
**Who Can Call:**
- ✅ USER (own earnings only)
- ✅ VERIFIED_CONTRIBUTOR (own earnings only)
- ✅ MODERATOR (own earnings only)
- ✅ ADMIN (any earnings)

```bash
# VERIFIED_CONTRIBUTOR views earnings
curl -X GET "http://localhost:5000/api/v1/transactions/earnings?period=month" \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN"

# Response
{
  "success": true,
  "data": {
    "total": 245.50,
    "breakdown": [
      { "date": "2026-01", "amount": 124.30 },
      { "date": "2025-12", "amount": 121.20 }
    ]
  }
}
```

---

### 12. Request Withdrawal
```
POST /api/v1/transactions/withdraw
```
**Permission Required:** `rule:publish` (VERIFIED_CONTRIBUTOR+)  
**Response Status:** 201 Created  
**Validation:**
- `amount >= $1.00`
- `amount <= available balance`
- `paymentMethod in ['stripe', 'bank']`  
**Who Can Call:**
- ❌ USER
- ✅ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR
- ✅ ADMIN

```bash
# VERIFIED_CONTRIBUTOR requests withdrawal
curl -X POST http://localhost:5000/api/v1/transactions/withdraw \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "paymentMethod": "stripe"
  }'

# Response
{
  "success": true,
  "message": "Withdrawal request submitted",
  "data": {
    "transaction": {
      "_id": "txn123",
      "type": "WITHDRAWAL",
      "amount": 500.00,
      "paymentMethod": "stripe",
      "status": "PENDING",
      "createdAt": "2026-01-22T10:30:00Z"
    }
  }
}

# USER tries to withdraw (no rule:publish permission)
curl -X POST http://localhost:5000/api/v1/transactions/withdraw \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{ "amount": 100, "paymentMethod": "stripe" }'

# Response (403)
{
  "success": false,
  "message": "Insufficient permissions"
}
```

---

## Permission Codes Reference

| Code | Meaning | Required For |
|------|---------|--------------|
| `rule:create` | Create new rules (DRAFT) | All users |
| `rule:read` | Read rules | All users |
| `rule:update:own` | Update own rules | Owner + higher |
| `rule:delete:own` | Delete own rules | Owner + higher |
| `rule:update:any` | Update any rule | MODERATOR+ |
| `rule:delete:any` | Delete any rule | MODERATOR+ |
| `rule:publish` | Publish rules | VERIFIED_CONTRIBUTOR+ |
| `rule:approve` | Approve rules | MODERATOR+ |
| `rule:reject` | Reject rules | MODERATOR+ |
| `user:moderate` | Warn users | MODERATOR+ |

---

## Error Response Codes

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | No valid JWT token |
| `FORBIDDEN` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `EMAIL_NOT_VERIFIED` | 403 | User email not verified |

---

## Next Steps

1. ✅ Verify permissions are enforced
2. 🔄 Test each endpoint with different roles
3. 🔄 Validate error responses
4. 🔄 Monitor audit logs
5. 🔄 Document custom permission rules

