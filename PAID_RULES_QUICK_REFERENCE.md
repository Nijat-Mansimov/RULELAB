# Paid Rules Implementation - Quick Reference

## Files Modified

### 1. Backend Model
📄 `src/models/Rule.js` (Line 96)

**Before:**
```javascript
visibility: {
  type: String,
  enum: ["PUBLIC", "PRIVATE", "UNLISTED"],
  default: "PRIVATE",
}
```

**After:**
```javascript
visibility: {
  type: String,
  enum: ["PUBLIC", "PRIVATE", "UNLISTED", "PAID"],
  default: "PRIVATE",
}
```

---

### 2. Frontend Rule Detail Page
📄 `src/pages/RuleDetail.tsx`

#### Added Access Control State (Line ~73)
```typescript
// Computed: Check if rule is paid and user doesn't have access
const isPaidRule = rule && (rule.visibility?.toUpperCase() === 'PAID' || rule.visibility?.toLowerCase() === 'paid');
const hasContentAccess = hasPurchased || !isPaidRule;
```

#### Updated Tab Visibility (Line ~343)
```typescript
<TabsList className="bg-secondary/50">
  <TabsTrigger value="content">Rule Content</TabsTrigger>
  {hasContentAccess && (
    <>
      <TabsTrigger value="versions">Version History</TabsTrigger>
      <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
    </>
  )}
</TabsList>
```

#### Updated Action Buttons (Line ~324)
```typescript
{!hasContentAccess && isPaidRule ? (
  <Button className="gap-2 bg-primary hover:bg-primary/90">
    <Download className="w-4 h-4" />
    Purchase Rule - ${rule?.price || rule?.pricing?.price || 'Contact'}
  </Button>
) : (
  <>
    {/* Like, Fork, Download buttons */}
  </>
)}
```

#### Updated Content Tab (Line ~365)
```typescript
{!hasContentAccess && isPaidRule ? (
  <Card className="border-destructive/30 bg-destructive/5">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-5 h-5" />
        Paid Content - Access Restricted
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This is a premium rule. To access the full rule content, 
        version history, and reviews, you need to purchase this rule.
      </p>
      <Button className="gap-2">
        <Download className="w-4 h-4" />
        Purchase Rule - ${rule?.price || rule?.pricing?.price || 'Contact'}
      </Button>
    </CardContent>
  </Card>
) : (
  {/* Normal content display */}
)}
```

#### Updated Version History Tab (Line ~404)
```typescript
{!hasContentAccess && isPaidRule ? (
  <div className="flex items-start gap-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
    <div className="space-y-2 flex-1">
      <p className="font-medium text-sm text-destructive">Version History Not Available</p>
      <p className="text-sm text-muted-foreground">
        You must purchase this rule to view version history.
      </p>
    </div>
  </div>
) : (
  {/* Normal version history display */}
)}
```

#### Updated Reviews Tab (Line ~505)
```typescript
{!hasContentAccess && isPaidRule ? (
  <Card className="border-destructive/30 bg-destructive/5">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-5 h-5" />
        Reviews Not Available - Paid Content
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Reviews are only available for premium rule holders. 
        Purchase this rule to read and write reviews.
      </p>
    </CardContent>
  </Card>
) : (
  {/* Normal reviews section */}
)}
```

---

### 3. Frontend Filter Component
📄 `src/pages/RulesList.tsx` (Already configured ✅)

**Visibility filter already includes:**
```typescript
const visibilityOptions = [
  { value: 'all', label: 'All Visibility' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'paid', label: 'Paid' },  // ← For filtering paid rules
];
```

---

### 4. Frontend API Service
📄 `src/services/api.ts` (Already configured ✅)

**API properly sends visibility filter:**
```typescript
if (filters.visibility && filters.visibility !== 'all') 
  params.append('visibility', filters.visibility.toUpperCase());
```

---

## Implementation Checklist

### Backend
- [x] Add "PAID" to visibility enum in Rule model
- [x] Backend already returns `hasPurchased` flag with rule

### Frontend
- [x] Add `isPaidRule` and `hasContentAccess` computed values
- [x] Conditionally hide tabs from TabsList when no access
- [x] Show access restriction alert in content tab
- [x] Show access restriction alert in version history tab
- [x] Show access restriction alert in reviews tab
- [x] Replace action buttons with purchase button when no access
- [x] Show price in purchase button
- [x] Style all alerts with destructive colors for visibility

### Filters
- [x] Visibility filter dropdown includes "Paid" option
- [x] API service converts filters to uppercase
- [x] Users can filter rules by paid visibility

### Type Safety
- [x] No TypeScript errors
- [x] No console errors
- [x] Proper null/undefined handling

---

## Usage Examples

### Create a PAID Rule
```bash
POST /api/v1/rules
{
  "title": "Premium Rule",
  "description": "...",
  "visibility": "PAID",  # ✅ Now accepted
  "pricing": {
    "isPaid": true,
    "price": 10
  }
}
```

### View PAID Rule (Without Purchase)
```
User A tries to view paid rule they didn't purchase:
- Sees: Title, description, author, stats
- Sees: Purchase button ($10)
- Cannot see: Rule content, versions, reviews
- Tabs hidden: Version History, Reviews
```

### View PAID Rule (With Purchase)
```
User B has purchased the rule:
- Sees: Everything (title, content, versions, reviews)
- Can: Like, fork, download
- All tabs visible: Rule Content, Version History, Reviews
```

### Filter for PAID Rules
```
User clicks "Visibility" dropdown → "Paid"
API Call: GET /rules?visibility=PAID
Results: Only rules with visibility="PAID"
```

---

## Testing Commands

### 1. Create a PAID rule via API
```bash
curl -X POST http://localhost:5000/api/v1/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Paid Rule",
    "description": "A premium rule",
    "queryLanguage": "SIGMA",
    "vendor": "ELASTIC",
    "category": "DETECTION",
    "severity": "HIGH",
    "visibility": "PAID",
    "ruleContent": {"query": "..."},
    "pricing": {"isPaid": true, "price": 10}
  }'
```

### 2. View rule as non-purchaser
```
Navigate to: http://localhost:8080/rules/{rule-id}
Expected: Purchase prompt, no content visible
```

### 3. Filter by paid rules
```
Navigate to: http://localhost:8080/rules
Select: Visibility → "Paid"
Expected: Only paid rules displayed
```

---

## Common Scenarios

### Scenario 1: New User Views Paid Rule
```
✓ Sees title, description, author
✓ Sees "$10" price badge
✓ Sees "Purchase Rule - $10" button
✗ Cannot see content, versions, reviews
✗ Tabs hidden from tab list
```

### Scenario 2: Rule Author Views Own Paid Rule
```
✓ Sees everything (author = purchaser)
✓ Can view content, versions, reviews
✓ Can edit, fork, download
```

### Scenario 3: Purchaser Views Paid Rule
```
✓ Sees everything
✓ All tabs accessible
✓ Can like, fork, download
✓ Can leave reviews
```

### Scenario 4: Admin Views Unpublished Rule
```
✓ Sees everything
✓ Can moderate, approve, reject
✓ Full access regardless of price
```

---

## Error Recovery

If you still get validation error after updating:

1. **Restart backend:**
   ```bash
   npm run backend:restart
   ```

2. **Clear database cache:**
   - Mongoose caches schema definitions
   - Need fresh server restart

3. **Verify enum was updated:**
   ```bash
   grep -n "enum.*PAID" src/models/Rule.js
   ```

4. **Check all changes saved:**
   ```bash
   git status
   git diff src/models/Rule.js
   ```

---

## Related Files (No Changes Needed)

These files already support paid rules:

- ✅ `src/pages/RulesList.tsx` - Filter UI ready
- ✅ `src/services/api.ts` - Uppercase conversion ready
- ✅ `src/types/index.ts` - Types support visibility
- ✅ `src/hooks/useAuth.tsx` - Auth context ready

---

## Next Steps (Optional)

When ready to implement payment:

1. Install payment library: `npm install stripe @stripe/react-js`
2. Create payment component
3. Add `POST /api/v1/rules/:id/purchase` endpoint
4. Update hasPurchased state after payment
5. Send license key to user email
6. Track purchase analytics

