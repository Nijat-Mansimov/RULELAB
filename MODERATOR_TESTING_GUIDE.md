# Moderator Panel Testing Guide

**Status:** Ready for Testing  
**Date:** January 22, 2026

---

## Quick Start Testing

### 1. Start the Backend

```powershell
cd c:\Users\User.546-LENOVA-PC1\RULELAB
npm run dev
```

Wait for:
```
✓ MongoDB connected
Server running on port 5000
```

### 2. Start the Frontend

```powershell
cd c:\Users\User.546-LENOVA-PC1\RULELAB\rule-guardian
npm run dev
```

Open: `http://localhost:8080`

---

## Test Scenario 1: MODERATOR Accesses Moderation Panel

### Prerequisites
- Have a MODERATOR user account created
- Have some rules in DRAFT/UNDER_REVIEW status

### Steps

1. **Login as MODERATOR**
   - Email: moderator@example.com (or your test account)
   - Password: [your password]
   - Click "Login"

2. **Navigate to Moderator Panel**
   - Look for "Moderator Panel" link in navigation (visible only to MODERATOR+)
   - Click it

3. **Verify Queue Tab**
   - Should see "Review Queue" tab active
   - Should display pending rules awaiting review
   - Should NOT see 403 Forbidden error
   - Card should show rule details: title, author, status, MITRE mappings

### Expected Result
✅ Rules load successfully  
✅ No permission errors  
✅ Pending count matches database

---

## Test Scenario 2: Approve a Rule

### Steps

1. **From Review Queue Tab**
   - Find a rule to approve
   - Click the green "Approve" button on the rule card

2. **Verify Approval**
   - Toast notification: "Rule approved successfully"
   - Rule disappears from "Review Queue" tab
   - Rule appears in "Approved" tab

3. **Check Dashboard**
   - Click "Dashboard" tab
   - Pending count decreased by 1
   - Approved count increased by 1

### Expected Result
✅ Rule moves from UNDER_REVIEW → APPROVED  
✅ Tabs update automatically  
✅ Toast notification appears  
✅ Stats reflect change

### Database Check
```javascript
db.rules.findOne({ title: "Your Test Rule" })
// Should show: "status": "APPROVED"
```

---

## Test Scenario 3: Reject a Rule

### Steps

1. **From Review Queue Tab**
   - Find a different rule to reject
   - Click the red "Reject" button

2. **Verify Rejection**
   - Toast notification: "Rule rejected"
   - Rule disappears from "Review Queue" tab
   - Rule appears in "Rejected" tab

3. **Check Stats**
   - Click "Dashboard" tab
   - Rejected count increased by 1

### Expected Result
✅ Rule moves from UNDER_REVIEW → REJECTED  
✅ Toast notification appears  
✅ Rejected tab now contains the rule  
✅ Stats update correctly

---

## Test Scenario 4: View Approved Rules

### Steps

1. **Click "Approved" Tab**
   - Should show list of all approved rules
   - Each rule shows: title, author, green "Approved" badge

2. **Verify Content**
   - Rules appear in correct tab
   - All approved rules are listed
   - No editing/action buttons (read-only view)

### Expected Result
✅ All approved rules visible  
✅ Correct badge color (green)  
✅ Author information displayed correctly

---

## Test Scenario 5: View Rejected Rules

### Steps

1. **Click "Rejected" Tab**
   - Should show list of all rejected rules
   - Each rule shows: title, author, red "Rejected" badge

2. **Verify Content**
   - Rules appear in correct tab
   - All rejected rules are listed
   - Red border/styling indicates rejection

### Expected Result
✅ All rejected rules visible  
✅ Correct badge color (red)  
✅ Professional rejected styling

---

## Test Scenario 6: Dashboard Statistics

### Steps

1. **Click "Dashboard" Tab**
   - Should show 4 stat cards:
     - Pending (amber) - count of UNDER_REVIEW rules
     - Approved (green) - count of APPROVED rules
     - Rejected (red) - count of REJECTED rules
     - Avg Review Time (blue) - average time taken

2. **Verify Accuracy**
   - Pending count matches UNDER_REVIEW rules in queue
   - Approved count matches approved tab
   - Rejected count matches rejected tab

### Expected Result
✅ All stats display correctly  
✅ Numbers are accurate  
✅ Color coding is intuitive

---

## Test Scenario 7: Permission Denial (USER/VERIFIED_CONTRIBUTOR)

### Steps

1. **Logout and login as USER**
   - Try to access `/moderator` in URL
   - Or look for Moderator Panel link (should be hidden)

2. **Expected Behavior**
   - Cannot see Moderator Panel link
   - If manually navigate: redirected or 403 error
   - Should be protected route

### Expected Result
✅ Non-MODERATOR users cannot access panel  
✅ Routes are properly protected  
✅ No permission errors exposed

---

## API Testing with cURL

### Test 1: Fetch Pending Rules
```bash
curl -X GET "http://localhost:5000/api/v1/moderation/queue?page=1&limit=20&status=UNDER_REVIEW" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with rules array
```

### Test 2: Approve a Rule
```bash
curl -X POST "http://localhost:5000/api/v1/moderation/rules/RULE_ID/approve" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Looks good!"}'

# Expected: 200 OK with updated rule
```

### Test 3: Reject a Rule
```bash
curl -X POST "http://localhost:5000/api/v1/moderation/rules/RULE_ID/reject" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Needs improvements"}'

# Expected: 200 OK with updated rule
```

### Test 4: Get Dashboard Stats
```bash
curl -X GET "http://localhost:5000/api/v1/moderation/stats?period=month" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"

# Expected: 200 OK with statistics
```

---

## Performance Testing

### Test Large Datasets

1. **Create 100+ UNDER_REVIEW rules**
   - Test pagination: `?page=2&limit=50`
   - Verify: Rules load without lag

2. **Approve/Reject Multiple Rules**
   - Try to approve 10 rules in quick succession
   - Verify: All requests succeed
   - Check: Database reflects all changes

### Expected Result
✅ Pagination works correctly  
✅ No performance degradation  
✅ Race conditions handled properly

---

## Edge Cases to Test

### Case 1: Empty Queues
- **Setup:** No UNDER_REVIEW rules exist
- **Action:** Click Review Queue tab
- **Expected:** "No pending reviews - Great job!" message

### Case 2: Rapid Approvals
- **Setup:** 5 pending rules
- **Action:** Approve all 5 in quick succession
- **Expected:** All succeed, queue shows 0 pending

### Case 3: Concurrent Actions
- **Setup:** 2 browser windows, both logged in as MODERATOR
- **Action:** Approve same rule from both windows
- **Expected:** First succeeds, second gets error (rule already APPROVED)

### Case 4: Network Error
- **Setup:** Server goes down while fetching
- **Action:** Try to access moderation panel
- **Expected:** Error toast, graceful degradation

---

## Troubleshooting

### Issue: "Insufficient permissions" 403 Error

**Cause:** Using wrong API endpoint or user lacks permission

**Solution:**
1. Verify user role in database: `db.users.findOne({email: "..."})`
2. Check role includes "MODERATOR"
3. Verify token is valid

### Issue: Rules don't appear in tabs

**Cause:** API not returning data

**Solution:**
1. Check backend logs: `npm run dev` output
2. Verify rules exist in database with correct status
3. Check API response in browser Network tab

### Issue: Toast notifications not appearing

**Cause:** Missing useToast hook

**Solution:**
1. Verify toast provider wraps entire app
2. Check imports in component

### Issue: Dashboard stats incorrect

**Cause:** Stats not refreshing after actions

**Solution:**
1. Stats update when `fetchPendingRules()` is called
2. Verify it's called after approve/reject
3. Check browser console for errors

---

## Checklist Before Production

- [ ] MODERATOR can access moderation panel
- [ ] All three tabs (Queue, Dashboard, History) load
- [ ] Pending rules display correctly
- [ ] Can approve rules
- [ ] Can reject rules
- [ ] Approved tab shows history
- [ ] Rejected tab shows history
- [ ] Dashboard stats are accurate
- [ ] No 403 permission errors
- [ ] Toast notifications appear
- [ ] Pagination works (if > 20 rules)
- [ ] Non-MODERATOR users cannot access
- [ ] API endpoints return correct status codes
- [ ] Database reflects all changes
- [ ] No console errors

---

## Support

If issues occur:
1. Check `MODERATOR_FIX_SUMMARY.md` for overview
2. Review API endpoint documentation in `API_PERMISSIONS_REFERENCE.md`
3. Check permission hierarchy in `PERMISSION_SYSTEM_AZERBAIJANI.md`

