# Backend Response Alignment - Quick Test Guide

## Summary of Fixes

Three functions in the backend were fixed to ensure API responses match actual operation outcomes:

| Function | File | Status | Issue | Fix |
|----------|------|--------|-------|-----|
| `publishRule` | `ruleController.js` (line 799) | ✅ FIXED | Responses didn't reflect successful status change | Restructured validation order, added clarity |
| `approveRule` | `moderationController.js` (line 268) | ✅ FIXED | Generic error messages, missing notifications | Improved messages, added author notification |
| `rejectRule` | `moderationController.js` (line 330) | ✅ FIXED | Generic error messages, missing notifications | Improved messages, added rejection reason notification |

## Test Cases

### Test 1: Submit Draft Rule for Review ✅
**What it tests:** publishRule endpoint alignment

```
1. Create or find a DRAFT rule
2. Call: POST /api/v1/rules/{ruleId}/publish
3. Body: {
     "visibility": "PUBLIC",
     "pricing": { "tier": "STANDARD", "price": 9.99 }
   }

Expected Results:
- Status Code: 200 (success)
- Response.success: true ✅
- Response.message: "Rule submitted for review successfully"
- Database: rule.status = "UNDER_REVIEW"
- Notification: Moderators receive "New Rule Submitted for Review"
```

### Test 2: Try to Publish Non-Draft Rule ❌
**What it tests:** Proper error handling

```
1. Create or find a rule with status != "DRAFT"
2. Call: POST /api/v1/rules/{ruleId}/publish
3. Body: { "visibility": "PUBLIC" }

Expected Results:
- Status Code: 400 (error)
- Response.success: false ✅
- Response.message: "Only draft rules can be published"
- Database: No changes
- Notification: None sent
```

### Test 3: Approve Pending Rule ✅
**What it tests:** approveRule endpoint alignment

```
1. Create or find an UNDER_REVIEW rule
2. Call: POST /api/v1/moderation/rules/{ruleId}/approve

Expected Results:
- Status Code: 200 (success)
- Response.success: true ✅
- Response.message: "Rule approved successfully"
- Database: rule.status = "APPROVED"
- Notification: Rule author receives "Rule Approved"
```

### Test 4: Try to Approve Non-Pending Rule ❌
**What it tests:** Proper error handling

```
1. Create or find a rule with status != "UNDER_REVIEW"
2. Call: POST /api/v1/moderation/rules/{ruleId}/approve

Expected Results:
- Status Code: 400 (error)
- Response.success: false ✅
- Response.message: "Rule must be in UNDER_REVIEW status to approve"
- Database: No changes
- Notification: None sent
```

### Test 5: Reject Pending Rule with Reason ✅
**What it tests:** rejectRule endpoint alignment

```
1. Create or find an UNDER_REVIEW rule
2. Call: POST /api/v1/moderation/rules/{ruleId}/reject
3. Body: { "reason": "Does not meet guidelines" }

Expected Results:
- Status Code: 200 (success)
- Response.success: true ✅
- Response.message: "Rule rejected successfully"
- Database: rule.status = "REJECTED"
- Notification: Rule author receives rejection with reason
```

### Test 6: Try to Reject without Reason ❌
**What it tests:** Validation before database changes

```
1. Create or find an UNDER_REVIEW rule
2. Call: POST /api/v1/moderation/rules/{ruleId}/reject
3. Body: {} (no reason field)

Expected Results:
- Status Code: 400 (error)
- Response.success: false ✅
- Response.message: "Rejection reason is required"
- Database: No changes
- Notification: None sent
```

## Using Postman

### Setup Collection Variable
Set `baseUrl` = `http://localhost:5000` (or your server URL)

### Test publishRule

**Request:**
```
POST {{baseUrl}}/api/v1/rules/[DRAFT_RULE_ID]/publish
Content-Type: application/json
Authorization: Bearer [AUTH_TOKEN]

{
  "visibility": "PUBLIC",
  "pricing": {
    "tier": "STANDARD",
    "price": 9.99
  }
}
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Rule submitted for review successfully",
  "data": {
    "rule": {
      "_id": "...",
      "status": "UNDER_REVIEW",
      "visibility": "PUBLIC",
      "pricing": { "tier": "STANDARD", "price": 9.99 }
    }
  }
}
```

### Test approveRule

**Request:**
```
POST {{baseUrl}}/api/v1/moderation/rules/[UNDER_REVIEW_RULE_ID]/approve
Content-Type: application/json
Authorization: Bearer [MODERATOR_TOKEN]
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Rule approved successfully",
  "data": {
    "rule": {
      "_id": "...",
      "status": "APPROVED"
    }
  }
}
```

### Test rejectRule

**Request:**
```
POST {{baseUrl}}/api/v1/moderation/rules/[UNDER_REVIEW_RULE_ID]/reject
Content-Type: application/json
Authorization: Bearer [MODERATOR_TOKEN]

{
  "reason": "Rule does not meet community guidelines"
}
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Rule rejected successfully",
  "data": {
    "rule": {
      "_id": "...",
      "status": "REJECTED"
    }
  }
}
```

## Key Assertions

### For All Success Operations
- ✅ HTTP Status Code = 200
- ✅ Response.success = true
- ✅ Response has data property with updated rule
- ✅ Rule.status matches expected new status
- ✅ Activity log created
- ✅ Appropriate notification sent

### For All Error Operations  
- ✅ HTTP Status Code = 400 or 403 or 404 (as appropriate)
- ✅ Response.success = false
- ✅ Response.message explains the error
- ✅ Database unchanged (no modifications)
- ✅ No notifications sent

## Validation Rules Applied

### publishRule
1. ✅ Rule must exist
2. ✅ User must be rule owner or admin
3. ✅ Rule must be in DRAFT status

### approveRule
1. ✅ Rule must exist
2. ✅ Rule must be in UNDER_REVIEW status
3. ✅ Only moderators/admins can approve

### rejectRule
1. ✅ Rejection reason must be provided
2. ✅ Rule must exist
3. ✅ Rule must be in UNDER_REVIEW status
4. ✅ Only moderators/admins can reject

## Notification Verification

### When publishRule Succeeds
- **Who gets notified:** All moderators
- **Notification type:** RULE_SUBMITTED
- **Message:** "New Rule Submitted for Review"
- **Includes:** Rule ID, author username

### When approveRule Succeeds
- **Who gets notified:** Rule author
- **Notification type:** RULE_APPROVED
- **Message:** "Your rule has been approved and published to the marketplace"
- **Includes:** Rule ID

### When rejectRule Succeeds
- **Who gets notified:** Rule author
- **Notification type:** RULE_REJECTED
- **Message:** "Your rule was not approved. Reason: [rejection_reason]"
- **Includes:** Rule ID, rejection reason

## Common Issues & Solutions

### Issue: Getting 400 Error on publishRule
**Check:**
- [ ] Is the rule in DRAFT status? (use GET /api/v1/rules/{id} to check)
- [ ] Are you the rule owner or admin? (check user role)
- [ ] Did you include visibility and pricing in request body?

### Issue: Getting 403 Error on publishRule
**Check:**
- [ ] Are you authenticated? (check auth token)
- [ ] Are you the rule owner? (check rule.author matches your user ID)
- [ ] Are you an admin? (check your user role)

### Issue: Getting 400 Error on approveRule
**Check:**
- [ ] Is the rule in UNDER_REVIEW status?
- [ ] Are you a moderator or admin? (check your role)
- [ ] Does the rule exist? (check rule ID is correct)

### Issue: Notifications Not Received
**Check:**
- [ ] Are notifications enabled in your database? (Notification model)
- [ ] Is the Notification model initialized? (check schema)
- [ ] Check application logs for notification creation errors

## Success Criteria

All tests pass when:
1. ✅ publishRule on DRAFT rule: Returns success=true, rule becomes UNDER_REVIEW
2. ✅ publishRule on non-DRAFT: Returns success=false with proper error message
3. ✅ approveRule on UNDER_REVIEW: Returns success=true, rule becomes APPROVED
4. ✅ approveRule on non-UNDER_REVIEW: Returns success=false with proper error message
5. ✅ rejectRule on UNDER_REVIEW with reason: Returns success=true, rule becomes REJECTED
6. ✅ rejectRule without reason: Returns success=false with proper error message
7. ✅ All successful operations create activity logs
8. ✅ All successful operations send appropriate notifications

## Next Steps

1. **Start Backend Server**
   ```bash
   npm start
   ```

2. **Run Tests in Order**
   - Test 1: Submit Draft Rule ✅
   - Test 2: Try to Publish Non-Draft ❌
   - Test 3: Approve Pending Rule ✅
   - Test 4: Try to Approve Non-Pending ❌
   - Test 5: Reject Pending Rule ✅
   - Test 6: Try to Reject without Reason ❌

3. **Verify Notifications**
   - Check database: `db.notifications.find({})`
   - Check activity logs: `db.activities.find({})`

4. **Check Frontend Integration**
   - Submit rule from frontend
   - Verify response handling
   - Verify UI updates correctly

5. **Report Results**
   - Document which tests passed ✅
   - Document which tests failed ❌
   - Include error messages and stack traces
