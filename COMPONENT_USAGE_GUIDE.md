# Frontend Component Usage Guide - Privilege Features

## Overview

This document describes the new UI components created for Phase 2 implementation of privilege-based features.

## New Components

### 1. PublishRuleModal

**Location:** `src/components/modals/PublishRuleModal.tsx`

**Purpose:** Allows VERIFIED_CONTRIBUTOR to submit draft rules for public review

**Features:**
- Multi-step modal (config → review → success)
- Visibility selection (PUBLIC / PRIVATE / PAID)
- Dynamic pricing with suggested tiers
- Validation for paid rules
- Success confirmation with rule status change

**Usage:**
```tsx
import { PublishRuleModal } from '@/components/modals/PublishRuleModal';

const [publishModalOpen, setPublishModalOpen] = useState(false);
const [publishRuleId, setPublishRuleId] = useState('');
const [publishRuleName, setPublishRuleName] = useState('');

const handleOpenPublishModal = (rule: Rule) => {
  setPublishRuleId(rule._id || '');
  setPublishRuleName(rule.title);
  setPublishModalOpen(true);
};

// In component:
<PublishRuleModal
  open={publishModalOpen}
  onOpenChange={setPublishModalOpen}
  ruleId={publishRuleId}
  ruleName={publishRuleName}
  onSuccess={handlePublishSuccess}
/>

// In button:
<Button onClick={() => handleOpenPublishModal(rule)}>Publish</Button>
```

**Props:**
- `open: boolean` - Modal visibility
- `onOpenChange: (open: boolean) => void` - Visibility change handler
- `ruleId: string` - ID of rule to publish
- `ruleName: string` - Display name of rule
- `onSuccess?: () => void` - Optional callback on successful publish

**API Calls:**
- `api.publishRule(ruleId, visibility, pricing)`

---

### 2. WithdrawEarningsModal

**Location:** `src/components/modals/WithdrawEarningsModal.tsx`

**Purpose:** Enables VERIFIED_CONTRIBUTOR to request payout from earnings

**Features:**
- Multi-step modal (amount → method → review → success)
- Current balance display
- Quick amount buttons for common values
- Fee breakdown (2.5% processing fee)
- Payment method selection (Stripe / Bank transfer)
- Earnings breakdown visualization
- Validation for minimum amount ($1.00)

**Usage:**
```tsx
import { WithdrawEarningsModal } from '@/components/modals/WithdrawEarningsModal';

const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
const [earnings, setEarnings] = useState(0);

<WithdrawEarningsModal
  open={withdrawModalOpen}
  onOpenChange={setWithdrawModalOpen}
  currentBalance={earnings}
  onSuccess={handleWithdrawSuccess}
/>

// In button:
<Button onClick={() => setWithdrawModalOpen(true)}>Request Payout</Button>
```

**Props:**
- `open: boolean` - Modal visibility
- `onOpenChange: (open: boolean) => void` - Visibility change handler
- `currentBalance: number` - User's current earnings balance
- `onSuccess?: () => void` - Optional callback on successful withdrawal

**API Calls:**
- `api.getMyEarnings('year')` - Load earnings breakdown
- `api.requestWithdrawal(amount, paymentMethod)` - Request payout

---

### 3. UserWarningModal

**Location:** `src/components/modals/UserWarningModal.tsx`

**Purpose:** Enables MODERATOR to issue warnings to users for policy violations

**Features:**
- Multi-step modal (reason → severity → review → success)
- Common reason presets
- Custom reason input with detailed notes
- Severity selection (Low / Medium / High) with consequences display
- High severity shows account disable warning
- Complete warning summary before submission

**Usage:**
```tsx
import { UserWarningModal } from '@/components/modals/UserWarningModal';

const [warningModalOpen, setWarningModalOpen] = useState(false);
const [warningUserId, setWarningUserId] = useState('');
const [warningUserName, setWarningUserName] = useState('');

const handleOpenWarningModal = (userId: string, userName: string) => {
  setWarningUserId(userId);
  setWarningUserName(userName);
  setWarningModalOpen(true);
};

<UserWarningModal
  open={warningModalOpen}
  onOpenChange={setWarningModalOpen}
  userId={warningUserId}
  userName={warningUserName}
  onSuccess={() => fetchPendingRules()}
/>

// In button:
<Button onClick={() => handleOpenWarningModal(user._id, user.username)}>
  Warn User
</Button>
```

**Props:**
- `open: boolean` - Modal visibility
- `onOpenChange: (open: boolean) => void` - Visibility change handler
- `userId: string` - ID of user to warn
- `userName: string` - Display name of user
- `onSuccess?: () => void` - Optional callback on successful warning

**API Calls:**
- `api.warnUser(userId, reason, severity)`

---

### 4. ModerationQueueCard

**Location:** `src/components/cards/ModerationQueueCard.tsx`

**Purpose:** Displays individual rule submission in moderation queue with approve/reject actions

**Features:**
- Compact rule card design
- Author and visibility badges
- Rule metadata display (category, severity, pricing)
- Quality indicators (downloads, rating, likes)
- Quick approve/reject buttons
- Time since submission display

**Usage:**
```tsx
import { ModerationQueueCard } from '@/components/cards/ModerationQueueCard';

{pendingRules.map((rule) => (
  <ModerationQueueCard
    key={rule._id}
    rule={rule}
    onApprove={handleApproveRule}
    onReject={handleRejectRule}
  />
))}
```

**Props:**
- `rule: Rule` - Rule object to display
- `onApprove: (ruleId: string) => void | Promise<void>` - Approve handler
- `onReject: (ruleId: string) => void | Promise<void>` - Reject handler
- `isLoading?: boolean` - Show loading state on buttons

**Renders:**
- Rule title and author
- Visibility badge
- Description
- Category, severity, pricing, MITRE mapping
- Download, rating, and like counts
- Approve/Reject buttons

---

### 5. ModerationStatsCards

**Location:** `src/components/cards/ModerationStatsCards.tsx`

**Purpose:** Displays comprehensive moderation statistics dashboard

**Features:**
- Four stat cards (Pending, Approved, Rejected, Avg Review Time)
- Progress bars showing approval/rejection rates
- Distribution breakdown
- Top moderators leaderboard (optional)
- Real-time stat updates

**Usage:**
```tsx
import { ModerationStatsCards } from '@/components/cards/ModerationStatsCards';

<ModerationStatsCards
  pendingRules={stats.pending}
  approvedRules={stats.approved}
  rejectedRules={stats.rejected}
  averageReviewTime={parseFloat(stats.averageReviewTime)}
  topModerators={[
    { name: 'John Doe', actions: 45 },
    { name: 'Jane Smith', actions: 38 },
  ]}
/>
```

**Props:**
- `pendingRules: number` - Count of rules awaiting review
- `approvedRules: number` - Count of approved rules
- `rejectedRules: number` - Count of rejected rules
- `averageReviewTime: number` - Average review time in hours
- `topModerators?: Array<{ name: string; actions: number }>` - Optional leaderboard data

**Renders:**
- Stat cards with icons and colors
- Approval/rejection rate progress bars
- Distribution breakdown grid
- Top moderators list (if provided)

---

## Integration with Existing Panels

### VerifiedContributorPanel Updates

**File:** `src/pages/VerifiedContributorPanel.tsx`

**Changes:**
- Imported PublishRuleModal and WithdrawEarningsModal
- Added modal state management
- Connected Publish button to handleOpenPublishModal()
- Connected Request Payout button to open withdrawModal
- Added onSuccess callbacks to refresh data

**New Features:**
- Users can now publish DRAFT rules
- Users can request earnings withdrawal
- Analytics available for published rules

**Example Workflow:**
```
1. User sees DRAFT rule in "My Rules" tab
2. Clicks "Publish" button
3. PublishRuleModal opens
4. User selects visibility and pricing
5. Confirms publication
6. Rule submitted to moderation queue
7. Success notification shown
8. Rule list refreshed
9. Rule moves to "Pending" status
```

---

### ModeratorPanel Updates

**File:** `src/pages/ModeratorPanel.tsx`

**Changes:**
- Imported ModerationQueueCard and ModerationStatsCards
- Imported UserWarningModal
- Updated Review Queue tab to use card components
- Replaced Dashboard tab with ModerationStatsCards
- Updated API calls to use new endpoints
- Added warning modal state management

**New Features:**
- Better visual organization of pending rules
- Comprehensive statistics dashboard
- Ability to warn users directly
- Enhanced moderation history tracking

**Example Workflow:**
```
1. Moderator views Review Queue tab
2. Sees pending rules as card components
3. Can approve/reject rules with modal
4. Views Dashboard with stats cards
5. Can click Warn User button (future enhancement)
6. User receives warning notification
7. Account flagged/disabled if high severity
```

---

## API Integration

All modals use the following API endpoints:

### PublishRuleModal
```typescript
await api.publishRule(ruleId, visibility, { isPaid, price })
// POST /api/v1/rules/:id/publish
```

### WithdrawEarningsModal
```typescript
await api.getMyEarnings('year')
// GET /api/v1/transactions/earnings?period=year

await api.requestWithdrawal(amount, paymentMethod)
// POST /api/v1/transactions/withdraw
```

### UserWarningModal
```typescript
await api.warnUser(userId, reason, severity)
// POST /api/v1/moderation/users/:id/warn
```

### ModeratorPanel
```typescript
await api.approveRule(ruleId, feedback)
// POST /api/v1/moderation/rules/:id/approve

await api.rejectRule(ruleId, reason)
// POST /api/v1/moderation/rules/:id/reject

await api.getModerationStats(period)
// GET /api/v1/moderation/stats?period=month
```

---

## State Management Pattern

All modals follow a consistent pattern:

```tsx
// 1. Modal visibility state
const [modalOpen, setModalOpen] = useState(false);

// 2. Data state (IDs, values, etc)
const [dataId, setDataId] = useState('');
const [dataValue, setDataValue] = useState('');

// 3. Loading state
const [loading, setLoading] = useState(false);

// 4. Step state (for multi-step modals)
const [step, setStep] = useState<'step1' | 'step2' | 'success'>('step1');

// 5. Open handler
const handleOpen = (id: string, value: string) => {
  setDataId(id);
  setDataValue(value);
  setModalOpen(true);
};

// 6. Success callback
const handleSuccess = async () => {
  // Refresh parent data
  await fetchData();
  // Close modal
  setModalOpen(false);
  // Reset state
  setDataId('');
  setDataValue('');
  setStep('step1');
};
```

---

## Styling & Theme

All components use:
- **UI Library:** shadcn/ui components
- **Styling:** Tailwind CSS
- **Icons:** lucide-react
- **Theme:** Follows application color scheme

### Color Scheme
- **Success:** Green (#10b981)
- **Warning:** Amber (#f59e0b)
- **Error:** Red (#ef4444)
- **Info:** Blue (#3b82f6)
- **Primary:** From application theme

---

## Error Handling

All modals include:
- Input validation with user feedback
- API error handling with toast notifications
- Loading states during async operations
- Proper error messages from backend API

Example error flow:
```tsx
try {
  await api.publishRule(ruleId, visibility, pricing);
  toast({ title: 'Success', description: 'Rule published!' });
  setStep('success');
} catch (error) {
  toast({
    title: 'Error',
    description: error.message || 'Operation failed',
    variant: 'destructive',
  });
}
```

---

## Accessibility

Components include:
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Focus management
- Proper heading hierarchy
- Color contrast compliance

---

## Future Enhancements

Planned additions:
1. Bulk moderation actions
2. Advanced rule filtering in moderation queue
3. Custom reason templates
4. Appeal submission flow
5. Admin override capabilities
6. Bulk withdrawal processing

---

## Testing Checklist

- [ ] PublishRuleModal: Draft rule → Published successfully
- [ ] PublishRuleModal: Paid rule with pricing selected
- [ ] PublishRuleModal: Validation error for missing price
- [ ] WithdrawEarningsModal: Request withdrawal with Stripe
- [ ] WithdrawEarningsModal: Request withdrawal with Bank transfer
- [ ] WithdrawEarningsModal: Insufficient balance error
- [ ] UserWarningModal: Low severity warning issued
- [ ] UserWarningModal: High severity warning disables account
- [ ] ModerationQueueCard: Approve rule workflow
- [ ] ModerationQueueCard: Reject rule workflow
- [ ] ModerationStatsCards: Stats display correctly
- [ ] VerifiedContributorPanel: Publish button visible for DRAFT
- [ ] VerifiedContributorPanel: Payout button accessible
- [ ] ModeratorPanel: Queue displays pending rules
- [ ] ModeratorPanel: Stats update after approval/rejection

---

## File Structure

```
src/
├── components/
│   ├── modals/
│   │   ├── PublishRuleModal.tsx (NEW)
│   │   ├── WithdrawEarningsModal.tsx (NEW)
│   │   └── UserWarningModal.tsx (NEW)
│   └── cards/
│       ├── ModerationQueueCard.tsx (NEW)
│       └── ModerationStatsCards.tsx (NEW)
├── pages/
│   ├── VerifiedContributorPanel.tsx (UPDATED)
│   └── ModeratorPanel.tsx (UPDATED)
└── services/
    └── api.ts (9 new methods added in Phase 1)
```

---

## Deployment Notes

Before deploying to production:
1. Ensure all API endpoints are available on backend
2. Test permission checks on backend
3. Verify email notifications work
4. Check database permissions for Activity logging
5. Test with real moderators/contributors
6. Monitor error rates in production
7. Gather user feedback on UI/UX

