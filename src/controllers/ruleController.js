// src/controllers/ruleController.js
const Rule = require("../models/Rule");
const RuleVersion = require("../models/RuleVersion");
const Purchase = require("../models/Purchase");
const Activity = require("../models/Activity");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Create new rule (draft)
exports.createRule = async (req, res) => {
  try {
    const {
      title,
      description,
      queryLanguage,
      vendor,
      category,
      tags,
      mitreAttack,
      severity,
      ruleContent,
      visibility,
      pricing,
    } = req.body;

    const rule = new Rule({
      title,
      description,
      author: req.user._id,
      queryLanguage,
      vendor,
      category,
      tags,
      mitreAttack,
      severity,
      ruleContent,
      visibility: visibility || "PRIVATE",
      pricing,
      status: "DRAFT",
    });

    await rule.save();

    // Create initial version
    const version = new RuleVersion({
      rule: rule._id,
      version: "1.0.0",
      title,
      description,
      ruleContent,
      createdBy: req.user._id,
    });

    await version.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_CREATED",
      target: rule._id,
      targetModel: "Rule",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Update user statistics
    req.user.statistics.totalRules += 1;
    await req.user.save();

    res.status(201).json({
      success: true,
      message: "Rule created successfully",
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create rule",
      error: error.message,
    });
  }
};

// Get all rules with filters
exports.getRules = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = "-createdAt",
      queryLanguage,
      vendor,
      category,
      severity,
      isPaid,
      minRating,
      search,
      tags,
      mitreTactics,
      mitreTechniques,
    } = req.query;

    // Build filter
    const filter = {
      status: "APPROVED",
      isActive: true,
    };

    // Show public and paid rules to all users
    // Users can see their own rules regardless of visibility
    if (!req.user) {
      // Non-authenticated users see PUBLIC and PAID rules
      filter.$or = [{ visibility: "PUBLIC" }, { visibility: "PAID" }];
    } else {
      // Authenticated users see:
      // - All PUBLIC and PAID rules
      // - Their own rules (regardless of visibility)
      filter.$or = [
        { visibility: "PUBLIC" },
        { visibility: "PAID" },
        { author: req.user._id }
      ];
    }

    // Apply filters
    if (queryLanguage) filter.queryLanguage = queryLanguage;
    if (vendor) filter.vendor = vendor;
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (isPaid !== undefined) filter["pricing.isPaid"] = isPaid === "true";
    if (minRating)
      filter["statistics.rating"] = { $gte: parseFloat(minRating) };
    if (tags) filter.tags = { $in: tags.split(",") };
    if (mitreTactics)
      filter["mitreAttack.tactics"] = { $in: mitreTactics.split(",") };
    if (mitreTechniques)
      filter["mitreAttack.techniques"] = { $in: mitreTechniques.split(",") };

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const rules = await Rule.find(filter)
      .populate("author", "username profile.avatar statistics.rating")
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Rule.countDocuments(filter);

    // Mask paid rule content for non-purchasers
    const maskedRules = await Promise.all(
      rules.map(async (rule) => {
        if (rule.pricing.isPaid && req.user) {
          const hasPurchased = await Purchase.exists({
            user: req.user._id,
            rule: rule._id,
            isActive: true,
          });

          if (!hasPurchased) {
            // Mask the query content
            rule.ruleContent.query =
              rule.ruleContent.query.substring(0, 100) +
              "... [Purchase to view full content]";
          }
        } else if (rule.pricing.isPaid && !req.user) {
          rule.ruleContent.query = "[Login and purchase to view content]";
        }

        // Get review count for this rule
        const Review = require("../models/Review");
        const reviewCount = await Review.countDocuments({ rule: rule._id });
        rule.reviewCount = reviewCount;

        return rule;
      }),
    );

    res.json({
      success: true,
      data: {
        rules: maskedRules,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rules",
      error: error.message,
    });
  }
};

// Get single rule by ID
exports.getRuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await Rule.findById(id)
      .populate("author", "username profile statistics.rating")
      .populate("reviews");

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check visibility permissions
    if (
      rule.visibility === "PRIVATE" &&
      (!req.user || rule.author._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Increment view count
    rule.statistics.views += 1;
    await rule.save();

    // Check if user has purchased (for paid rules)
    let hasPurchased = false;
    const isPaidRule = rule.visibility && (rule.visibility.toUpperCase() === 'PAID' || rule.pricing.isPaid);
    
    if (isPaidRule) {
      if (req.user) {
        // User has purchased if they are the author or have the rule in their purchasedRules array
        hasPurchased = 
          rule.author._id.toString() === req.user._id.toString() ||
          (req.user.purchasedRules && 
           req.user.purchasedRules.some(id => id.toString() === rule._id.toString()));
      }
      
      // Mask content if not purchased
      if (!hasPurchased) {
        rule.ruleContent.query =
          rule.ruleContent.query.substring(0, 150) +
          "... [Purchase to view full content]";
      }
    } else if (!req.user && rule.visibility === 'PRIVATE') {
      rule.ruleContent.query = "[Login to view content]";
    }

    res.json({
      success: true,
      data: {
        rule,
        hasPurchased,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rule",
      error: error.message,
    });
  }
};

// Update rule
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rule = await Rule.findById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check ownership or admin permission
    if (
      rule.author.toString() !== req.user._id.toString() &&
      !req.user.hasPermission("rule:update:any")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Don't allow changing status through this endpoint
    delete updates.status;
    delete updates.moderation;

    // Handle version updates - create version history
    if (updates.version && typeof updates.version === 'object' && updates.version.current) {
      const newVersion = updates.version.current;
      const oldVersion = rule.version?.current || '1.0.0';
      
      // If version has changed, create a version history entry
      if (newVersion !== oldVersion) {
        // Check if this version already exists in RuleVersion collection
        const existingVersion = await RuleVersion.findOne({
          rule: rule._id,
          version: oldVersion,
        });

        // Only create a new version entry if it doesn't already exist
        if (!existingVersion) {
          const versionEntry = new RuleVersion({
            rule: rule._id,
            version: oldVersion,
            title: rule.title,
            description: rule.description,
            ruleContent: rule.ruleContent,
            createdBy: req.user._id,
          });
          await versionEntry.save();
        }

        // Update the rule's version and add to changelog
        rule.version = {
          current: newVersion,
          changelog: [
            ...(rule.version?.changelog || []),
            {
              version: oldVersion,
              changes: `Updated to version ${newVersion}`,
              author: req.user._id,
              createdAt: new Date(),
            },
          ],
        };
      } else {
        // If version didn't change, just update the version object structure
        rule.version = updates.version;
      }
      delete updates.version;
    }

    // Update other fields
    Object.assign(rule, updates);
    
    await rule.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_UPDATED",
      target: rule._id,
      targetModel: "Rule",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      success: true,
      message: "Rule updated successfully",
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update rule",
      error: error.message,
    });
  }
};

// Direct publish rule (for VERIFIED_CONTRIBUTOR/ADMIN)
exports.directPublishRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await Rule.findById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    if (rule.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (rule.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Only draft rules can be published",
      });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email verification required to publish rules",
      });
    }

    // Change status based on user role
    if (req.user.role === "VERIFIED_CONTRIBUTOR" || req.user.role === "ADMIN") {
      rule.status = "APPROVED";
      rule.publishedAt = new Date();
    } else {
      rule.status = "UNDER_REVIEW";
    }

    await rule.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_PUBLISHED",
      target: rule._id,
      targetModel: "Rule",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      success: true,
      message:
        rule.status === "APPROVED"
          ? "Rule published successfully"
          : "Rule submitted for review",
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to publish rule",
      error: error.message,
    });
  }
};

// Delete rule
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await Rule.findById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    if (
      rule.author.toString() !== req.user._id.toString() &&
      !req.user.hasPermission("rule:delete:any")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Soft delete
    rule.isActive = false;
    rule.status = "ARCHIVED";
    await rule.save();

    res.json({
      success: true,
      message: "Rule deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete rule",
      error: error.message,
    });
  }
};

// Fork rule
exports.forkRule = async (req, res) => {
  try {
    const { id } = req.params;

    const originalRule = await Rule.findById(id);

    if (!originalRule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    if (originalRule.visibility !== "PUBLIC") {
      return res.status(403).json({
        success: false,
        message: "Cannot fork private rules",
      });
    }

    // Create forked rule
    const forkedRule = new Rule({
      title: `${originalRule.title} (Fork)`,
      description: originalRule.description,
      author: req.user._id,
      queryLanguage: originalRule.queryLanguage,
      vendor: originalRule.vendor,
      category: originalRule.category,
      tags: originalRule.tags,
      mitreAttack: originalRule.mitreAttack,
      severity: originalRule.severity,
      ruleContent: originalRule.ruleContent,
      forkedFrom: originalRule._id,
      status: "DRAFT",
      visibility: "PRIVATE",
    });

    await forkedRule.save();

    // Update fork count
    originalRule.statistics.forks += 1;
    await originalRule.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_FORKED",
      target: forkedRule._id,
      targetModel: "Rule",
      metadata: { originalRule: originalRule._id },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      message: "Rule forked successfully",
      data: { rule: forkedRule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fork rule",
      error: error.message,
    });
  }
};

// Get user's own rules (all statuses)
exports.getMyRules = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "all",
      sort = "-createdAt",
      search,
    } = req.query;

    const filter = {
      author: req.user._id,
    };

    // Filter by status if specified
    if (status && status !== "all") {
      filter.status = status.toUpperCase();
    }

    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch rules
    const rules = await Rule.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Rule.countDocuments(filter);

    res.json({
      success: true,
      data: {
        rules,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your rules",
      error: error.message,
    });
  }
};

// Like/Unlike a rule
// Mock purchase rule - simulates payment
exports.purchaseRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const rule = await Rule.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check if rule is not paid
    if (rule.visibility !== 'PAID') {
      return res.status(400).json({
        success: false,
        message: "This rule is not a paid rule",
      });
    }

    // Check if user already has purchase record
    const existingPurchase = await Purchase.findOne({
      user: userId,
      rule: id,
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this rule",
      });
    }
    
    // Create transaction record
    const amount = rule.pricing?.price || 0;
    const currency = rule.pricing?.currency || 'USD';
    
    const transaction = new Transaction({
      buyer: userId,
      seller: rule.author,
      rule: id,
      amount: amount,
      currency: currency,
      paymentMethod: 'MOCK',
      status: 'COMPLETED',
      platformFee: amount * 0.1, // 10% platform fee for demo
      sellerEarnings: amount * 0.9, // Seller gets 90%
      metadata: {
        mockPayment: true,
        processedAt: new Date(),
      },
    });

    await transaction.save();

    // Create purchase record
    const purchase = new Purchase({
      user: userId,
      rule: id,
      transaction: transaction._id,
      accessGrantedAt: new Date(),
      isActive: true,
    });

    await purchase.save();

    // Update user's purchased rules list
    const user = await User.findById(userId);
    if (!user.purchasedRules) {
      user.purchasedRules = [];
    }
    user.purchasedRules.push(rule._id);
    await user.save();

    // Log activity
    await Activity.create({
      user: userId,
      type: "RULE_PURCHASED",
      target: rule._id,
      targetModel: "Rule",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: {
        transactionId: transaction._id,
        amount: amount,
      },
    });

    res.json({
      success: true,
      message: "Rule purchased successfully",
      data: {
        ruleId: rule._id,
        purchased: true,
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to purchase rule",
      error: error.message,
    });
  }
};

exports.likeRule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const rule = await Rule.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    const user = await require("../models/User").findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user already liked this rule
    const alreadyLiked = user.likedRules.includes(rule._id);

    if (alreadyLiked) {
      // Unlike the rule
      user.likedRules = user.likedRules.filter(id => !id.equals(rule._id));
      rule.statistics.likes = Math.max(0, (rule.statistics?.likes || 0) - 1);
    } else {
      // Like the rule
      user.likedRules.push(rule._id);
      rule.statistics.likes = (rule.statistics?.likes || 0) + 1;
    }

    await user.save();
    await rule.save();

    // Log activity
    await Activity.create({
      user: userId,
      type: alreadyLiked ? "RULE_UNLIKED" : "RULE_LIKED",
      target: rule._id,
      targetModel: "Rule",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      success: true,
      message: alreadyLiked ? "Rule unliked" : "Rule liked",
      data: {
        rule,
        liked: !alreadyLiked,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to like rule",
      error: error.message,
    });
  }
};

// Publish rule (VERIFIED_CONTRIBUTOR only)
// Publish rule with visibility and pricing
exports.publishRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { visibility, pricing } = req.body;

    const rule = await Rule.findById(id).populate("author");

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check ownership or admin BEFORE any modifications
    if (
      rule.author._id.toString() !== req.user._id.toString() &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to publish this rule",
      });
    }

    // Check status BEFORE any modifications
    if (rule.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Only draft rules can be published",
      });
    }

    // NOW we can proceed with modifications
    rule.status = "UNDER_REVIEW";
    rule.visibility = visibility || "PUBLIC";
    if (pricing) {
      rule.pricing = pricing;
    }

    await rule.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_SUBMITTED_FOR_REVIEW",
      target: rule._id,
      targetModel: "Rule",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Create notification for moderators
    const Notification = require("../models/Notification");
    await Notification.create({
      type: "RULE_SUBMITTED",
      title: "New Rule Submitted for Review",
      message: `A new rule "${rule.title}" by @${rule.author.username} has been submitted for review.`,
      data: { ruleId: rule._id },
    });

    res.json({
      success: true,
      message: "Rule submitted for review successfully",
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit rule for review",
      error: error.message,
    });
  }
};

// Get rule analytics (for owner or admin)
exports.getRuleAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await Rule.findById(id).populate("author");

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check ownership or admin
    if (
      rule.author._id.toString() !== req.user._id.toString() &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view analytics",
      });
    }

    // Calculate earnings (simplified: downloads * price * 0.1)
    const purchases = await Purchase.countDocuments({ rule: id });
    const earnings = purchases * (rule.pricing?.price || 0) * 0.1;

    const analytics = {
      downloads: rule.statistics?.downloads || 0,
      views: rule.statistics?.views || 0,
      rating: rule.statistics?.rating || 0,
      totalRatings: rule.statistics?.totalRatings || 0,
      likes: rule.statistics?.likes || 0,
      forks: rule.statistics?.forks || 0,
      purchases,
      earnings,
    };

    res.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get analytics",
      error: error.message,
    });
  }
};

module.exports = exports;
