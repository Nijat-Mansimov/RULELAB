# Search & Public Profile Features - Implementation Guide

## Overview

Two new major features have been added to the RULELAB platform:

1. **Search Functionality** - Search users and rules from the navbar
2. **Public User Profiles** - View any user's public profile and their published rules

---

## Feature 1: Navbar Search Functionality

### What's New

The navbar search input now:
- ✅ Accepts user input
- ✅ Searches both users and rules in real-time
- ✅ Navigates to search results page
- ✅ Displays results in tabs (All, Users, Rules)

### How It Works

#### User Types Search Query

```
1. User clicks search icon or presses Cmd+K
2. Input appears in navbar
3. User types "security" or "@john" or "sigma rules"
4. User presses Enter or clicks search
```

#### Search Results Page

```
/search?q=security

Shows:
├─ All Results Tab
│  ├─ Users matching "security"
│  │  - Avatar
│  │  - Username
│  │  - Bio (if available)
│  │  - Rules published count
│  │  - Average rating
│  └─ Rules matching "security"
│     - Title
│     - Creator
│     - Category
│     - Price (Free/Paid)
│     - Downloads
│     - Rating
├─ Users Tab (dedicated)
│  - All user results
└─ Rules Tab (dedicated)
   - All rule results
```

### Components Created/Modified

**File:** `rule-guardian/src/components/layout/AppHeader.tsx`

Changes:
- Added `useNavigate()` from react-router
- Added `searchQuery` state
- Added `handleSearch()` function
- Added form submission on Enter key
- Updated search input to be functional

**File:** `rule-guardian/src/pages/SearchResults.tsx` (NEW)

- Full search results page
- Tabs for All/Users/Rules
- Real-time search API calls
- Click-through to user profiles and rule details

### API Endpoints Used

```
1. Search Users:
   GET /api/v1/users/search?query={searchQuery}
   
2. Search Rules:
   GET /api/v1/rules?search={searchQuery}&limit=20
```

### Example Searches

```
Search Query: "security"
├─ Returns all users with "security" in name/bio
└─ Returns all rules with "security" in title/description

Search Query: "@john"
├─ Returns user with username "john"
└─ Returns rules authored by "john"

Search Query: "sigma rules"
├─ Returns users interested in sigma
└─ Returns rules about sigma
```

---

## Feature 2: Public User Profiles

### What's New

Any user can now:
- ✅ View any public user's profile
- ✅ See user's published rules
- ✅ See user's statistics (downloads, rating, reviews)
- ✅ Visit user's website/social links
- ✅ Click through to their rules

### How It Works

#### Accessing Public Profiles

```
Option 1: From Search Results
1. Search for user
2. Click on user card
3. Navigate to /profile/{userId}

Option 2: From Rule Detail Page
1. View a rule
2. Click creator's name/avatar
3. Navigate to /profile/{userId}

Option 3: Direct URL
1. Visit: http://localhost:8080/profile/USER_ID
2. Or: http://localhost:8080/users/username
```

#### Profile Page Display

```
┌─────────────────────────────────────────┐
│  User Avatar    | Name (@username)      │
│  Bio text       | Location              │
│  Website link   | Social Media Links    │
│  Email          | Stats                 │
├─────────────────────────────────────────┤
│  Rules Tab              │ About Tab      │
├─────────────────────────────────────────┤
│  Published Rules        │ Bio            │
│  - Rule 1              │ Member Since   │
│  - Rule 2              │ Total Downloads│
│  - Rule 3              │ Avg Rating     │
│                        │ Total Reviews  │
└─────────────────────────────────────────┘
```

### Components Created

**File:** `rule-guardian/src/pages/PublicProfile.tsx` (NEW)

Features:
- User profile header with avatar and info
- Bio, location, website, social links
- Statistics display (rules published, downloads, rating, reviews)
- Two tabs:
  - Rules: All published rules from creator
  - About: User bio and additional info
- Responsive design (mobile-friendly)
- Click-through to individual rules

### Routes Added

```
/profile/:userId
  - View user by ID
  - Example: /profile/507f1f77bcf86cd799439011

/users/:username
  - View user by username
  - Example: /users/john_smith
```

### API Endpoints Used

```
1. Get User Profile by ID:
   GET /api/v1/users/{userId}

2. Get User Profile by Username:
   GET /api/v1/users/username/{username}

3. Get User's Published Rules:
   GET /api/v1/rules?creator={userId}&limit=20
```

### Profile Information Displayed

```
Required:
- Username
- Profile name (first + last)
- User ID
- Email (if available)

Optional:
- Avatar image
- Bio description
- Location
- Website URL
- Social links (Twitter, GitHub, LinkedIn)
- Member since date

Statistics:
- Rules published count
- Total downloads
- Average rating
- Total reviews
```

### User Card Example (from Search)

```
┌─────────────────────────────────┐
│ [Avatar] Name (@username)       │
│          Bio text here...       │
│          5 rules  ⭐ 4.5       │
└─────────────────────────────────┘
```

---

## File Structure

### New Files Created

```
rule-guardian/src/
├── pages/
│   ├── SearchResults.tsx ......... Search results page
│   └── PublicProfile.tsx ......... Public user profile page
```

### Modified Files

```
rule-guardian/src/
├── components/layout/
│   └── AppHeader.tsx ............ Added search functionality
├── App.tsx ...................... Added new routes
```

### Routes Added to App.tsx

```typescript
<Route path="/search" element={<SearchResults />} />
<Route path="/profile/:userId" element={<PublicProfile />} />
<Route path="/users/:username" element={<PublicProfile />} />
```

---

## How to Test

### Test 1: Search Users

```
1. Go to http://localhost:8080
2. Click search input (or Cmd+K)
3. Type a username or partial name
4. Press Enter
5. View search results page
6. Click on a user card
7. Should navigate to /profile/{userId}
```

### Test 2: Search Rules

```
1. Go to http://localhost:8080
2. Click search input
3. Type a rule keyword
4. Press Enter
5. View search results with rules
6. Click on a rule card
7. Should navigate to /rules/{ruleId}
```

### Test 3: View User Profile

```
1. Search for a user
2. Click their card
3. Should see:
   ✓ User avatar and name
   ✓ Bio and location
   ✓ Statistics (rules, downloads, rating)
   ✓ Published rules list
   ✓ Links to each rule
4. Click on a rule in their profile
5. Should navigate to rule detail page
```

### Test 4: Direct Profile URL

```
1. Find a user's ID (from API response)
2. Visit: http://localhost:8080/profile/{userId}
3. Should load user's profile
4. Visit: http://localhost:8080/users/username
5. Should also load user's profile
```

### Test 5: Social Links

```
1. View user profile
2. If user has social links set:
   - Twitter link should appear
   - GitHub link should appear
   - LinkedIn link should appear
3. Click on social links
4. Should open in new tab to correct profile
```

---

## Console Logs (Debug Info)

When search results load, check browser console (F12):

```javascript
// Search API calls
Fetching: GET /api/v1/users/search?query=security
Fetching: GET /api/v1/rules?search=security&limit=20

// Profile API calls
Fetching: GET /api/v1/users/{userId}
Fetching: GET /api/v1/rules?creator={userId}&limit=20
```

---

## Error Handling

### Search Page

If search fails:
```
Error message: "Error searching"
Solution:
1. Check network tab (F12)
2. Verify backend is running
3. Check search query isn't empty
4. Try different search term
```

### Profile Page

If profile not found:
```
Error message: "User not found"
Solution:
1. Verify user ID is correct
2. Check username spelling
3. Confirm user exists in database
4. Try searching for user first
```

---

## Browser Compatibility

✅ Chrome/Chromium
✅ Firefox
✅ Safari
✅ Edge

---

## Mobile Responsiveness

Both search results and profile pages are fully responsive:
- ✅ Mobile (< 640px)
- ✅ Tablet (640px - 1024px)
- ✅ Desktop (> 1024px)

---

## Performance Notes

**Search Results Page:**
- Loads users and rules in parallel
- Results cached by React Query
- Fast fuzzy search on backend

**Profile Page:**
- Lazy loads profile image
- Rules loaded after profile data
- Pagination support for large rule lists

---

## Backend API Requirements

Make sure these endpoints are working on your backend:

```
✓ GET /api/v1/users/search
✓ GET /api/v1/users/:id
✓ GET /api/v1/users/username/:username
✓ GET /api/v1/rules (with search parameter)
✓ GET /api/v1/rules (with creator parameter)
```

---

## Future Enhancements

Possible additions:
- [ ] Advanced filters (by category, price, rating)
- [ ] Search history/suggestions
- [ ] User recommendations based on search
- [ ] Trending searches
- [ ] User followers/following system
- [ ] Direct messaging from profile
- [ ] Report user functionality
- [ ] Follow/unfollow user button

---

## Summary

✅ **Search Feature:**
- Works from navbar
- Searches users and rules
- Displays results on dedicated page
- Tabs for filtering results

✅ **Public Profiles:**
- Accessible from search and direct URLs
- Shows user info, stats, and rules
- Responsive and mobile-friendly
- Full social integration support

Both features are production-ready! 🚀
