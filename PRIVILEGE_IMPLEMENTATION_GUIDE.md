# Privilege-Based Feature Implementation Guide

## Overview
This guide defines specific functionalities for each permission and outlines both backend and frontend implementations.

---

## Permission Structure

### USER Role
**Permissions:**
- `rule:create` - Create draft rules
- `rule:read` - Read published rules
- `rule:update:own` - Update own rules
- `rule:delete:own` - Delete own rules

**Functionalities:**
1. ✅ Create draft rules (max 5 drafts)
2. ✅ View published rules marketplace
3. ✅ Edit own draft rules
4. ✅ Delete own draft rules
5. ✅ Submit rules for review
6. ✅ Create reviews/ratings on rules
7. ✅ Purchase rules
8. ✅ View personal dashboard with draft count

**Backend Endpoints Required:**
- `POST /api/v1/rules` - Create rule (createRule)
- `GET /api/v1/rules` - List all published rules (getRules)
- `PUT /api/v1/rules/:id` - Update own rule (updateRule)
- `DELETE /api/v1/rules/:id` - Delete own rule (deleteRule)
- `POST /api/v1/reviews` - Create review (createReview)

**Status:** ✅ All endpoints exist

---

### VERIFIED_CONTRIBUTOR Role
**Permissions:**
- `rule:create` - Create draft rules
- `rule:read` - Read all rules
- `rule:update:own` - Update own rules
- `rule:delete:own` - Delete own rules
- `rule:publish` - Publish rules to marketplace

**Functionalities:**
1. ✅ All USER functionalities
2. ✅ Publish draft rules directly (no review required)
3. ✅ Access contributor dashboard with earnings
4. ✅ View transaction history (rule purchases)
5. ✅ Set custom pricing for rules
6. ✅ View download/rating analytics
7. ✅ Withdraw earnings
8. ✅ View draft, pending, and published rule tabs
9. ❌ Submit rules for moderator review (if they want feedback)

**Frontend Components:**
- `VerifiedContributorPanel` - Dashboard with tabs
- `RuleEditor` - Enhanced with publish button
- Earnings section with transactions
- Analytics dashboard

**Backend Endpoints Required:**
- `POST /api/v1/rules/:id/publish` - Publish rule ❌ NEEDS IMPLEMENTATION
- `GET /api/v1/contributor/earnings` - Get earnings ❌ NEEDS IMPLEMENTATION
- `GET /api/v1/contributor/transactions` - Get transactions ✅ (via transactionController)
- `POST /api/v1/contributor/withdraw` - Request payout ❌ NEEDS IMPLEMENTATION
- `GET /api/v1/rules/:id/analytics` - Get rule analytics ❌ NEEDS IMPLEMENTATION

**Status:** Partially implemented - Need 4 new endpoints

---

### MODERATOR Role
**Permissions:**
- `rule:create` - Create own rules
- `rule:read` - Read all rules
- `rule:update:any` - Update any rule
- `rule:delete:any` - Delete any rule
- `rule:approve` - Approve pending rules
- `rule:reject` - Reject pending rules
- `user:moderate` - Moderate users (suspend/warn)

**Functionalities:**
1. ✅ Review pending rules submitted by users
2. ✅ Approve/Reject rules with feedback
3. ✅ Edit any user's rule (for corrections)
4. ✅ Delete rules (with audit log)
5. ✅ Suspend users temporarily
6. ✅ Warn users about violations
7. ✅ View moderation queue with stats
8. ✅ Access moderation history
9. ✅ Create own rules
10. ❌ Ban users permanently (ADMIN only)

**Frontend Components:**
- `ModeratorPanel` - Moderation queue with approve/reject
- Moderation history/stats
- User warning system
- Audit logs

**Backend Endpoints Required:**
- `GET /api/v1/moderation/queue` - Get pending rules for review ❌ NEEDS IMPLEMENTATION
- `POST /api/v1/moderation/rules/:id/approve` - Approve rule ✅ (via moderateRule)
- `POST /api/v1/moderation/rules/:id/reject` - Reject rule ✅ (via moderateRule)
- `POST /api/v1/moderation/users/:id/warn` - Warn user ❌ NEEDS IMPLEMENTATION
- `GET /api/v1/moderation/history` - Moderation history ❌ NEEDS IMPLEMENTATION
- `GET /api/v1/moderation/stats` - Moderation stats ❌ NEEDS IMPLEMENTATION
- `PUT /api/v1/rules/:id` - Edit any rule (with permission check) ⚠️ NEEDS PERMISSION VALIDATION

**Status:** Partially implemented - Need 5 new endpoints, 1 permission update

---

### ADMIN Role
**Permissions:**
- `*` - All permissions

**Functionalities:**
1. ✅ All MODERATOR functionalities
2. ✅ Full user management (suspend, ban, role changes)
3. ✅ View platform analytics
4. ✅ Delete any content
5. ✅ View system logs
6. ✅ Manage admin settings
7. ✅ View admin audit logs
8. ❌ Generate platform reports
9. ❌ Configure system policies
10. ❌ Manage rule categories/tags

**Frontend Components:**
- `AdminPanel` - Full dashboard with:
  - User management (suspend, promote, demote, ban)
  - Rule moderation
  - System analytics
  - Settings panel
  - Logs viewer

**Backend Endpoints Required:**
- `POST /api/v1/admin/users/:id/ban` - Ban user permanently ✅ (via suspendUser with long duration)
- `GET /api/v1/admin/analytics` - Platform analytics ✅ (via analyticsController)
- `GET /api/v1/admin/logs` - System logs ✅
- `GET /api/v1/admin/system/report` - Generate report ❌ NEEDS IMPLEMENTATION
- `PUT /api/v1/admin/settings` - Update system settings ❌ NEEDS IMPLEMENTATION

**Status:** Mostly implemented - Need 2 new endpoints

---

## Implementation Priority

### Phase 1: Critical (Week 1)
1. ✅ Verify all rule:create/read/update/delete endpoints work with permission checks
2. ✅ Verify role-based access control in AdminPanel, ModeratorPanel
3. ✅ Test USER can create and submit rules
4. ✅ Test VERIFIED_CONTRIBUTOR can publish rules

### Phase 2: High Priority (Week 2)
1. Add `rule:publish` endpoint for VERIFIED_CONTRIBUTOR
2. Add earnings/transactions endpoints for VERIFIED_CONTRIBUTOR
3. Add moderation queue endpoints for MODERATOR
4. Add user warning system for MODERATOR

### Phase 3: Medium Priority (Week 3)
1. Add analytics endpoints for rules
2. Add moderation history tracking
3. Add system reports generation
4. Add policy management interface

### Phase 4: Low Priority (Week 4)
1. Optimize performance
2. Add caching
3. Add advanced filtering
4. Add export functionality

---

## Missing Endpoints to Implement

### 1. Publish Rule (VERIFIED_CONTRIBUTOR)
```javascript
POST /api/v1/rules/:id/publish
Body: { visibility: 'PUBLIC', pricing?: { isPaid: boolean, price?: number } }
Response: { success, message, rule }
```

### 2. Get Contributor Earnings
```javascript
GET /api/v1/contributor/earnings?period=month|quarter|year|all
Response: { success, total: number, breakdown: [{date, amount}] }
```

### 3. Request Payout (VERIFIED_CONTRIBUTOR)
```javascript
POST /api/v1/contributor/withdraw
Body: { amount: number, paymentMethod: 'stripe|bank' }
Response: { success, message, transactionId }
```

### 4. Get Rule Analytics (Rule Author or Admin)
```javascript
GET /api/v1/rules/:id/analytics
Response: { success, downloads: number, views: number, rating: number, earnings: number }
```

### 5. Moderation Queue
```javascript
GET /api/v1/moderation/queue?status=UNDER_REVIEW&limit=20
Response: { success, data: [rules], pagination }
```

### 6. User Warning System (MODERATOR)
```javascript
POST /api/v1/moderation/users/:id/warn
Body: { reason: string, severity: 'low|medium|high' }
Response: { success, message }
```

### 7. Moderation History (MODERATOR)
```javascript
GET /api/v1/moderation/history?limit=50&page=1
Response: { success, data: [actions], pagination }
```

### 8. System Report Generation (ADMIN)
```javascript
GET /api/v1/admin/reports?type=users|rules|earnings&period=month
Response: { success, report: object }
```

### 9. System Settings Management (ADMIN)
```javascript
PUT /api/v1/admin/settings
Body: { enableUserRegistration: boolean, requireEmailVerification: boolean, ... }
Response: { success, settings }
```

---

## Frontend Implementation Checklist

### ✅ USER Dashboard
- [x] Create rule button
- [x] View draft rules
- [x] View published marketplace
- [x] Basic profile view

### ✅ VERIFIED_CONTRIBUTOR Dashboard
- [x] Create rule button
- [x] Publish rule button
- [x] View earnings
- [x] View transactions
- [x] Analytics per rule
- [ ] Withdraw earnings button (needs endpoint)

### ✅ MODERATOR Dashboard
- [x] Moderation queue (pending rules)
- [x] Approve/Reject buttons
- [ ] User warning interface (needs endpoint)
- [ ] Moderation history view (needs endpoint)
- [ ] Stats dashboard (needs endpoint)

### ✅ ADMIN Dashboard
- [x] User management (list, suspend, promote)
- [x] Rule moderation (approve, reject)
- [x] System analytics
- [x] Settings panel
- [ ] Ban user button (currently uses suspend with long duration)
- [ ] Reports generator (needs endpoint)
- [ ] Advanced logs viewer (needs endpoint)

---

## Permission Validation Strategy

### Backend
1. All route handlers check `req.user.role` against required permission
2. Middleware: `hasPermission(permission)` verifies specific permission
3. Resource ownership: `isOwnerOr(req.user.id, resource.author)` for own-only actions
4. Admin override: Admin role bypasses all permission checks

### Frontend
1. `usePermission` hook checks all permissions at component level
2. `ProtectedRoute` enforces role-based access
3. UI elements conditionally render based on `hasPermission()` result
4. API calls fail gracefully if permission denied

---

## Testing Strategy

### Backend Tests
- [ ] Test each endpoint with appropriate role
- [ ] Test endpoint rejects unauthorized users
- [ ] Test permission hierarchy (ADMIN > MODERATOR > VERIFIED_CONTRIBUTOR > USER)
- [ ] Test audit logging on sensitive operations

### Frontend Tests
- [ ] Test UI shows only permitted features
- [ ] Test buttons disabled/hidden for unauthorized users
- [ ] Test API calls blocked at component level
- [ ] Test error handling for permission denials

### Integration Tests
- [ ] User creates and submits rule → VERIFIED_CONTRIBUTOR publishes → MODERATOR reviews
- [ ] ADMIN suspends user → User cannot login
- [ ] MODERATOR warns user → User sees warning in profile
- [ ] VERIFIED_CONTRIBUTOR withdraws earnings → Transaction logged

---

## Next Steps

1. **Immediate:** Implement missing endpoints (Priority: Publish Rule, Earnings, Moderation Queue)
2. **Short-term:** Add permission validation to all rule operations
3. **Medium-term:** Implement user warning and moderation history
4. **Long-term:** Add advanced analytics and reporting

