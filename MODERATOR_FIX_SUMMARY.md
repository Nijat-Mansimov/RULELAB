# Moderator Permission Fix - Summary

**Date:** January 22, 2026  
**Status:** ✅ FIXED

---

## Problem

MODERATOR users were receiving a **403 Forbidden** error with message:
```json
{
    "success": false,
    "message": "Insufficient permissions",
    "code": "FORBIDDEN",
    "requiredRoles": ["ADMIN"],
    "userRole": "MODERATOR"
}
```

This occurred when trying to access the moderation queue to review pending rules.

---

## Root Cause

The **ModeratorPanel** component was calling the **wrong API method**:

```typescript
// ❌ WRONG - Calls /admin/rules endpoint
const response = await api.getRulesForModeration(1, 100, 'UNDER_REVIEW');
```

This method was calling `/api/v1/admin/rules` which is protected by:
```javascript
router.use(hasRole("ADMIN"));  // ← Requires ADMIN role only
```

The correct endpoint should be:
```typescript
// ✅ CORRECT - Calls /moderation/queue endpoint  
const response = await api.getModerationQueue(1, 100, 'UNDER_REVIEW');
```

Which is protected by:
```javascript
hasPermission("rule:approve")  // ← MODERATOR has this permission
```

---

## Solution

### 1. Fixed ModeratorPanel API Call

**File:** `rule-guardian/src/pages/ModeratorPanel.tsx`

Changed:
```typescript
// OLD
const response = await api.getRulesForModeration(1, 100, 'UNDER_REVIEW');

// NEW
const [pending, approved, rejected] = await Promise.all([
  api.getModerationQueue(1, 100, 'UNDER_REVIEW'),
  api.getModerationQueue(1, 100, 'APPROVED'),
  api.getModerationQueue(1, 100, 'REJECTED'),
]);
```

### 2. Updated Data Fetching

Now fetches **all three statuses** (UNDER_REVIEW, APPROVED, REJECTED) in parallel:

```typescript
const fetchPendingRules = async () => {
  const [pending, approved, rejected] = await Promise.all([
    api.getModerationQueue(1, 100, 'UNDER_REVIEW'),
    api.getModerationQueue(1, 100, 'APPROVED'),
    api.getModerationQueue(1, 100, 'REJECTED'),
  ]);

  setPendingRules(pending.data?.rules || []);
  setApprovedRules(approved.data?.rules || []);
  setRejectedRules(rejected.data?.rules || []);
};
```

### 3. Improved Action Handlers

Changed handleApproveRule and handleRejectRule to **refresh all tabs** instead of manually manipulating state:

```typescript
const handleApproveRule = async (ruleId: string) => {
  try {
    await api.approveRule(ruleId, 'Approved by moderator');
    toast({ title: 'Success', description: 'Rule approved successfully' });
    fetchPendingRules(); // ← Refresh all tabs automatically
  } catch (error) {
    toast({ title: 'Error', description: 'Failed to approve rule', variant: 'destructive' });
  }
};
```

---

## Permission Structure

### MODERATOR Role Permissions

```javascript
MODERATOR: [
  "rule:create",      // Can create rules
  "rule:read",        // Can read rules
  "rule:update:any",  // Can update any rule
  "rule:delete:any",  // Can delete any rule
  "rule:approve",     // ✅ Can approve pending rules
  "rule:reject",      // ✅ Can reject pending rules
  "user:moderate"     // ✅ Can issue user warnings
]
```

### Protected Endpoints

| Endpoint | Method | Permission | Role |
|----------|--------|-----------|------|
| `/api/v1/moderation/queue` | GET | `rule:approve` | ✅ MODERATOR+ |
| `/api/v1/moderation/rules/{id}/approve` | POST | `rule:approve` | ✅ MODERATOR+ |
| `/api/v1/moderation/rules/{id}/reject` | POST | `rule:reject` | ✅ MODERATOR+ |
| `/api/v1/admin/rules` | GET | `hasRole("ADMIN")` | ❌ MODERATOR |

---

## UI Changes

The ModeratorPanel now displays **four tabs**:

1. **Review Queue** - UNDER_REVIEW rules waiting for approval/rejection
2. **Dashboard** - Moderation statistics and metrics
3. **Approved** - History of approved rules
4. **Rejected** - History of rejected rules

All tabs are populated from the API endpoints and refresh automatically after actions.

---

## Testing

### ✅ Verified Working

1. MODERATOR users can now access `/api/v1/moderation/queue`
2. Can approve rules → moves to Approved tab
3. Can reject rules → moves to Rejected tab
4. Dashboard shows accurate statistics
5. All tabs refresh automatically after action

### Test Scenario

```bash
# 1. Login as MODERATOR user
POST /api/v1/auth/login
{
  "email": "moderator@example.com",
  "password": "password123"
}

# 2. Access moderation queue (now works!)
GET /api/v1/moderation/queue?page=1&limit=20&status=UNDER_REVIEW
Authorization: Bearer MODERATOR_TOKEN

Response: 200 OK
{
  "success": true,
  "data": {
    "rules": [
      { "_id": "rule123", "title": "...", "status": "UNDER_REVIEW", ... }
    ],
    "pagination": { "total": 5, "page": 1, "limit": 20 }
  }
}

# 3. Approve a rule
POST /api/v1/moderation/rules/rule123/approve
Authorization: Bearer MODERATOR_TOKEN
Body: { "feedback": "Looks good!" }

Response: 200 OK
{
  "success": true,
  "data": { "rule": { "status": "APPROVED" } }
}
```

---

## Files Changed

1. **rule-guardian/src/pages/ModeratorPanel.tsx**
   - Changed `api.getRulesForModeration()` → `api.getModerationQueue()`
   - Updated `fetchPendingRules()` to fetch all 3 statuses in parallel
   - Simplified action handlers to refresh tabs

---

## Cleanup Done

✅ Removed all debug logging from:
- `src/middleware/auth.js`
- `src/routes/moderationRoutes.js`
- `src/models/User.js`

---

## Summary

**Issue:** MODERATOR was calling `/admin/rules` (ADMIN only) instead of `/moderation/queue` (permission-based)

**Fix:** Updated ModeratorPanel to use correct API method and display all three rule statuses

**Result:** ✅ MODERATORs can now access the moderation panel and manage rule reviews

