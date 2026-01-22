# Role-Based Permission Enforcement - Technical Details

**Language:** Azerbaijani  
**Implementation Date:** January 22, 2026  
**Status:** ✅ Fully Implemented and Verified

---

## Sistem Təsviri (System Overview)

Rule Guardian platformasında 4 fərqli istifadəçi rolu mövcuddur. Hər rol müəyyən əməliyyatları icra etmək üçün xüsusi imtiyazlara (permissions) malikdir.

---

## 1️⃣ USER Rolu

### Baxışlar (Permissions)
```javascript
["rule:create", "rule:read", "rule:update:own", "rule:delete:own"]
```

### Edə Biləcəyi Əməliyyatlar ✅

#### 1. Yeni Qaydalar Yaratmaq (Rule Oluşturma)
```bash
POST /api/v1/rules
Authorization: Bearer USER_TOKEN
Body: {
  "title": "Yeni Qaidə",
  "description": "Təsviri",
  "queryLanguage": "SIGMA",
  ...
}

Response: 201 Created
{
  "success": true,
  "data": {
    "rule": {
      "status": "DRAFT",  ← HƏMIŞƏ DRAFT olur
      "author": "user_id"
    }
  }
}
```

**Kodda (Backend):**
```javascript
// src/controllers/ruleController.js
exports.createRule = async (req, res) => {
  const rule = new Rule({
    title: req.body.title,
    author: req.user._id,
    status: "DRAFT",  // ← Hər zaman DRAFT
    ...
  });
  await rule.save();
};
```

#### 2. Öz Qaydalarını Redaktə Etmək
```bash
PUT /api/v1/rules/{ruleId}
Authorization: Bearer USER_TOKEN
# Yalnız öz qaydalarını redaktə edə bilər
```

#### 3. Öz Qaydalarını Silmək
```bash
DELETE /api/v1/rules/{ruleId}
Authorization: Bearer USER_TOKEN
# Yalnız öz qaydalarını silə bilər
```

#### 4. Açıq Qaydaları Oxumaq
```bash
GET /api/v1/rules?visibility=PUBLIC
Authorization: Bearer USER_TOKEN
# Açıq qaydaları görmə və yüklə bilər
```

### Edə Bilməyəcəyi Əməliyyatlar ❌

| Əməliyyat | Səbəb |
|-----------|------|
| **Qaidəni Dərc Etmək** | `rule:publish` izni yoxdur |
| **Qaidəni Təsdiq Etmək** | `rule:approve` izni yoxdur |
| **Qaidəni Rədd Etmək** | `rule:reject` izni yoxdur |
| **İstifadəçiyə Xəbərdarlıq Vermək** | `user:moderate` izni yoxdur |
| **Gəlir Əldə Etmə Tələbi** | `rule:publish` izni yoxdur |

---

## 2️⃣ VERIFIED_CONTRIBUTOR Rolu

### Baxışlar (Permissions)
```javascript
[
  "rule:create",      // USER-dən
  "rule:read",        // USER-dən
  "rule:update:own",  // USER-dən
  "rule:delete:own",  // USER-dən
  "rule:publish"      // YENİ - yalnız bu rola
]
```

### Edə Biləcəyi Əməliyyatlar ✅

#### 1. Öz Qaydalarını Dərc Etmək (Publish)
```bash
POST /api/v1/rules/{ruleId}/publish
Authorization: Bearer CONTRIBUTOR_TOKEN
Body: {
  "visibility": "PUBLIC",
  "pricing": {
    "isPaid": true,
    "price": 29.99
  }
}

Response: 200 OK
{
  "success": true,
  "message": "Qaidə inceləmə üçün təqdim edildi",
  "data": {
    "rule": {
      "status": "UNDER_REVIEW",  ← DRAFT-dən UNDER_REVIEW-ə dəyişdi
      "visibility": "PUBLIC",
      "pricing": { "isPaid": true, "price": 29.99 }
    }
  }
}
```

**Kodda (Backend):**
```javascript
// src/middleware/auth.js - Permission check
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: "Yetərli icazə yoxdur"
      });
    }
    next();
  };
};

// src/controllers/ruleController.js - Publish logic
exports.publishRule = async (req, res) => {
  const rule = await Rule.findById(req.params.id).populate("author");
  
  // SAHIB OLMA YOXLAMASI
  if (rule.author._id.toString() !== req.user._id.toString() && 
      req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Bu qaidəni dərc etmək üçün icazəniz yoxdur"
    });
  }
  
  // STATUS DƏYIŞDƏR
  rule.status = "UNDER_REVIEW";
  rule.visibility = req.body.visibility || "PUBLIC";
  rule.pricing = req.body.pricing;
  await rule.save();
};
```

#### 2. Qaidə Analitikasını Görmək (Analytics)
```bash
GET /api/v1/rules/{ownRuleId}/analytics
Authorization: Bearer CONTRIBUTOR_TOKEN

Response: 200 OK
{
  "success": true,
  "data": {
    "analytics": {
      "downloads": 156,
      "views": 1200,
      "rating": 4.5,
      "likes": 89,
      "forks": 12,
      "purchases": 28,
      "earnings": 84.00  // 28 × 30 × 0.1 = 84
    }
  }
}
```

**Sahib Olmayan Qaidə Üçün:**
```bash
GET /api/v1/rules/{otherRuleId}/analytics
Authorization: Bearer CONTRIBUTOR_TOKEN

Response: 403 Forbidden
{
  "success": false,
  "message": "Analitika görmək üçün icazəniz yoxdur"
}
```

#### 3. Gəlir Əldə Etmə Tələbi (Withdrawal)
```bash
POST /api/v1/transactions/withdraw
Authorization: Bearer CONTRIBUTOR_TOKEN
Body: {
  "amount": 500.00,
  "paymentMethod": "stripe"
}

Response: 201 Created
{
  "success": true,
  "message": "Çəkib alma tələbi təqdim edildi",
  "data": {
    "transaction": {
      "type": "WITHDRAWAL",
      "amount": 500.00,
      "status": "PENDING",
      "paymentMethod": "stripe"
    }
  }
}
```

### Edə Bilməyəcəyi Əməliyyatlar ❌

| Əməliyyat | Səbəb | Kod |
|-----------|------|-----|
| Başqa qaidəni təsdiq etmək | Moderatora lazımdır | `rule:approve` |
| Başqa qaidəni rədd etmək | Moderatora lazımdır | `rule:reject` |
| İstifadəçiyə xəbərdarlıq vermək | Moderatora lazımdır | `user:moderate` |
| Moderasyon panelini görmək | Admin/Moderator yalnız | Middleware yoxlaması |

---

## 3️⃣ MODERATOR Rolu

### Baxışlar (Permissions)
```javascript
[
  "rule:create",
  "rule:read",
  "rule:update:any",    // YENİ - HƏR QAIDASINI
  "rule:delete:any",    // YENİ - HƏR QAIDASINI
  "rule:approve",       // YENİ
  "rule:reject",        // YENİ
  "user:moderate"       // YENİ
]
```

### Edə Biləcəyi Əməliyyatlar ✅

#### 1. Moderasyon Sırasını Görmək
```bash
GET /api/v1/moderation/queue?page=1&limit=20&status=UNDER_REVIEW
Authorization: Bearer MODERATOR_TOKEN

Response: 200 OK
{
  "success": true,
  "data": {
    "rules": [
      {
        "_id": "rule123",
        "title": "SQL Injection Detector",
        "status": "UNDER_REVIEW",
        "author": {
          "username": "john_doe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": { "total": 5, "page": 1, "limit": 20 }
  }
}
```

**Kodda (Backend):**
```javascript
// src/routes/moderationRoutes.js
router.get(
  "/queue",
  authenticate,
  hasPermission("rule:approve"),  // ← MODERATOR+ yalnız
  moderationController.getModerationQueue
);
```

#### 2. Qaidəni Təsdiq Etmək (Approve)
```bash
POST /api/v1/moderation/rules/{ruleId}/approve
Authorization: Bearer MODERATOR_TOKEN
Body: {
  "feedback": "Yaxşı tərtib edilmiş qaidə"
}

Response: 200 OK
{
  "success": true,
  "message": "Qaidə uğurla təsdiq edildi",
  "data": {
    "rule": {
      "_id": "rule123",
      "status": "APPROVED",  ← UNDER_REVIEW-dən APPROVED-a
      "title": "SQL Injection Detector"
    }
  }
}
```

**Qaidə Müəllifi Bildirilir:**
```javascript
// Notification gönderilir
await Notification.create({
  user: rule.author._id,
  type: "RULE_APPROVED",
  message: `Sizin "${rule.title}" qaidəsi təsdiq edildi!`
});
```

#### 3. Qaidəni Rədd Etmək (Reject)
```bash
POST /api/v1/moderation/rules/{ruleId}/reject
Authorization: Bearer MODERATOR_TOKEN
Body: {
  "reason": "MITRE ATT&CK xəritələri çatışmır"
}

Response: 200 OK
{
  "success": true,
  "message": "Qaidə rədd edildi",
  "data": {
    "rule": {
      "status": "REJECTED",  ← UNDER_REVIEW-dən REJECTED-ə
      "title": "SQL Injection Detector"
    }
  }
}
```

#### 4. İstifadəçiyə Xəbərdarlıq Vermek (Warn)
```bash
POST /api/v1/moderation/users/{userId}/warn
Authorization: Bearer MODERATOR_TOKEN
Body: {
  "reason": "Aşağı keyfiyyətli qaidələr təqdim edildi",
  "severity": "medium"  // low, medium, high
}

Response: 200 OK
{
  "success": true,
  "message": "İstifadəçi xəbərdarlığı verildi",
  "data": {
    "user": {
      "_id": "user456",
      "username": "bad_contributor",
      "email": "bad@example.com"
    }
  }
}
```

**Severity Səviyyələri:**

| Səviyyə | Nəticə |
|---------|--------|
| **low** | Xəbərdarlıq qeyd olunur, bildirim gönderilir |
| **medium** | Xəbərdarlıq + hesab işarələnir |
| **high** | Xəbərdarlıq + hesab MÜVƏQQƏTİ DEAKTIV olur |

#### 5. Moderasyon Statistikasını Görmek
```bash
GET /api/v1/moderation/stats?period=month
Authorization: Bearer MODERATOR_TOKEN

Response: 200 OK
{
  "success": true,
  "data": {
    "pendingRules": 5,        // İnceləmə gözləyən
    "approvedRules": 23,      // Təsdiq edilmiş
    "rejectedRules": 8,       // Rədd edilmiş
    "actionsByModerator": [
      {
        "moderator": [{ "username": "john_mod" }],
        "count": 12
      }
    ],
    "averageReviewTime": 3.5  // saatlarda
  }
}
```

### Edə Bilməyəcəyi Əməliyyatlar ❌

| Əməliyyat | Səbəb |
|-----------|------|
| İstifadəçini Maili üzmə | ADMIN yalnız |
| İstifadəçinin Rolunu Dəyişmək | ADMIN yalnız |
| İstifadəçini Silmek | ADMIN yalnız |

---

## 4️⃣ ADMIN Rolu

### Baxışlar (Permissions)
```javascript
["*"]  // TƏCRÜBƏNİN HƏMMƏSİ
```

### Edə Biləcəyi Əməliyyatlar ✅

**HƏR ŞEY - Heç bir məhdudiyyət yoxdur**

```javascript
// src/models/User.js - Permission check
userSchema.methods.hasPermission = function (permission) {
  const rolePermissions = {
    USER: ["rule:create", "rule:read", "rule:update:own", "rule:delete:own"],
    VERIFIED_CONTRIBUTOR: [..., "rule:publish"],
    MODERATOR: [..., "rule:approve", "rule:reject", "user:moderate"],
    ADMIN: ["*"]  // ← HƏMMƏ şə icazə
  };

  const permissions = rolePermissions[this.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
  // ADMIN üçün həmişə true döndər (["*"] ehtiva edir)
};
```

#### Misal: ADMIN Başqa Kullanıcının Qaidəsini Dərc Edir
```bash
# ADMIN başqa istifadəçinin DRAFT qaidəsini dərc edə bilər
POST /api/v1/rules/{otherUserRuleId}/publish
Authorization: Bearer ADMIN_TOKEN

Response: 200 OK
{
  "success": true,
  "message": "Qaidə inceləmə üçün təqdim edildi"
}

# Səbəb: Ownership xəkisində ADMIN məstəsna
if (rule.author._id.toString() !== req.user._id.toString() && 
    req.user.role !== "ADMIN") {
  // Bu xəta ADMIN üçün fırlanmır ✗
}
```

---

## İzin Sistemi Diaqramı

```
┌─────────────────────────────────────────────────────────────┐
│                 USER istənir: Qaidə Dərc Et               │
└────────────────────────┬────────────────────────────────────┘
                         │
              Middleware xəkis: authenticate()
                         │ ✓ Token var?
                         ▼
              Middleware xəkis: hasPermission("rule:publish")
                         │
         ┌───────────────┴───────────────┐
         │                               │
    USER rolu               VERIFIED_CONTRIBUTOR rolu
    (rule:publish YOX)      (rule:publish VAR)
         │                               │
    403 Forbidden                        ▼
    "Yetərli icazə yoxdur"        Controller xəkis:
                           Ownership check (rule.author === user?)
                                         │
                     ┌───────────────────┴───────────────────┐
                     │                                       │
                SAHIB → ✓                              SAHIB DİL → ✗
                     │                                       │
                     ▼                                       ▼
            Status dəyiş:                          403 Forbidden
            DRAFT → UNDER_REVIEW                  "Bu qaidəni dərc
                     │                             etmək üçün icazəniz
                     ▼                             yoxdur"
        Activity qeyd olunsun:
        RULE_SUBMITTED_FOR_REVIEW
                     │
                     ▼
            Moderasyon sırasına daxil olsun
```

---

## İzin Xəritəsi (Permission Matrix)

| Əməliyyat | USER | VERIFIED_CONTRIBUTOR | MODERATOR | ADMIN |
|-----------|------|----------------------|-----------|-------|
| **Qaidə Yaratmak (DRAFT)** | ✅ | ✅ | ✅ | ✅ |
| **Öz Qaidəsini Redaktə Etmek** | ✅ | ✅ | ✅ | ✅ |
| **Öz Qaidəsini Silmek** | ✅ | ✅ | ✅ | ✅ |
| **Başqa Qaidəni Redaktə Etmek** | ❌ | ❌ | ✅ | ✅ |
| **Öz Qaidəsini Dərc Etmek** | ❌ | ✅ | ✅ | ✅ |
| **Başqa Qaidəni Dərc Etmek** | ❌ | ❌ | ❌ | ✅ |
| **Analitika Görmek (Öz)** | ❌ | ✅ | ✅ | ✅ |
| **Qaidəni Təsdiq Etmek** | ❌ | ❌ | ✅ | ✅ |
| **Qaidəni Rədd Etmek** | ❌ | ❌ | ✅ | ✅ |
| **İstifadəçiyə Xəbərdarlıq** | ❌ | ❌ | ✅ | ✅ |
| **Moderasyon Paneli** | ❌ | ❌ | ✅ | ✅ |
| **Gəlir Əldə Etmə** | ❌ | ✅ | ✅ | ✅ |

---

## Test Ssenariyosu

### Test 1: USER Qaidə Dərc Etməyə Cəhd Edir
```bash
# 1. USER qaidə yaradır
POST /api/v1/rules
Authorization: Bearer USER_TOKEN
Body: { title: "Test", ... }

Response: 201 Created
{
  "data": { "rule": { "status": "DRAFT" } }
}

# 2. USER qaidəni dərc etməyə cəhd edir
POST /api/v1/rules/{ruleId}/publish
Authorization: Bearer USER_TOKEN

Response: 403 Forbidden
{
  "success": false,
  "message": "Yetərli icazə yoxdur"
}

# Sebep: middleware xəkis hasPermission("rule:publish")
# USER-in bu izni yoxdur
```

### Test 2: VERIFIED_CONTRIBUTOR Qaidə Dərc Edir
```bash
# VERIFIED_CONTRIBUTOR öz qaidəsini dərc edir
POST /api/v1/rules/{ownRuleId}/publish
Authorization: Bearer CONTRIBUTOR_TOKEN
Body: {
  "visibility": "PUBLIC",
  "pricing": { "isPaid": true, "price": 29.99 }
}

Response: 200 OK
{
  "success": true,
  "data": { "rule": { "status": "UNDER_REVIEW" } }
}

# Moderator sırasında görünür
GET /api/v1/moderation/queue
Authorization: Bearer MODERATOR_TOKEN
Response: { "rules": [{ title: "...", status: "UNDER_REVIEW" }] }
```

### Test 3: MODERATOR Qaidəni Təsdiq Edir
```bash
# MODERATOR qaidəni təsdiq edir
POST /api/v1/moderation/rules/{ruleId}/approve
Authorization: Bearer MODERATOR_TOKEN
Body: { "feedback": "Yaxşı" }

Response: 200 OK
{
  "success": true,
  "data": { "rule": { "status": "APPROVED" } }
}

# Qaidə müəllifi bildiriliş alır
# Qaidə indi açıq bazarda görünür
```

---

## Başlıca Nöqtələr

✅ **USER** - Yalnız öz qaidələrini idarə edə bilər  
✅ **VERIFIED_CONTRIBUTOR** - Qaidə dərc edə və gəlir əldə edə bilər  
✅ **MODERATOR** - İstənilən qaidəni inceləyə və istifadəçiləri xəbərdar edə bilər  
✅ **ADMIN** - Heç bir məhdudiyyət yoxdur

---

**Status: ✅ Tam Tətbiq Edilmiş və Yoxlanılmış**

