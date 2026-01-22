# Paid Rules Access Control - Visual Guide

## Issue Fixed
Your payload had `"visibility": "PAID"` but backend validation rejected it because the enum didn't include "PAID" as a valid value.

**Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{
    "type": "field",
    "value": "PAID",
    "msg": "Invalid value",
    "path": "visibility",
    "location": "body"
  }]
}
```

**Root Cause:** Backend Rule model only had `["PUBLIC", "PRIVATE", "UNLISTED"]` in visibility enum.

**Solution:** Added "PAID" to the visibility enum in `src/models/Rule.js`.

---

## Implementation Overview

### User Interface Changes

#### For Non-Purchasers of Paid Rules:

```
┌─────────────────────────────────────────────────────────┐
│ ← Rules / Potential Kerberoasting - Weak Encryption TGS  │
├─────────────────────────────────────────────────────────┤
│ DRAFT  |  MEDIUM  |  v1.0.0  |  💰 $10                  │
│                                                          │
│ Potential Kerberoasting - Weak Encryption TGS Request   │
│ Detects a high volume of Kerberos Service Ticket...     │
│                                                          │
│ @Author | 0 downloads | 0 likes | 0 forks               │
├─────────────────────────────────────────────────────────┤
│ [Purchase Rule - $10] ◄── Prominent CTA               │
├─────────────────────────────────────────────────────────┤
│  ┌── Rule Content ──┐                                    │
│  │                  │                                    │
│  │ ⚠️  Paid Content - Access Restricted                 │
│  │                                                       │
│  │ This is a premium rule. To access the full rule      │
│  │ content, version history, and reviews, you need      │
│  │ to purchase this rule.                              │
│  │                                                       │
│  │ [Purchase Rule - $10]                                │
│  └──────────────────┘                                    │
│                                                          │
│  Note: Version History and Reviews tabs are HIDDEN      │
└─────────────────────────────────────────────────────────┘
```

#### For Rule Purchasers or Free Rules:

```
┌─────────────────────────────────────────────────────────┐
│ ← Rules / Potential Kerberoasting - Weak Encryption TGS  │
├─────────────────────────────────────────────────────────┤
│ DRAFT  |  MEDIUM  |  v1.0.0                             │
│                                                          │
│ Potential Kerberoasting - Weak Encryption TGS Request   │
│ Detects a high volume of Kerberos Service Ticket...     │
│                                                          │
│ @Author | 0 downloads | 0 likes | 0 forks               │
├─────────────────────────────────────────────────────────┤
│ [❤️ Like] [🔀 Fork] [⬇️ Download]                        │
├─────────────────────────────────────────────────────────┤
│  ┌── Rule Content ──┬─ Version History ─┬─ Reviews ──┐  │
│  │                  │                    │            │  │
│  │ Detection Rule (XQL)         [Copy]   │            │  │
│  │                                       │            │  │
│  │ dataset = xdr_data                    │            │  │
│  │ | filter event_type = ...             │            │  │
│  │ | filter auth_ticket_encryption_type  │            │  │
│  │   = 0x17  // RC4_HMAC encryption      │            │  │
│  │ ...                                    │            │  │
│  │                                       │            │  │
│  └───────────────────────────────────────┴────────────┘  │
│                                                          │
│  All tabs visible and accessible                        │
└─────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. **Intelligent Tab Control**
```typescript
// Only show tabs that user has access to
<TabsTrigger value="content">Rule Content</TabsTrigger>
{hasContentAccess && (
  <>
    <TabsTrigger value="versions">Version History</TabsTrigger>
    <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
  </>
)}
```

### 2. **Conditional Content Rendering**
```typescript
// Each tab checks access and shows appropriate content
{!hasContentAccess && isPaidRule ? (
  <Card className="border-destructive/30 bg-destructive/5">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-destructive">
        <AlertTriangle />
        Paid Content - Access Restricted
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p>This is a premium rule. Purchase required.</p>
      <Button>Purchase Rule - $10</Button>
    </CardContent>
  </Card>
) : (
  // Full content here
)}
```

### 3. **Action Button Logic**
```typescript
{!hasContentAccess && isPaidRule ? (
  <Button className="bg-primary">
    <Download /> Purchase Rule - ${price}
  </Button>
) : (
  <>
    <Button variant="outline"><Heart /> Like</Button>
    <Button variant="outline"><GitFork /> Fork</Button>
    <Button><Download /> Download</Button>
  </>
)}
```

### 4. **Access Control Computation**
```typescript
const isPaidRule = rule && 
  (rule.visibility?.toUpperCase() === 'PAID' || 
   rule.visibility?.toLowerCase() === 'paid');

const hasContentAccess = hasPurchased || !isPaidRule;
```

---

## Data Flow

```
1. User navigates to rule detail page
   ↓
2. fetchRule() calls API: GET /rules/:id
   ↓
3. Backend returns: { rule, hasPurchased }
   ↓
4. Component computes:
   - isPaidRule = rule.visibility === 'PAID'
   - hasContentAccess = hasPurchased || !isPaidRule
   ↓
5. UI renders based on hasContentAccess:
   - If true: Show all content (like purchased or free rule)
   - If false: Show title/description + purchase prompt
```

---

## What's Visible vs Hidden

### Always Visible (All Users)
✅ Rule title
✅ Rule description
✅ Author info
✅ Statistics (downloads, likes, forks, rating)
✅ Status, severity, version badges
✅ Price badge (shows "$10" for paid)
✅ MITRE mappings (sidebar)
✅ Metadata (category, language, vendor, tags)

### Hidden Without Purchase (Paid Rules)
❌ Rule content/query
❌ Version history tab (hidden from tab list)
❌ Reviews tab (hidden from tab list)
❌ Download button
❌ Fork button
❌ Like button (shows purchase instead)

### Always Visible (Free Rules)
✅ Rule content/query
✅ Version history tab
✅ Reviews tab
✅ All action buttons

---

## Database & API

### Model Update
```javascript
// src/models/Rule.js
visibility: {
  type: String,
  enum: ["PUBLIC", "PRIVATE", "UNLISTED", "PAID"],  // ← Added "PAID"
  default: "PRIVATE",
}
```

### Filter Support
- Users can filter rules by visibility including "PAID"
- API properly converts filter values to uppercase
- Frontend dropdown includes "Paid" option

### API Endpoint
```
GET /rules/:id
Response:
{
  "success": true,
  "data": {
    "rule": { ... },
    "hasPurchased": false  // ← Backend checks this
  }
}
```

---

## Testing Your Payload

Now you can send your PAID rule payload:

```json
{
  "title": "Potential Kerberoasting - Weak Encryption TGS Request",
  "description": "Detects a high volume of Kerberos Service Ticket...",
  "version": { "current": "1.0.0", "changelog": [] },
  "queryLanguage": "XQL",
  "vendor": "PALO_ALTO_XSIAM",
  "category": "HUNTING",
  "severity": "MEDIUM",
  "ruleContent": { "query": "..." },
  "visibility": "PAID",  ✅ Now accepted!
  "tags": ["Credential Access", "T1115"],
  "pricing": { "isPaid": true, "price": 10 },
  "status": "UNDER_REVIEW"
}
```

---

## Future Enhancement: Purchase Integration

When implementing actual payment processing:

1. User clicks "Purchase Rule - $10"
2. Opens payment dialog/modal
3. Process payment via Stripe/PayPal
4. Backend creates Purchase record
5. Update user's purchased rules list
6. Frontend automatically grants access
7. User can now access content, download, etc.

```typescript
async handlePurchase() {
  // Opens payment modal
  const paymentResult = await processPayment(rule.pricing.price);
  
  if (paymentResult.success) {
    // Backend creates purchase record
    await api.purchaseRule(rule._id);
    
    // Update local state
    setHasPurchased(true);
    
    // All restricted sections now visible
  }
}
```

---

## Summary

✅ **Fixed**: Backend now accepts "PAID" visibility enum value
✅ **Implemented**: Frontend access control for paid rules
✅ **Filtered**: Users can filter by paid visibility
✅ **UI/UX**: Clear messaging about purchase requirement
✅ **Ready**: For payment integration when needed
