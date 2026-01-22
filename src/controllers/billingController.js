// src/controllers/billingController.js
const { asyncHandler, errors } = require("../middleware/errorHandler");
const billingService = require("../services/billingService");
const Billing = require("../models/Billing");
const BillingTransaction = require("../models/BillingTransaction");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const User = require("../models/User");

/**
 * Get current user's billing account
 */
exports.getMyBillingAccount = asyncHandler(async (req, res) => {
  const billing = await billingService.getBillingAccount(req.user._id);

  res.json({
    success: true,
    data: { billing },
  });
});

/**
 * Get current user's billing statistics
 */
exports.getMyBillingStats = asyncHandler(async (req, res) => {
  const stats = await billingService.getBillingStats(req.user._id);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Get user's billing transactions
 */
exports.getMyBillingTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status } = req.query;
  const skip = (page - 1) * limit;

  const billing = await Billing.findOne({ user: req.user._id });
  if (!billing) {
    throw errors.notFound("Billing account not found");
  }

  let query = { billing: billing._id };

  if (type) {
    query.type = type;
  }
  if (status) {
    query.status = status;
  }

  const transactions = await BillingTransaction.find(query)
    .populate("relatedTransaction", "amount status")
    .populate("relatedPurchase", "rule")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await BillingTransaction.countDocuments(query);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Get commission configuration
 */
exports.getCommissionConfig = asyncHandler(async (req, res) => {
  const config = billingService.getCommissionConfig();

  res.json({
    success: true,
    data: { config },
  });
});

/**
 * Request withdrawal (user)
 */
exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const { amount, withdrawalMethod, bankAccount, paypalEmail, cryptoAddress, cryptoNetwork } =
    req.body;

  // Validate amount
  if (!amount || amount <= 0) {
    throw errors.badRequest("Invalid withdrawal amount");
  }

  // Get user's billing account
  const billing = await Billing.findOne({ user: req.user._id });
  if (!billing) {
    throw errors.notFound("Billing account not found");
  }

  // Check minimum withdrawal amount
  if (amount < billing.minimumWithdrawalAmount) {
    throw errors.badRequest(
      `Minimum withdrawal amount is $${billing.minimumWithdrawalAmount}`,
    );
  }

  // Check available balance
  if (billing.balance < amount) {
    throw errors.badRequest("Insufficient balance for withdrawal");
  }

  // Validate withdrawal method and required fields
  if (withdrawalMethod === "BANK_TRANSFER" && !bankAccount) {
    throw errors.badRequest("Bank account details required for bank transfer");
  }
  if (withdrawalMethod === "PAYPAL" && !paypalEmail) {
    throw errors.badRequest("PayPal email required for PayPal withdrawal");
  }
  if (withdrawalMethod === "CRYPTO" && !cryptoAddress) {
    throw errors.badRequest("Crypto address required for crypto withdrawal");
  }

  // Create withdrawal request
  const withdrawalRequest = await WithdrawalRequest.create({
    billing: billing._id,
    user: req.user._id,
    amount,
    currency: "USD",
    withdrawalMethod,
    bankAccount: withdrawalMethod === "BANK_TRANSFER" ? bankAccount : undefined,
    paypalEmail: withdrawalMethod === "PAYPAL" ? paypalEmail : undefined,
    cryptoAddress: withdrawalMethod === "CRYPTO" ? cryptoAddress : undefined,
    cryptoNetwork: withdrawalMethod === "CRYPTO" ? cryptoNetwork : undefined,
    status: "PENDING",
  });

  // Reserve the amount (deduct from available balance)
  billing.balance -= amount;
  billing.withdrawalRequests.push(withdrawalRequest._id);
  await billing.save();

  // Create billing transaction for withdrawal
  await BillingTransaction.create({
    billing: billing._id,
    user: req.user._id,
    type: "WITHDRAWAL",
    amount: -amount,
    currency: "USD",
    description: `Withdrawal request via ${withdrawalMethod}`,
    relatedWithdrawal: withdrawalRequest._id,
    status: "PENDING",
    metadata: {
      withdrawalMethod,
    },
  });

  res.status(201).json({
    success: true,
    message: "Withdrawal request created successfully",
    data: { withdrawalRequest },
  });
});

/**
 * Get user's withdrawal requests
 */
exports.getMyWithdrawals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  let query = { user: req.user._id };
  if (status) {
    query.status = status;
  }

  const withdrawals = await WithdrawalRequest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await WithdrawalRequest.countDocuments(query);

  res.json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Get admin billing overview (admin only)
 */
exports.getAdminBillingOverview = asyncHandler(async (req, res) => {
  if (req.user.role !== "ADMIN") {
    throw errors.forbidden("Only admins can access billing overview");
  }

  const adminUser = await User.findOne({ role: "ADMIN" });
  if (!adminUser) {
    throw errors.notFound("Admin user not found");
  }

  const adminBilling = await Billing.findOne({ user: adminUser._id });
  const adminEarnings = await billingService.getAdminEarnings();

  // Get all withdrawal requests
  const pendingWithdrawals = await WithdrawalRequest.find({ status: "PENDING" })
    .populate("user", "username email")
    .populate("billing");

  // Get recent transactions
  const recentTransactions = await BillingTransaction.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("user", "username email");

  res.json({
    success: true,
    data: {
      adminEarnings,
      adminBilling,
      pendingWithdrawals,
      recentTransactions,
    },
  });
});

/**
 * Process withdrawal request (admin only)
 */
exports.processWithdrawal = asyncHandler(async (req, res) => {
  if (req.user.role !== "ADMIN") {
    throw errors.forbidden("Only admins can process withdrawals");
  }

  const { id } = req.params;
  const { approved, failureReason, transactionHash, estimatedArrivalDate } = req.body;

  const withdrawalRequest = await WithdrawalRequest.findById(id);
  if (!withdrawalRequest) {
    throw errors.notFound("Withdrawal request not found");
  }

  if (withdrawalRequest.status !== "PENDING") {
    throw errors.badRequest("Withdrawal request is not pending");
  }

  if (approved) {
    withdrawalRequest.status = "APPROVED";
    withdrawalRequest.processedBy = req.user._id;

    // If additional details provided (e.g., for crypto)
    if (transactionHash) {
      withdrawalRequest.transactionHash = transactionHash;
    }
    if (estimatedArrivalDate) {
      withdrawalRequest.estimatedArrivalDate = estimatedArrivalDate;
    }

    await withdrawalRequest.save();

    res.json({
      success: true,
      message: "Withdrawal request approved",
      data: { withdrawalRequest },
    });
  } else {
    if (!failureReason) {
      throw errors.badRequest("Failure reason required for rejection");
    }

    // Restore the balance if rejected
    const billing = await Billing.findById(withdrawalRequest.billing);
    if (billing) {
      billing.balance += withdrawalRequest.amount;
      await billing.save();
    }

    withdrawalRequest.status = "FAILED";
    withdrawalRequest.failureReason = failureReason;
    withdrawalRequest.processedBy = req.user._id;
    await withdrawalRequest.save();

    // Create reverse billing transaction
    await BillingTransaction.create({
      billing: withdrawalRequest.billing,
      user: withdrawalRequest.user,
      type: "ADJUSTMENT",
      amount: withdrawalRequest.amount,
      currency: "USD",
      description: `Withdrawal rejection: ${failureReason}`,
      relatedWithdrawal: withdrawalRequest._id,
      status: "COMPLETED",
      processedBy: req.user._id,
      metadata: {
        rejectionReason: failureReason,
      },
    });

    res.json({
      success: true,
      message: "Withdrawal request rejected",
      data: { withdrawalRequest },
    });
  }
});

/**
 * Mark withdrawal as completed (admin only)
 */
exports.completeWithdrawal = asyncHandler(async (req, res) => {
  if (req.user.role !== "ADMIN") {
    throw errors.forbidden("Only admins can mark withdrawals as completed");
  }

  const { id } = req.params;
  const { trackingNumber, completedAt } = req.body;

  const withdrawalRequest = await WithdrawalRequest.findById(id);
  if (!withdrawalRequest) {
    throw errors.notFound("Withdrawal request not found");
  }

  if (!["APPROVED", "PROCESSING"].includes(withdrawalRequest.status)) {
    throw errors.badRequest("Withdrawal request cannot be marked as completed");
  }

  withdrawalRequest.status = "COMPLETED";
  withdrawalRequest.completedAt = completedAt || new Date();
  if (trackingNumber) {
    withdrawalRequest.trackingNumber = trackingNumber;
  }
  await withdrawalRequest.save();

  // Update billing account
  const billing = await Billing.findById(withdrawalRequest.billing);
  if (billing) {
    billing.totalWithdrawals += withdrawalRequest.amount;
    billing.lastWithdrawalAt = new Date();
    await billing.save();
  }

  res.json({
    success: true,
    message: "Withdrawal marked as completed",
    data: { withdrawalRequest },
  });
});

/**
 * Adjust user balance (admin only)
 */
exports.adjustBalance = asyncHandler(async (req, res) => {
  if (req.user.role !== "ADMIN") {
    throw errors.forbidden("Only admins can adjust balances");
  }

  const { userId } = req.params;
  const { amount, reason } = req.body;

  if (!amount || !reason) {
    throw errors.badRequest("Amount and reason are required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw errors.notFound("User not found");
  }

  const result = await billingService.adjustBalance({
    userId,
    amount,
    reason,
    adjustedBy: req.user._id,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get all withdrawal requests (admin only)
 */
exports.getAllWithdrawals = asyncHandler(async (req, res) => {
  if (req.user.role !== "ADMIN") {
    throw errors.forbidden("Only admins can view all withdrawals");
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (status) {
    query.status = status;
  }

  const withdrawals = await WithdrawalRequest.find(query)
    .populate("user", "username email")
    .populate("billing")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await WithdrawalRequest.countDocuments(query);

  res.json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Get earnings report with daily breakdown
 */
exports.getEarningsReport = asyncHandler(async (req, res) => {
  const { period = "month" } = req.query;

  const billing = await Billing.findOne({ user: req.user._id });
  if (!billing) {
    throw errors.notFound("Billing account not found");
  }

  const dateFrom = new Date();
  if (period === "week") {
    dateFrom.setDate(dateFrom.getDate() - 7);
  } else if (period === "month") {
    dateFrom.setMonth(dateFrom.getMonth() - 1);
  } else if (period === "year") {
    dateFrom.setFullYear(dateFrom.getFullYear() - 1);
  }

  const dailyData = await BillingTransaction.aggregate([
    {
      $match: {
        billing: billing._id,
        type: { $in: ["CREDIT", "PURCHASE_EARNINGS"] },
        createdAt: { $gte: dateFrom },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.json({
    success: true,
    data: {
      period,
      daily: dailyData.map((d) => ({
        date: d._id,
        amount: d.amount,
        transactions: d.count,
      })),
    },
  });
});
