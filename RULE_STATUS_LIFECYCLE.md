# Rule Status and Moderation Flow

**Date:** January 22, 2026

---

## Rule Status Lifecycle

### 1. DRAFT Status
- **Who can create:** Any USER, VERIFIED_CONTRIBUTOR, MODERATOR, ADMIN
- **Visibility:** Only to rule author (not visible to other users)
- **Can edit:** Yes, by owner
- **Can publish:** Only VERIFIED_CONTRIBUTOR+ (must have `rule:publish` permission)
- **In moderation queue:** ❌ NO

**Example from database:**
```json
{
  "_id": "6971a51f83d6c98ca69434cb",
  "title": "AS-REP Roasting - Kerberos Pre-Authentication Disabled Request",
  "status": "DRAFT",
  "author": "6970f3f8e2fac76adf380348"
}
```

### 2. UNDER_REVIEW Status
- **How to reach:** VERIFIED_CONTRIBUTOR publishes their DRAFT rule
- **Visibility:** Only to logged-in users (not public yet)
- **Can edit:** No (locked during review)
- **In moderation queue:** ✅ **YES - VISIBLE IN MODERATOR PANEL**
- **Next states:** APPROVED or REJECTED

### 3. APPROVED Status
- **How to reach:** MODERATOR approves UNDER_REVIEW rule
- **Visibility:** Public (visible to all users)
- **Can edit:** MODERATOR+ can still edit
- **In moderation queue:** ❌ NO (only in history)
- **Status:** Live and available

### 4. REJECTED Status
- **How to reach:** MODERATOR rejects UNDER_REVIEW rule
- **Visibility:** Not public
- **Can edit:** Author can resubmit (converts back to DRAFT)
- **In moderation queue:** ❌ NO (only in history)

---

## Why Your Rule Doesn't Show in Moderator Panel

Your rule has:
```json
"status": "DRAFT"
```

**DRAFT rules do NOT appear in the moderation queue because:**
1. They haven't been submitted for review yet
2. Only the author can see DRAFT rules
3. Moderators only review rules that are explicitly submitted (UNDER_REVIEW status)

---

## How to Make the Rule Visible in Moderator Panel

### Option 1: User Publishes the Rule (Recommended)

**Step 1:** Author logs in and goes to "My Rules"
```
URL: http://localhost:8080/my-rules
```

**Step 2:** Find the DRAFT rule and click "Publish"

**Step 3:** Fill in the publish form:
- Select visibility: PUBLIC, PRIVATE, or PAID
- Set pricing if PAID
- Click "Submit for Review"

**Result:** Rule status changes to `UNDER_REVIEW` → Appears in moderator panel

### Option 2: Manually Change Status in Database

```bash
# Connect to MongoDB
mongosh

# Find your rule
db.rules.findOne({ _id: ObjectId("6971a51f83d6c98ca69434cb") })

# Update status to UNDER_REVIEW
db.rules.updateOne(
  { _id: ObjectId("6971a51f83d6c98ca69434cb") },
  { 
    $set: { 
      status: "UNDER_REVIEW",
      visibility: "PUBLIC",
      updatedAt: new Date()
    } 
  }
)

# Verify
db.rules.findOne({ _id: ObjectId("6971a51f83d6c98ca69434cb") })
# Should show: "status": "UNDER_REVIEW"
```

---

## Rule Publishing Workflow (Frontend)

### 1. User with VERIFIED_CONTRIBUTOR+ role

**In "My Rules" page:**
```
[My Sigma Rule] [Status: DRAFT]
                [Publish] [Edit] [Delete]
```

### 2. Click "Publish" Button

Opens PublishRuleModal with form:

```
Step 1: Configure
  ○ PUBLIC  (Free, visible to all)
  ○ PRIVATE (Paid, restricted access)
  ○ PAID    (Custom price)
  
  Price: $29.99
  Your earnings per sale: $2.99

Step 2: Review
  Title: AS-REP Roasting...
  Visibility: PUBLIC
  Status will change: DRAFT → UNDER_REVIEW

Step 3: Success
  ✓ Rule submitted for review!
  Rule will be reviewed by moderators
```

### 3. Rule Enters Moderation Queue

**Moderator sees rule in:**
- Moderator Panel → "Pending Rules" tab
- Can approve or reject
- Author gets notified

---

## Testing the Complete Flow

### Test Case: From DRAFT to APPROVED

**Prerequisites:**
- User with VERIFIED_CONTRIBUTOR role
- One DRAFT rule created

**Steps:**

1. **Author publishes rule**
   ```
   Frontend: My Rules → Click Publish on DRAFT rule
   Database: status changes DRAFT → UNDER_REVIEW
   ```

2. **Moderator reviews rule**
   ```
   Frontend: Moderator Panel → Pending Rules tab
   Should see the published rule
   Click Approve or Reject
   ```

3. **Verify state change**
   ```
   If Approved: status → APPROVED, visible in Approved tab
   If Rejected: status → REJECTED, visible in Rejected tab
   ```

---

## API Endpoints Reference

### Publish Rule (Author)
```bash
POST /api/v1/rules/{ruleId}/publish
Authorization: Bearer VERIFIED_CONTRIBUTOR_TOKEN
Body: {
  "visibility": "PUBLIC",
  "pricing": { "isPaid": false }
}

Response: 200 OK
{
  "data": {
    "rule": {
      "status": "UNDER_REVIEW",  // Changed from DRAFT
      "visibility": "PUBLIC"
    }
  }
}
```

### Get Moderation Queue (Moderator)
```bash
GET /api/v1/moderation/queue?status=UNDER_REVIEW
Authorization: Bearer MODERATOR_TOKEN

Response: 200 OK
{
  "data": {
    "rules": [
      {
        "_id": "6971a51f...",
        "title": "AS-REP Roasting...",
        "status": "UNDER_REVIEW",  // Only UNDER_REVIEW rules appear
        "author": { "username": "john_doe" }
      }
    ]
  }
}
```

### Approve Rule (Moderator)
```bash
POST /api/v1/moderation/rules/{ruleId}/approve
Authorization: Bearer MODERATOR_TOKEN
Body: { "feedback": "Great rule!" }

Response: 200 OK
{
  "data": {
    "rule": {
      "status": "APPROVED"  // Changed from UNDER_REVIEW
    }
  }
}
```

---

## Summary Table

| Status | Created By | Visible To | In Moderation Queue | Can Edit | Next States |
|--------|-----------|-----------|-------------------|----------|------------|
| **DRAFT** | Any USER+ | Author only | ❌ NO | ✅ YES | UNDER_REVIEW |
| **UNDER_REVIEW** | Auto (publish) | Logged-in users | ✅ **YES** | ❌ NO | APPROVED, REJECTED |
| **APPROVED** | MODERATOR | All (public) | ❌ NO | ✅ MODERATOR+ | - |
| **REJECTED** | MODERATOR | Not public | ❌ NO | ❌ NO | DRAFT (if resubmit) |

---

## Quick Answer

**Q: Why doesn't my DRAFT rule show in Moderator Panel?**

**A:** DRAFT rules are unpublished drafts. To appear in the moderator panel, a rule must be:
1. Published by the author (DRAFT → UNDER_REVIEW)
2. In UNDER_REVIEW status

**To fix:**
- Have the rule author click "Publish" in "My Rules" page
- Or manually update database: `status: "UNDER_REVIEW"`

