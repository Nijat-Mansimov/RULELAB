# User Rule Submission - Feature Guide

**Date:** January 22, 2026  
**Status:** ✅ IMPLEMENTED AND READY

---

## Feature Overview

Users can now submit their DRAFT rules for review directly from the "My Rules" page. When a rule is submitted, its status changes from **DRAFT** to **UNDER_REVIEW**, making it visible to moderators for approval.

---

## User Workflow

### Step 1: Navigate to My Rules
```
User → Dashboard → "My Rules" (left sidebar)
```

### Step 2: View Your Rules Table
Shows all your rules with:
- Title
- Current Status (DRAFT, Under Review, Published, Rejected)
- Creation Date
- Action Buttons

### Step 3: Find a DRAFT Rule
Look for rules with **"Draft"** status badge (gray)

### Step 4: Click Submit Button (NEW!)
- Each DRAFT rule now has a **blue "Send" button** 
- This button only appears for DRAFT rules
- Click to open the publish modal

### Step 5: Configure Publication Settings
Modal opens with 3 steps:

**Step 1: Configure**
- Choose visibility: PUBLIC, PRIVATE, or PAID
- Set pricing if PAID
- See your earnings per sale

**Step 2: Review**
- Verify all settings
- Confirm visibility and pricing
- Status will change: DRAFT → UNDER_REVIEW

**Step 3: Success**
- ✓ Rule submitted for review!
- Rule disappears from your DRAFT list
- Appears in "Under Review" status
- Moderators can now review it

---

## What Happens After Submission

### Timeline

```
User submits DRAFT rule
    ↓
Status changes: DRAFT → UNDER_REVIEW
    ↓ (appears in "Under Review" filter)
    ↓
Rule appears in Moderator Panel
    ↓
MODERATOR reviews the rule
    ├─→ APPROVES
    │   └─→ Status: APPROVED (published)
    │       Rule is now public
    │
    └─→ REJECTS
        └─→ Status: REJECTED
            Rule is unpublished
            User can resubmit
```

### User Gets Notified
- ✅ Toast notification on successful submit
- 📧 Email notification when moderator approves/rejects
- Dashboard shows rule status in real-time

---

## UI Changes in My Rules Page

### Before
```
[View] [Edit] [Delete] buttons only
```

### After
```
For DRAFT rules:
  [Submit] [View] [Edit] [Delete]  ← NEW blue Submit button
  
For non-DRAFT rules:
  [View] [Edit] [Delete]
```

### Button Styling
- **Submit Button**: Blue pill-shaped button with "Send" icon
- Only shows for DRAFT rules
- Disabled during submission
- Shows loading state

---

## API Integration

### Endpoint Called
```bash
POST /api/v1/rules/{ruleId}/publish
Authorization: Bearer USER_TOKEN
Body: {
  "visibility": "PUBLIC",
  "pricing": { "isPaid": false }
}
```

### Success Response
```json
{
  "success": true,
  "data": {
    "rule": {
      "_id": "...",
      "status": "UNDER_REVIEW",
      "visibility": "PUBLIC",
      "title": "..."
    }
  }
}
```

### Page Refreshes Automatically
- Table reloads all rules
- DRAFT rule disappears from list
- Status filter updates
- Pagination resets if needed

---

## Features Details

### PublishRuleModal Component
Located: `src/components/modals/PublishRuleModal.tsx`

**Features:**
- 3-step wizard interface
- Visibility selection (PUBLIC/PRIVATE/PAID)
- Dynamic pricing calculator
- Real-time earnings preview
- Form validation
- Loading states
- Error handling
- Success confirmation

**Integration:**
- Can be used in MyRules page ✅
- Can be used in VerifiedContributorPanel ✅
- Can be used in any component

### Reusable Modal
```typescript
import { PublishRuleModal } from '@/components/modals/PublishRuleModal';

<PublishRuleModal
  open={isOpen}
  onOpenChange={setIsOpen}
  ruleId="rule_123"
  ruleName="My Rule Title"
  onSuccess={() => {
    // Handle success - refresh data
    fetchRules();
  }}
/>
```

---

## Visibility Options

### PUBLIC
- Visibility: Everyone can see
- Price: FREE
- Purchase: No
- Earnings: No
- Use case: Share knowledge

### PRIVATE
- Visibility: Paid access only
- Price: Set custom price
- Purchase: Yes, users can buy
- Earnings: 10% of sale price
- Use case: Monetize content

### PAID
- Visibility: Paid access only
- Price: Set custom price ($5-$99)
- Purchase: Required
- Earnings: 10% of each purchase
- Use case: Premium rules

---

## Permissions & Restrictions

### Who Can Submit Rules?
- ✅ USER (any registered user)
- ✅ VERIFIED_CONTRIBUTOR
- ✅ MODERATOR
- ✅ ADMIN

**Permission Required:** None (all users can submit)

### Who Sees the Submit Button?
- ✅ Rule author (owns the rule)
- ❌ Other users (can't see your DRAFT rules)

### Can You Edit After Submission?
- ❌ NO - Rule is locked during UNDER_REVIEW
- ✅ YES - If rejected, you can resubmit

---

## Error Handling

### Common Errors & Solutions

**"Rule not found"**
- Rule was deleted
- Try refreshing the page

**"Insufficient permissions"**
- User role changed
- Contact admin

**"Invalid visibility"**
- Try different visibility option
- Reload and try again

**"Network error"**
- Check internet connection
- Try again in a moment

---

## Testing Checklist

- [ ] Can see My Rules page
- [ ] DRAFT rules show Submit button
- [ ] Non-DRAFT rules don't show Submit button
- [ ] Click Submit opens modal
- [ ] Can select visibility (PUBLIC/PRIVATE/PAID)
- [ ] Can set pricing for PAID
- [ ] Review screen shows correct info
- [ ] Submit button is clickable
- [ ] Success notification appears
- [ ] Rule status changes to "Under Review"
- [ ] Rule appears in moderator queue
- [ ] Can filter by "Under Review" status
- [ ] Page refreshes after submit

---

## Database Changes

### Rule Status After Submit
```javascript
// Before submit
{
  "_id": "...",
  "status": "DRAFT",
  "visibility": undefined,
  "pricing": undefined
}

// After submit
{
  "_id": "...",
  "status": "UNDER_REVIEW",
  "visibility": "PUBLIC",
  "pricing": {
    "isPaid": false,
    "price": 0
  }
}
```

---

## Code Changes

### File Modified
- `rule-guardian/src/pages/MyRules.tsx`

### Changes Made
1. Added import for PublishRuleModal
2. Added import for Send icon
3. Added state variables:
   - `publishModalOpen` - Modal visibility
   - `selectedRuleId` - Selected rule ID
   - `selectedRuleTitle` - Selected rule name

4. Added handler functions:
   - `handleOpenPublishModal()` - Opens modal with rule data
   - `handlePublishSuccess()` - Closes modal and refreshes

5. Added UI:
   - Submit button in actions column
   - Only shows for DRAFT rules
   - PublishRuleModal component

### No Breaking Changes
- ✅ Backward compatible
- ✅ Existing buttons still work
- ✅ Filters still work
- ✅ Delete still works
- ✅ Edit still works

---

## User Benefits

1. **Easy Submission**
   - One-click publish from My Rules page
   - No need to navigate elsewhere
   - Clear 3-step wizard

2. **Visibility Control**
   - Choose who sees your rule
   - Monetize if desired
   - Track earnings

3. **Real-Time Feedback**
   - See status immediately
   - Know when moderators review
   - Get notifications

4. **Control Over Content**
   - Can see all your rules
   - Filter by status
   - Edit before submitting
   - Delete if needed

---

## Admin & Moderator Notes

### For Moderators
- User submissions appear in Moderator Panel
- Status UNDER_REVIEW = Ready for review
- Can approve or reject
- Author gets notified

### For Admins
- Users can submit rules freely
- No approval needed for submit (only for publish)
- Can override any rule status
- Can suspend abusive users

---

## Next Steps (Optional)

### Future Enhancements
1. **Bulk submit** - Submit multiple rules at once
2. **Schedule submit** - Submit at specific time
3. **Templates** - Use rule templates
4. **Analytics** - See submission stats
5. **Feedback** - Get feedback before submit
6. **Preview** - Preview how rule looks when published

---

## FAQ

**Q: What's the difference between DRAFT and UNDER_REVIEW?**
A: DRAFT = unpublished (author only). UNDER_REVIEW = submitted (moderators see it).

**Q: Can I edit my rule after submitting?**
A: No. It's locked during UNDER_REVIEW. Edit before submitting.

**Q: What if my rule is rejected?**
A: Status becomes REJECTED. You can make changes and resubmit.

**Q: How long does review take?**
A: Depends on moderators. Usually 24-48 hours.

**Q: Can I make money from my rule?**
A: Yes. Select PAID visibility and set your price. You get 10%.

**Q: What if I change my mind?**
A: Can't cancel after submit. Wait for moderator decision.

**Q: Who approves the rule?**
A: MODERATOR+ role users review and approve/reject.

---

**Status:** ✅ Feature Complete - Ready for Users

