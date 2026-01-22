// src/controllers/analyticsController.js
const User = require("../models/User");
const Rule = require("../models/Rule");
const Review = require("../models/Review");
const Transaction = require("../models/Transaction");
const Activity = require("../models/Activity");
const Purchase = require("../models/Purchase");
const { asyncHandler, errors } = require("../middleware/errorHandler");

/**
 * Get platform analytics overview
 */
exports.getPlatformAnalytics = asyncHandler(async (req, res) => {
  const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query;

  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  // Get key metrics
  const [newUsers, newRules, newReviews, newTransactions] = await Promise.all([
    User.countDocuments(dateFilter),
    Rule.countDocuments(dateFilter),
    Review.countDocuments(dateFilter),
    Transaction.countDocuments({ ...dateFilter, status: "COMPLETED" }),
  ]);

  // Get revenue metrics
  const revenueData = await Transaction.aggregate([
    {
      $match: {
        status: "COMPLETED",
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        platformFees: { $sum: "$platformFee" },
        sellerPayouts: { $sum: "$sellerEarnings" },
        avgTransaction: { $avg: "$amount" },
      },
    },
  ]);

  // Get user growth
  const userGrowth = await User.aggregate([
    {
      $match: dateFilter,
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      metrics: {
        newUsers,
        newRules,
        newReviews,
        newTransactions,
      },
      revenue: revenueData[0] || {
        totalRevenue: 0,
        platformFees: 0,
        sellerPayouts: 0,
        avgTransaction: 0,
      },
      userGrowth,
    },
  });
});

/**
 * Get user behavior analytics
 */
exports.getUserBehaviorAnalytics = asyncHandler(async (req, res) => {
  const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query;

  const dateFilter = {
    $gte: new Date(startDate),
    $lte: new Date(endDate),
  };

  // Get activity distribution
  const activityDistribution = await Activity.aggregate([
    {
      $match: {
        createdAt: dateFilter,
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get user retention
  const userRetention = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [
              {
                $gte: [
                  "$lastLogin",
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // Get rule engagement
  const ruleEngagement = await Rule.aggregate([
    {
      $group: {
        _id: null,
        avgDownloads: { $avg: "$stats.downloads" },
        avgRating: { $avg: "$stats.rating" },
        avgReviews: { $avg: "$stats.reviewCount" },
        avgPurchases: { $avg: "$stats.purchases" },
      },
    },
  ]);

  // Top activities by user
  const topUserActivities = await Activity.aggregate([
    {
      $match: {
        createdAt: dateFilter,
      },
    },
    {
      $group: {
        _id: "$user",
        activityCount: { $sum: 1 },
      },
    },
    { $sort: { activityCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      activityDistribution,
      userRetention: userRetention[0] || {
        totalUsers: 0,
        activeUsers: 0,
      },
      ruleEngagement: ruleEngagement[0] || {
        avgDownloads: 0,
        avgRating: 0,
        avgReviews: 0,
        avgPurchases: 0,
      },
      topUserActivities,
    },
  });
});

/**
 * Get rule analytics
 */
exports.getRuleAnalytics = asyncHandler(async (req, res) => {
  const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query;

  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  // Get top rules by downloads
  const topRulesByDownloads = await Rule.find()
    .select("title slug stats creator")
    .populate("creator", "username")
    .sort({ "stats.downloads": -1 })
    .limit(10)
    .lean();

  // Get top rules by rating
  const topRulesByRating = await Rule.find({
    "stats.reviewCount": { $gt: 0 },
  })
    .select("title slug stats creator")
    .populate("creator", "username")
    .sort({ "stats.rating": -1 })
    .limit(10)
    .lean();

  // Get rules by status
  const rulesByStatus = await Rule.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Get new rules trend
  const newRulesTrend = await Rule.aggregate([
    {
      $match: dateFilter,
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get pricing distribution
  const pricingDistribution = await Rule.aggregate([
    {
      $group: {
        _id: "$pricing.type",
        count: { $sum: 1 },
        avgPrice: {
          $avg: {
            $cond: [{ $eq: ["$pricing.type", "PAID"] }, "$pricing.amount", 0],
          },
        },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      topRulesByDownloads,
      topRulesByRating,
      rulesByStatus,
      newRulesTrend,
      pricingDistribution,
    },
  });
});

/**
 * Get transaction and revenue analytics
 */
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query;

  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  // Get revenue trend
  const revenueTrend = await Transaction.aggregate([
    {
      $match: {
        ...dateFilter,
        status: "COMPLETED",
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$amount" },
        platformFees: { $sum: "$platformFee" },
        sellerPayouts: { $sum: "$sellerEarnings" },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get payment method distribution
  const paymentMethodDistribution = await Transaction.aggregate([
    {
      $match: {
        ...dateFilter,
        status: "COMPLETED",
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  // Get refund statistics
  const refundStats = await Transaction.aggregate([
    {
      $match: dateFilter,
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: {
          $sum: { $cond: [{ $eq: ["$status", "REFUNDED"] }, "$amount", 0] },
        },
      },
    },
  ]);

  // Get top sellers
  const topSellers = await Transaction.aggregate([
    {
      $match: {
        ...dateFilter,
        status: "COMPLETED",
      },
    },
    {
      $group: {
        _id: "$seller",
        totalEarnings: { $sum: "$sellerEarnings" },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { totalEarnings: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      revenueTrend,
      paymentMethodDistribution,
      refundStats,
      topSellers,
    },
  });
});

/**
 * Get review analytics
 */
exports.getReviewAnalytics = asyncHandler(async (req, res) => {
  const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query;

  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    {
      $match: {
        ...dateFilter,
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get review trend
  const reviewTrend = await Review.aggregate([
    {
      $match: {
        ...dateFilter,
        isActive: true,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get review statistics
  const reviewStats = await Review.aggregate([
    {
      $match: {
        ...dateFilter,
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        avgRating: { $avg: "$rating" },
        verifiedReviews: {
          $sum: { $cond: ["$verified", 1, 0] },
        },
        reportedReviews: {
          $sum: { $cond: ["$reported", 1, 0] },
        },
      },
    },
  ]);

  // Get most helpful reviews
  const mostHelpfulReviews = await Review.find({
    ...dateFilter,
    isActive: true,
  })
    .select("comment rating helpful rule user")
    .populate("user", "username")
    .populate("rule", "title")
    .sort({ "helpful.count": -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      ratingDistribution,
      reviewTrend,
      reviewStats: reviewStats[0] || {
        totalReviews: 0,
        avgRating: 0,
        verifiedReviews: 0,
        reportedReviews: 0,
      },
      mostHelpfulReviews,
    },
  });
});

/**
 * Generate custom report
 */
exports.generateCustomReport = asyncHandler(async (req, res) => {
  const { reportType, startDate, endDate, filters = {} } = req.body;

  if (!reportType) {
    throw errors.badRequest("reportType is required");
  }

  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  let report;

  switch (reportType) {
    case "user_activity":
      report = await generateUserActivityReport(dateFilter, filters);
      break;
    case "rule_performance":
      report = await generateRulePerformanceReport(dateFilter, filters);
      break;
    case "revenue_breakdown":
      report = await generateRevenueBreakdownReport(dateFilter, filters);
      break;
    case "user_growth":
      report = await generateUserGrowthReport(dateFilter, filters);
      break;
    default:
      throw errors.badRequest("Invalid reportType");
  }

  res.json({
    success: true,
    data: {
      reportType,
      period: { startDate, endDate },
      generatedAt: new Date(),
      report,
    },
  });
});

// Helper functions for report generation

async function generateUserActivityReport(dateFilter, filters) {
  return await Activity.aggregate([
    {
      $match: {
        ...dateFilter,
        ...(filters.userId && { user: filters.userId }),
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);
}

async function generateRulePerformanceReport(dateFilter, filters) {
  return await Rule.aggregate([
    {
      $match: {
        ...dateFilter,
        ...(filters.creator && { creator: filters.creator }),
      },
    },
    {
      $project: {
        title: 1,
        downloads: "$stats.downloads",
        purchases: "$stats.purchases",
        rating: "$stats.rating",
        reviews: "$stats.reviewCount",
        revenue: "$stats.revenue",
      },
    },
    {
      $sort: { revenue: -1 },
    },
  ]);
}

async function generateRevenueBreakdownReport(dateFilter, filters) {
  return await Transaction.aggregate([
    {
      $match: {
        ...dateFilter,
        status: "COMPLETED",
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          method: "$paymentMethod",
        },
        revenue: { $sum: "$amount" },
        platformFees: { $sum: "$platformFee" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);
}

async function generateUserGrowthReport(dateFilter, filters) {
  return await User.aggregate([
    {
      $match: {
        ...dateFilter,
        ...(filters.role && { role: filters.role }),
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

/**
 * Export report to CSV
 */
exports.exportReport = asyncHandler(async (req, res) => {
  const { reportType, startDate, endDate } = req.query;

  if (!reportType) {
    throw errors.badRequest("reportType is required");
  }

  const dateFilter = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  let data;
  let filename;

  switch (reportType) {
    case "transactions":
      data = await Transaction.find(dateFilter)
        .select("buyer seller rule amount status createdAt")
        .populate("buyer", "username email")
        .populate("seller", "username email")
        .populate("rule", "title")
        .lean();
      filename = `transactions_${startDate}_${endDate}.csv`;
      break;
    case "users":
      data = await User.find(dateFilter)
        .select("username email role createdAt statistics")
        .lean();
      filename = `users_${startDate}_${endDate}.csv`;
      break;
    case "rules":
      data = await Rule.find(dateFilter)
        .select("title status stats creator createdAt")
        .populate("creator", "username")
        .lean();
      filename = `rules_${startDate}_${endDate}.csv`;
      break;
    default:
      throw errors.badRequest("Invalid reportType");
  }

  // Convert to CSV
  const csv = convertToCSV(data);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

function convertToCSV(data) {
  if (!data || data.length === 0) return "";

  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(","),
    ...data.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          if (typeof value === "object") {
            return JSON.stringify(value);
          }
          return String(value).includes(",") ? `"${value}"` : value;
        })
        .join(",")
    ),
  ];

  return csv.join("\n");
}

/**
 * Get user's downloads and views analytics by time period
 */
exports.getUserDownloadsViewsAnalytics = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;

  // Get user's rules
  const userRules = await Rule.find({
    author: req.user._id,
  }).select('statistics createdAt');

  if (userRules.length === 0) {
    return res.json({
      success: true,
      data: {
        analytics: [],
      },
    });
  }

  let analytics = [];
  const today = new Date();

  if (period === 'daily') {
    // Last 30 days with daily breakdown
    const dailyStats = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = { downloads: 0, views: 0 };
    }

    userRules.forEach((rule) => {
      const ruleDate = new Date(rule.createdAt).toISOString().split('T')[0];
      if (dailyStats[ruleDate]) {
        dailyStats[ruleDate].downloads += rule.statistics?.downloads || 0;
        dailyStats[ruleDate].views += rule.statistics?.views || 0;
      }
    });

    analytics = Object.entries(dailyStats).map(([date, stats]) => {
      const d = new Date(date);
      return {
        name: d.toLocaleString('default', { month: 'short', day: 'numeric' }),
        downloads: stats.downloads,
        views: stats.views,
      };
    });

  } else if (period === 'weekly') {
    // Last 12 weeks with weekly breakdown
    const weeklyStats = {};
    
    for (let i = 11; i >= 0; i--) {
      weeklyStats[i] = { downloads: 0, views: 0 };
    }

    userRules.forEach((rule) => {
      const ruleDate = new Date(rule.createdAt);
      const daysDiff = Math.floor((today.getTime() - ruleDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);
      
      if (weekIndex >= 0 && weekIndex < 12) {
        weeklyStats[11 - weekIndex].downloads += rule.statistics?.downloads || 0;
        weeklyStats[11 - weekIndex].views += rule.statistics?.views || 0;
      }
    });

    analytics = Object.entries(weeklyStats).map(([week, stats]) => ({
      name: `W${parseInt(week) + 1}`,
      downloads: stats.downloads,
      views: stats.views,
    }));

  } else {
    // monthly (default)
    const monthlyStats = {};
    
    for (let i = 5; i >= 0; i--) {
      monthlyStats[i] = { downloads: 0, views: 0 };
    }

    userRules.forEach((rule) => {
      const ruleDate = new Date(rule.createdAt);
      const monthsDiff = 
        (today.getFullYear() - ruleDate.getFullYear()) * 12 +
        (today.getMonth() - ruleDate.getMonth());
      
      if (monthsDiff >= 0 && monthsDiff < 6) {
        monthlyStats[5 - monthsDiff].downloads += rule.statistics?.downloads || 0;
        monthlyStats[5 - monthsDiff].views += rule.statistics?.views || 0;
      }
    });

    analytics = Object.entries(monthlyStats).map(([month, stats]) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - (5 - parseInt(month)));
      return {
        name: d.toLocaleString('default', { month: 'short' }),
        downloads: stats.downloads,
        views: stats.views,
      };
    });
  }

  res.json({
    success: true,
    data: {
      analytics,
    },
  });
});

/**
 * Get all reviews for user's rules
 */
exports.getUserRuleReviews = asyncHandler(async (req, res) => {
  // Get user's rules
  const userRules = await Rule.find({
    author: req.user._id,
  }).select('_id');

  if (userRules.length === 0) {
    return res.json({
      success: true,
      data: {
        reviews: [],
      },
    });
  }

  const ruleIds = userRules.map(rule => rule._id);

  // Get all reviews for these rules
  const reviews = await Review.find({
    rule: { $in: ruleIds },
    isActive: true,
  })
    .select('rating comment user rule createdAt helpful')
    .populate('user', 'username avatar profile')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      reviews,
    },
  });
});
