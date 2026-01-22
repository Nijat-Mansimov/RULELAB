# Moderator Panel - Quick Reference

**Updated:** January 22, 2026 | **Status:** ✅ Production Ready

---

## What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **API Endpoint** | `/admin/rules` (ADMIN only) | `/moderation/queue` (permission-based) |
| **Error** | 403 Forbidden "requiredRoles: [ADMIN]" | ✅ Works correctly |
| **Tab Label** | "Review Queue" | "Pending Rules" |
| **Card Title** | "Pending Rule Reviews" | "Pending Rules" |
| **Data Loading** | Only UNDER_REVIEW | All 3 statuses in parallel |
| **After Approve/Reject** | Manual state updates | Auto-refresh all tabs |

---

## Rule Status Guide

```
Author creates rule
    ↓
DRAFT (unpublished, author only)
    ↓
Author clicks "Publish"
    ↓
UNDER_REVIEW (⭐ VISIBLE IN MODERATOR PANEL)
    ↓
MODERATOR reviews...
    ├→ Approves → APPROVED (public, live)
    └→ Rejects → REJECTED (not public)
```

---

## Moderator Panel Tabs

### 📋 Pending Rules (UNDER_REVIEW)
- Rules waiting for review
- Approve/Reject buttons
- Auto-removes after action

### 📊 Dashboard
- Pending count
- Approved count
- Rejected count
- Avg review time

### ✅ Approved (APPROVED)
- Published rules
- Read-only history
- Visible to public

### ❌ Rejected (REJECTED)
- Rejected rules
- Read-only history
- Not public

---

## Permission Check

```
Is user MODERATOR?
    ↓ YES
Has "rule:approve" permission?
    ↓ YES
Access /moderation/queue
    ↓
See pending rules
```

---

## Testing Checklist

- [ ] Can access Moderator Panel (no 403 error)
- [ ] "Pending Rules" tab shows rules
- [ ] Can approve a rule
- [ ] Rule moves to "Approved" tab
- [ ] Can reject a rule
- [ ] Rule moves to "Rejected" tab
- [ ] Dashboard stats are accurate
- [ ] Non-MODERATOR can't access

---

## Common Questions

**Q: Why don't I see any rules in the panel?**
A: Rules must be UNDER_REVIEW status. Ask rule authors to publish their DRAFT rules first.

**Q: Can I see DRAFT rules?**
A: No. DRAFT rules are unpublished - only the author can see them.

**Q: What happens after I approve a rule?**
A: Rule becomes APPROVED and visible to all users publicly. It appears in "Approved" tab.

**Q: Can I edit rules?**
A: No. Moderators can only approve or reject. Authors can edit their DRAFT rules.

**Q: Why did I get a 403 error?**
A: Your user wasn't MODERATOR role. Check with admin to upgrade your role.

---

## Database Query Reference

```bash
# Find all DRAFT rules (not in moderation queue)
db.rules.find({ status: "DRAFT" })

# Find all UNDER_REVIEW rules (in moderation queue)
db.rules.find({ status: "UNDER_REVIEW" })

# Find all APPROVED rules
db.rules.find({ status: "APPROVED" })

# Find all REJECTED rules
db.rules.find({ status: "REJECTED" })

# Check a user's role
db.users.findOne({ email: "user@example.com" }).role
```

---

## API Endpoints

### Get Pending Rules (MODERATOR)
```bash
GET /api/v1/moderation/queue?status=UNDER_REVIEW
Authorization: Bearer MODERATOR_TOKEN

Response: 200 OK
{ "data": { "rules": [...], "pagination": {...} } }
```

### Approve Rule (MODERATOR)
```bash
POST /api/v1/moderation/rules/{ruleId}/approve
Authorization: Bearer MODERATOR_TOKEN
Body: { "feedback": "Looks good!" }

Response: 200 OK
{ "data": { "rule": { "status": "APPROVED" } } }
```

### Reject Rule (MODERATOR)
```bash
POST /api/v1/moderation/rules/{ruleId}/reject
Authorization: Bearer MODERATOR_TOKEN
Body: { "reason": "Needs improvements" }

Response: 200 OK
{ "data": { "rule": { "status": "REJECTED" } } }
```

---

## Files Changed

✅ `rule-guardian/src/pages/ModeratorPanel.tsx`
- API calls updated
- Data loading improved
- Labels fixed
- Auto-refresh added

📄 Documentation created:
- `MODERATOR_FIX_SUMMARY.md`
- `MODERATOR_TESTING_GUIDE.md`
- `RULE_STATUS_LIFECYCLE.md`
- `MODERATOR_PANEL_COMPLETE.md`

---

**Need help?** Check the detailed docs in the project root folder.

