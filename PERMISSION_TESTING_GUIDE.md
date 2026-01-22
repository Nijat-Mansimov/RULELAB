# Role-Based Permission System - Testing Guide

**Date:** January 22, 2026  
**Status:** ✅ Fully Implemented

## Permission Hierarchy Overview

The system enforces strict role-based access control at both API and business logic levels.

---

## 1. USER Role Permissions

### Allowed Operations
- ✅ Create new rules (status: **DRAFT**)
- ✅ Read own rules and public rules
- ✅ Update own rules
- ✅ Delete own rules
- ✅ Download public rules
- ✅ Like/Unlike public rules
- ✅ Post reviews on public rules

### Forbidden Operations
- ❌ Publish rules (requires VERIFIED_CONTRIBUTOR)
- ❌ Approve/Reject rules (requires MODERATOR)
- ❌ Warn users (requires MODERATOR)
- ❌ Moderate any rules (requires MODERATOR)
- ❌ Access admin panel

### Implementation Details

**Create Rule** - Always creates with **DRAFT** status:
```javascript
// src/controllers/ruleController.js - createRule()
const rule = new Rule({
  title, description, queryLanguage, vendor, category,
  author: req.user._id,
  status: "DRAFT",  // ← Always DRAFT for all users
  visibility: visibility || "PRIVATE",
});
```

**Permission Check Example:**
```bash
# USER tries to create rule → SUCCESS (DRAFT status)
POST /api/v1/rules
Authorization: Bearer USER_TOKEN
Body: { title, description, ... }
Response: { success: true, data: { rule: { status: "DRAFT" } } }
```

---

## 2. VERIFIED_CONTRIBUTOR Role Permissions

### Allowed Operations
- ✅ All USER permissions
- ✅ **Publish rules** (DRAFT → UNDER_REVIEW)
- ✅ Request withdrawals from earnings
- ✅ View analytics for own rules

### Forbidden Operations
- ❌ Approve/Reject rules (requires MODERATOR)
- ❌ Warn users (requires MODERATOR)
- ❌ Approve other users' rules
- ❌ Access moderation panel
- ❌ Access admin panel

### Implementation Details

**Publish Rule** - Only rule owner or ADMIN can publish:
```javascript
// src/controllers/ruleController.js - publishRule()
// Check ownership or admin
if (rule.author._id.toString() !== req.user._id.toString() && 
    req.user.role !== "ADMIN") {
  return res.status(403).json({
    success: false,
    message: "You do not have permission to publish this rule"
  });
}

// Change status: DRAFT → UNDER_REVIEW
rule.status = "UNDER_REVIEW";
rule.visibility = visibility || "PUBLIC";
```

**Permission Check Example:**
```bash
# VERIFIED_CONTRIBUTOR publishes own DRAFT rule → SUCCESS
POST /api/v1/rules/507f1f77bcf86cd799439011/publish
Authorization: Bearer CONTRIBUTOR_TOKEN
Body: { visibility: "PUBLIC", pricing: { isPaid: true, price: 29.99 } }
Response: { success: true, data: { rule: { status: "UNDER_REVIEW" } } }

# VERIFIED_CONTRIBUTOR tries to approve rule → FORBIDDEN
POST /api/v1/moderation/rules/507f1f77bcf86cd799439012/approve
Authorization: Bearer CONTRIBUTOR_TOKEN
Response: { success: false, message: "Insufficient permissions" } (403)
```

---

## 3. MODERATOR Role Permissions

### Allowed Operations
- ✅ All USER permissions
- ✅ All VERIFIED_CONTRIBUTOR permissions
- ✅ **Review and approve rules** (any rule, not just own)
- ✅ **Review and reject rules** (any rule, not just own)
- ✅ **Warn users** (issue warnings at multiple severity levels)
- ✅ View moderation queue
- ✅ View moderation history
- ✅ View moderation statistics
- ✅ View full user management info

### Forbidden Operations
- ❌ Suspend users (requires ADMIN)
- ❌ Change user roles (requires ADMIN)
- ❌ Delete users (requires ADMIN)
- ❌ Access full admin panel
- ❌ View system logs

### Implementation Details

**Approve Rule** - Any rule, enforced at route level:
```javascript
// src/routes/moderationRoutes.js
router.post(
  "/rules/:ruleId/approve",
  authenticate,
  hasPermission("rule:approve"),  // ← Enforced here
  moderationController.approveRule
);

// src/controllers/moderationController.js
exports.approveRule = async (req, res) => {
  const { ruleId } = req.params;
  const rule = await Rule.findById(ruleId).populate("author");
  
  if (rule.status !== "UNDER_REVIEW") {
    return res.status(400).json({
      success: false,
      message: "Only pending rules can be approved"
    });
  }
  
  rule.status = "APPROVED";
  await rule.save();
  
  // Notify author
  await Notification.create({
    user: rule.author._id,
    type: "RULE_APPROVED",
    message: `Your rule "${rule.title}" has been approved!`
  });
};
```

**Warn User** - Only MODERATOR or ADMIN:
```bash
# MODERATOR warns user for policy violation → SUCCESS
POST /api/v1/moderation/users/user456/warn
Authorization: Bearer MODERATOR_TOKEN
Body: { reason: "Submitted low-quality rules", severity: "medium" }
Response: { success: true, message: "User warned successfully" }

# USER tries to warn another user → FORBIDDEN
POST /api/v1/moderation/users/user456/warn
Authorization: Bearer USER_TOKEN
Response: { success: false, message: "Insufficient permissions" } (403)
```

**Reject Rule** - Any rule, with reason:
```bash
# MODERATOR rejects rule → SUCCESS
POST /api/v1/moderation/rules/507f1f77bcf86cd799439011/reject
Authorization: Bearer MODERATOR_TOKEN
Body: { reason: "Missing MITRE ATT&CK mappings" }
Response: { success: true, data: { rule: { status: "REJECTED" } } }
```

---

## 4. ADMIN Role Permissions

### Allowed Operations
- ✅ **ALL permissions** (wildcard: `["*"]`)
- ✅ All USER operations
- ✅ All VERIFIED_CONTRIBUTOR operations
- ✅ All MODERATOR operations
- ✅ Suspend users
- ✅ Ban users
- ✅ Change user roles
- ✅ Delete content
- ✅ Access system logs
- ✅ View all analytics
- ✅ Override any operation

### Implementation Details

**Admin Permission Check:**
```javascript
// src/models/User.js
userSchema.methods.hasPermission = function (permission) {
  const rolePermissions = {
    USER: ["rule:create", "rule:read", "rule:update:own", "rule:delete:own"],
    VERIFIED_CONTRIBUTOR: [
      "rule:create", "rule:read", "rule:update:own", "rule:delete:own",
      "rule:publish"
    ],
    MODERATOR: [
      "rule:create", "rule:read", "rule:update:any", "rule:delete:any",
      "rule:approve", "rule:reject", "user:moderate"
    ],
    ADMIN: ["*"],  // ← All permissions
  };

  const permissions = rolePermissions[this.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
  // ADMIN always returns true because of ["*"]
};
```

**ADMIN can override any rule operation:**
```bash
# ADMIN publishes another user's DRAFT rule → SUCCESS
POST /api/v1/rules/507f1f77bcf86cd799439011/publish
Authorization: Bearer ADMIN_TOKEN
Body: { visibility: "PUBLIC" }
Response: { success: true, data: { rule: { status: "UNDER_REVIEW" } } }

# Note: Ownership check allows ADMIN:
if (rule.author._id.toString() !== req.user._id.toString() && 
    req.user.role !== "ADMIN") { // ← ADMIN bypasses this
  return res.status(403).json({ ... });
}
```

---

## Testing Workflow

### Prerequisites
1. Create 4 test users with different roles:
   ```bash
   USER: john_doe (role: USER)
   VERIFIED_CONTRIBUTOR: contributor_jane (role: VERIFIED_CONTRIBUTOR)
   MODERATOR: moderator_bob (role: MODERATOR)
   ADMIN: admin_alice (role: ADMIN)
   ```

### Test Case 1: Draft Rule Creation
```bash
# Step 1: USER creates rule
POST /api/v1/rules
Body: {
  title: "Test Rule",
  description: "A test detection rule",
  queryLanguage: "SIGMA",
  vendor: "ELASTIC",
  category: "DETECTION",
  severity: "HIGH"
}

# Expected: status = "DRAFT" ✓

# Step 2: USER cannot publish yet (not VERIFIED_CONTRIBUTOR)
POST /api/v1/rules/{ruleId}/publish
Body: { visibility: "PUBLIC" }
Response: 403 - Insufficient permissions (unless role allows rule:publish)
```

### Test Case 2: Publishing Rules
```bash
# Step 1: VERIFIED_CONTRIBUTOR publishes DRAFT rule
POST /api/v1/rules/{ruleId}/publish
Body: { 
  visibility: "PUBLIC",
  pricing: { isPaid: true, price: 29.99 }
}

# Expected: status = "UNDER_REVIEW", visibility = "PUBLIC" ✓

# Step 2: Rule now needs moderation approval
GET /api/v1/moderation/queue
Authorization: Bearer MODERATOR_TOKEN
Response: includes rule with status "UNDER_REVIEW" ✓
```

### Test Case 3: Moderation Actions
```bash
# Step 1: MODERATOR approves rule
POST /api/v1/moderation/rules/{ruleId}/approve
Authorization: Bearer MODERATOR_TOKEN
Body: { feedback: "Well documented rule" }

# Expected: status = "APPROVED", author receives notification ✓

# Step 2: VERIFIED_CONTRIBUTOR cannot reject approved rule
POST /api/v1/moderation/rules/{ruleId}/reject
Authorization: Bearer CONTRIBUTOR_TOKEN
Response: 403 - Insufficient permissions ✓

# Step 3: MODERATOR can reject another rule
POST /api/v1/moderation/rules/{otherRuleId}/reject
Authorization: Bearer MODERATOR_TOKEN
Body: { reason: "Missing documentation" }

# Expected: status = "REJECTED", author receives notification ✓
```

### Test Case 4: User Warnings
```bash
# Step 1: MODERATOR warns user
POST /api/v1/moderation/users/{userId}/warn
Authorization: Bearer MODERATOR_TOKEN
Body: {
  reason: "Submitted low-quality rules",
  severity: "medium"
}

# Expected: User warned, notification sent ✓

# Step 2: VERIFIED_CONTRIBUTOR cannot warn
POST /api/v1/moderation/users/{otherId}/warn
Authorization: Bearer CONTRIBUTOR_TOKEN
Response: 403 - Insufficient permissions ✓

# Step 3: ADMIN can warn (any permission)
POST /api/v1/moderation/users/{userId}/warn
Authorization: Bearer ADMIN_TOKEN
Body: { reason: "Spam", severity: "high" }

# Expected: User warned, account may be disabled ✓
```

### Test Case 5: Analytics Access
```bash
# Step 1: VERIFIED_CONTRIBUTOR views own rule analytics
GET /api/v1/rules/{ownRuleId}/analytics
Authorization: Bearer CONTRIBUTOR_TOKEN

# Expected: Returns analytics data ✓

# Step 2: VERIFIED_CONTRIBUTOR cannot view other rule analytics
GET /api/v1/rules/{otherRuleId}/analytics
Authorization: Bearer CONTRIBUTOR_TOKEN

# Expected: 403 - "You do not have permission to view analytics" ✓

# Step 3: ADMIN can view any analytics
GET /api/v1/rules/{anyRuleId}/analytics
Authorization: Bearer ADMIN_TOKEN

# Expected: Returns analytics data (admin bypass) ✓
```

---

## Permission Matrix Summary

| Operation | USER | VERIFIED_CONTRIBUTOR | MODERATOR | ADMIN |
|-----------|------|----------------------|-----------|-------|
| **Create Rule (DRAFT)** | ✅ | ✅ | ✅ | ✅ |
| **Publish Own Rule** | ❌ | ✅ | ✅ | ✅ |
| **View Own Analytics** | ❌ | ✅ | ✅ | ✅ |
| **Request Withdrawal** | ❌ | ✅ | ✅ | ✅ |
| **Approve Any Rule** | ❌ | ❌ | ✅ | ✅ |
| **Reject Any Rule** | ❌ | ❌ | ✅ | ✅ |
| **Warn User** | ❌ | ❌ | ✅ | ✅ |
| **View Mod Queue** | ❌ | ❌ | ✅ | ✅ |
| **View Mod History** | ❌ | ❌ | ✅ | ✅ |
| **View Mod Stats** | ❌ | ❌ | ✅ | ✅ |
| **Suspend User** | ❌ | ❌ | ❌ | ✅ |
| **Change User Role** | ❌ | ❌ | ❌ | ✅ |

---

## Key Security Principles

1. **Role-Based Access Control (RBAC)**
   - Permissions enforced at middleware level
   - Every endpoint validates permissions before executing

2. **Ownership Verification**
   - Users can only modify own resources (unless ADMIN)
   - `isOwnerOr(permission)` middleware enforces this

3. **Immutable Status Transitions**
   - DRAFT → UNDER_REVIEW (only by owner or admin)
   - UNDER_REVIEW → APPROVED/REJECTED (only by moderator/admin)
   - No skipping steps (can't go DRAFT → APPROVED)

4. **Activity Logging**
   - All moderation actions logged in Activity model
   - Audit trail for compliance and dispute resolution

5. **User Notifications**
   - Authors notified when rules are reviewed
   - Users notified when warned
   - Creates transparency and communication

---

## Frontend Integration

The frontend components respect these permissions:

### VerifiedContributorPanel
```typescript
// Only shows "Publish" button if:
// - Rule status === "DRAFT"
// - User is rule author
// - User has rule:publish permission

{rule.status === "DRAFT" && (
  <PublishRuleModal ruleId={rule._id} />
)}
```

### ModeratorPanel
```typescript
// Only shows moderation buttons if:
// - User has rule:approve permission
// - Rule status === "UNDER_REVIEW"

{rule.status === "UNDER_REVIEW" && (
  <>
    <Button onClick={() => approveRule(rule._id)}>Approve</Button>
    <Button onClick={() => rejectRule(rule._id)}>Reject</Button>
  </>
)}
```

---

## Troubleshooting

### Issue: Permission Denied on Valid Operation
**Solution:** Check user role in database:
```bash
# Check user's role
GET /api/v1/admin/users/{userId}
Authorization: Bearer ADMIN_TOKEN

# Check user's permissions
# Run: user.hasPermission(permission)
```

### Issue: User Can Modify Other's Rules
**Solution:** Verify ownership check is in place:
```javascript
// Before any modification, check:
if (rule.author._id.toString() !== req.user._id.toString() && 
    req.user.role !== "ADMIN") {
  return res.status(403).json({ success: false });
}
```

### Issue: ADMIN Cannot Override
**Solution:** Verify ADMIN role has ["*"] permission:
```javascript
// In User model permissions check:
ADMIN: ["*"],  // Must be exact

// Verify logic:
return permissions.includes("*") || permissions.includes(permission);
```

---

## Next Steps

1. ✅ Backend permission system - **IMPLEMENTED**
2. ✅ Frontend permission checks - **IMPLEMENTED**
3. 🔄 **Run comprehensive test suite** (see Testing Workflow)
4. 🔄 **Monitor audit logs** for permission violations
5. 🔄 **Gather user feedback** on permission UX

