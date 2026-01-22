// src/controllers/moderationController.js
const Rule = require("../models/Rule");
const User = require("../models/User");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");

/**
 * Get moderation queue (pending rules for review)
 * @access Moderator, Admin
 */
exports.getModerationQueue = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "UNDER_REVIEW" } = req.query;
    const skip = (page - 1) * limit;

    const rules = await Rule.find({ status })
      .populate("author", "username email")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rule.countDocuments({ status });

    res.json({
      success: true,
      data: {
        rules,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get moderation queue",
      error: error.message,
    });
  }
};

/**
 * Get moderation history (actions taken by moderators)
 * @access Moderator, Admin
 */
exports.getModerationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, moderator } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      type: { $in: ["RULE_APPROVED", "RULE_REJECTED", "USER_WARNED", "USER_SUSPENDED"] },
    };

    if (moderator) {
      query.user = moderator;
    }

    const history = await Activity.find(query)
      .populate("user", "username email role")
      .populate("target")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get moderation history",
      error: error.message,
    });
  }
};

/**
 * Get moderation statistics
 * @access Moderator, Admin
 */
exports.getModerationStats = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    // Determine date filter
    const dateFilter = {};
    if (period === "week") {
      dateFilter.$gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "quarter") {
      dateFilter.$gte = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }

    // Get pending rules count
    const pendingRules = await Rule.countDocuments({ status: "UNDER_REVIEW" });

    // Get approved/rejected rules
    const approvedRules = await Rule.countDocuments({
      status: "APPROVED",
      ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
    });

    const rejectedRules = await Rule.countDocuments({
      status: "REJECTED",
      ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
    });

    // Get moderation actions by moderator
    const actions = await Activity.aggregate([
      {
        $match: {
          type: { $in: ["RULE_APPROVED", "RULE_REJECTED", "USER_WARNED"] },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "moderator",
        },
      },
    ]);

    // Get average review time
    const avgReviewTime = await Activity.aggregate([
      {
        $match: {
          type: { $in: ["RULE_APPROVED", "RULE_REJECTED"] },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$processingTime" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        pendingRules,
        approvedRules,
        rejectedRules,
        actionsByModerator: actions,
        averageReviewTime: avgReviewTime[0]?.avgTime || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get moderation stats",
      error: error.message,
    });
  }
};

/**
 * Warn user about violations
 * @access Moderator, Admin
 */
exports.warnUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, severity = "low" } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    if (!["low", "medium", "high"].includes(severity)) {
      return res.status(400).json({
        success: false,
        message: "Invalid severity level",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create warning activity log
    await Activity.create({
      user: req.user._id,
      type: "USER_WARNED",
      target: userId,
      targetModel: "User",
      description: `User warned: ${reason}`,
      metadata: { severity },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Send notification to user
    await Notification.create({
      user: userId,
      type: "USER_WARNING",
      title: `Account Warning (${severity.toUpperCase()})`,
      message: `You have received a warning from our moderation team: ${reason}`,
      data: {
        severity,
        reason,
      },
    });

    // If high severity, disable account temporarily
    if (severity === "high") {
      user.isActive = false;
      await user.save();
    }

    res.json({
      success: true,
      message: "User warned successfully",
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to warn user",
      error: error.message,
    });
  }
};

/**
 * Approve rule for publication
 * @access Moderator, Admin
 */
exports.approveRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { feedback } = req.body;

    const rule = await Rule.findById(ruleId).populate("author");

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check status BEFORE any modifications
    if (rule.status !== "UNDER_REVIEW") {
      return res.status(400).json({
        success: false,
        message: "Rule must be in UNDER_REVIEW status to approve",
      });
    }

    // NOW we can proceed with modifications
    rule.status = "APPROVED";
    await rule.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_APPROVED",
      target: ruleId,
      targetModel: "Rule",
      description: feedback || "Rule approved",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Notify author
    await Notification.create({
      user: rule.author._id,
      type: "RULE_APPROVED",
      title: "Rule Approved",
      message: `Your rule "${rule.title}" has been approved and published to the marketplace.`,
      data: { ruleId },
    });

    res.json({
      success: true,
      message: "Rule approved successfully",
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve rule",
      error: error.message,
    });
  }
};

/**
 * Reject rule submission
 * @access Moderator, Admin
 */
exports.rejectRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { reason } = req.body;

    // Validate rejection reason is provided
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const rule = await Rule.findById(ruleId).populate("author");

    // Check rule exists
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found",
      });
    }

    // Check status BEFORE any modifications
    if (rule.status !== "UNDER_REVIEW") {
      return res.status(400).json({
        success: false,
        message: "Rule must be in UNDER_REVIEW status to reject",
      });
    }

    // NOW we can proceed with modifications
    rule.status = "REJECTED";
    await rule.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: "RULE_REJECTED",
      target: ruleId,
      targetModel: "Rule",
      description: reason,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Notify author with rejection reason
    await Notification.create({
      user: rule.author._id,
      type: "RULE_REJECTED",
      title: "Rule Rejected",
      message: `Your rule "${rule.title}" was not approved. Reason: ${reason}`,
      data: { ruleId, reason },
    });

    res.json({
      success: true,
      message: "Rule rejected successfully",
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject rule",
      error: error.message,
    });
  }
};

module.exports = exports;
