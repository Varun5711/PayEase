if(!process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const router = express.Router();
const {isLoggedIn} = require("../../middlewares/middleware.js");
const User = require('../../models/user.js');
const Transaction = require('../../models/transaction.js');
const BillPayment = require('../../models/billPayment.js');
const { sendNotification } = require('../../utils/notifications.js');

router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const transactions = await Transaction.find({
      $or: [{ sender: user._id }, { receiver: user._id }]
    }).populate("sender receiver", "username").sort({ timestamp: -1 }).limit(5);
    
    const totalSent = transactions
      .filter(t => t.sender.equals(user._id))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalReceived = transactions
      .filter(t => t.receiver.equals(user._id))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const leaderboard = await User.find().sort({ balance: -1 }).limit(5).select("username balance");
    
    res.render("pages/dashboard/dashboard.ejs", {
      user,
      transactions,
      totalSent,
      totalReceived,
      transactionCount: transactions.length,
      leaderboard,
      messages: req.flash()
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).render("pages/error", { error: "Error loading coin dashboard." });
  }
});

router.post("/transfer", isLoggedIn, async (req, res) => {
  try {
    const { receiverId, amount, note } = req.body;
    const sender = await User.findById(req.user._id);
    const receiver = await User.findOne({ username: receiverId });
    
    if (!receiver) {
      req.flash("error", "Recipient not found.");
      return res.redirect("/dashboard");
    }
    
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      req.flash("error", "Invalid coin amount.");
      return res.redirect("/dashboard");
    }
    
    if (sender.balance < transferAmount) {
      req.flash("error", "Insufficient coin balance.");
      return res.redirect("/dashboard");
    }
    
    await User.updateOne({ _id: sender._id }, { $inc: { balance: -transferAmount } });
    await User.updateOne({ _id: receiver._id }, { $inc: { balance: transferAmount } });
    
    await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,
      amount: transferAmount,
      note,
      status: "completed",
      timestamp: new Date()
    });
    
    req.flash("success", `Sent ${transferAmount} coins to ${receiver.username}.`);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Transfer Error:", error);
    req.flash("error", "Coin transfer failed.");
    res.redirect("/dashboard");
  }
});

router.get("/transactions", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const filter = req.query.filter || "all";

    let filterQuery = { $or: [{ sender: user._id }, { receiver: user._id }] };

    if (filter === "sent") {
      filterQuery = { sender: user._id };
    } else if (filter === "received") {
      filterQuery = { receiver: user._id };
    }

    const transactions = await Transaction.find(filterQuery)
      .populate("sender receiver", "username")
      .sort({ timestamp: -1 });

    res.render("pages/dashboard/transactions", { 
      user, 
      transactions, 
      filter,
      messages: req.flash() 
    });
  } catch (error) {
    console.error("Transaction History Error:", error);
    res.status(500).render("pages/error", { error: "Error loading transaction history." });
  }
});

router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const transactions = await Transaction.find({
      $or: [{ sender: user._id }, { receiver: user._id }]
    }).populate("sender receiver");

    const leaderboard = await User.find().sort({ balance: -1 }).limit(10); 

    res.render("pages/dashboard/profile", { user, transactions, leaderboard, messages: req.flash() });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).render("pages/error", { error: "Error loading profile." });
  }
});

router.get("/stats", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const transactions = await Transaction.find({
      $or: [{ sender: user._id }, { receiver: user._id }]
    }).populate("sender receiver", "username");
    
    const contacts = new Set();
    transactions.forEach(t => {
      if (t.sender._id.toString() !== user._id.toString()) {
        contacts.add(t.sender._id.toString());
      }
      if (t.receiver._id.toString() !== user._id.toString()) {
        contacts.add(t.receiver._id.toString());
      }
    });
    
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = transactions.length > 0 ? (totalVolume / transactions.length).toFixed(2) : 0;
    
    const partners = {};
    transactions.forEach(t => {
      const partnerId = t.sender._id.toString() === user._id.toString() ? t.receiver._id.toString() : t.sender._id.toString();
      const partnerName = t.sender._id.toString() === user._id.toString() ? t.receiver.username : t.sender.username;
      
      if (!partners[partnerId]) {
        partners[partnerId] = { username: partnerName, transactions: 0, volume: 0 };
      }
      partners[partnerId].transactions += 1;
      partners[partnerId].volume += t.amount;
    });
    
    const topPartners = Object.values(partners).sort((a, b) => b.volume - a.volume).slice(0, 5);
    
    res.render("pages/dashboard/viewstats", { 
      user,
      transactionStats: { totalVolume: totalVolume.toFixed(2), averageAmount, uniqueContacts: contacts.size, count: transactions.length, topPartners },
      messages: req.flash() 
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).render("pages/error", { error: "Error loading statistics." });
  }
});

router.get('/dashboard/bill', isLoggedIn, async (req, res) => {
  try {
      const user = await User.findById(req.user._id);
      
      const recentPayments = await BillPayment.find({ userId: req.user._id })
          .sort({ paymentDate: -1 })
          .limit(parseInt(process.env.BILL_PAYMENT_HISTORY_LIMIT) || 4);
      
      const offers = [
          {
              id: 'offer1',
              title: '10% Cashback',
              description: 'On electricity bills',
              code: 'ERUPEE10',
              details: 'Get 10% cashback up to ₹100 on electricity bill payments',
              validUntil: new Date('2025-04-30'),
              category: 'electricity',
              iconPath: '/images/cashback.gif'
          },
          {
              id: 'offer2',
              title: 'Extra Rewards',
              description: 'On tax payments',
              details: 'Earn 2X reward points on all tax payments made through e-Rupee',
              validUntil: new Date('2025-05-15'),
              category: 'tax',
              iconPath: '/images/Reward Icon.gif'
          },
          {
              id: 'offer3',
              title: 'Zero Transaction Fee',
              description: 'On water bills',
              details: 'Pay water bills with zero transaction fees this month',
              validUntil: new Date('2025-04-15'),
              category: 'water',
              iconPath: '/images/Water Icon.gif'
          }
      ];
      
      const quickPayOptions = await getQuickPayOptions(req.user._id);
      
      res.render("pages/dashboard/bill", {
          title: 'Bill Payment | e-Rupee',
          user: req.user,
          walletBalance: user.walletBalance,
          recentPayments,
          offers,
          quickPayOptions
      });
  } catch (err) {
      console.error('Error rendering bill payment page:', err);
      res.status(500).render('error', { 
          message: 'Unable to load bill payment page',
          error: process.env.NODE_ENV === 'development' ? err : {}
      });
  }
});

async function getQuickPayOptions(userId) {
  try {
      const frequentBillers = await BillPayment.aggregate([
          { $match: { userId: userId } },
          { $sort: { paymentDate: -1 } },
          { $group: {
              _id: { provider: "$provider", consumerNumber: "$consumerNumber", billType: "$billType" },
              lastAmount: { $first: "$amount" },
              lastPaymentDate: { $first: "$paymentDate" },
              count: { $sum: 1 }
          }},
          { $sort: { count: -1, lastPaymentDate: -1 } },
          { $limit: 3 }
      ]);
      
      const providerImages = {
          'Tata Power': '/images/tata.png',
          'Jio Fiber': '/images/jio.png',
          'Airtel': '/images/mob.png',
          'Reliance Energy': '/images/tata.png',
          'Municipal Corporation': '/images/water.png',
          'Income Tax': '/images/tax.png'
      };
      
      return frequentBillers.map(biller => ({
          provider: biller._id.provider,
          consumerNumber: biller._id.consumerNumber,
          billType: biller._id.billType,
          amount: biller.lastAmount,
          frequency: biller.count,
          imagePath: providerImages[biller._id.provider] || '/images/bill-payment.gif'
      }));
  } catch (err) {
      console.error('Error getting quick pay options:', err);
      return [];
  }
}

router.post('dashboard/bill/pay', isLoggedIn, async (req, res) => {
  try {
      const { billType, provider, consumerNumber, amount, paymentMethod, coinPayment } = req.body;
      
      if (!billType || !provider || !consumerNumber || !amount || !paymentMethod) {
          return res.status(400).json({ 
              success: false, 
              message: 'All fields are required' 
          });
      }
      
      if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({ 
              success: false, 
              message: 'Please enter a valid amount' 
          });
      }

      const paymentAmount = parseFloat(amount);
      
      const user = await User.findById(req.user._id);
      
      if (paymentMethod === 'wallet') {
          const minBalance = parseFloat(process.env.BILL_TRANSACTION_MIN_BALANCE) || 100;
          if (user.walletBalance < minBalance) {
              return res.status(400).json({
                  success: false,
                  message: `Minimum wallet balance of ₹${minBalance} required for bill payments`
              });
          }
          
          if (user.walletBalance < paymentAmount) {
              return res.status(400).json({
                  success: false,
                  message: 'Insufficient balance in your e-Rupee wallet'
              });
          }
      } 

      else if (paymentMethod === 'coins') {
          if (!coinPayment) {
              return res.status(400).json({
                  success: false,
                  message: 'Coin payment details are required'
              });
          }
          
          const coinValues = {
              quarters: 0.25,
              dimes: 0.10,
              nickels: 0.05,
              pennies: 0.01,
              oneRupee: 1,
              twoRupee: 2,
              fiveRupee: 5,
              tenRupee: 10
          };
          
          let totalCoinValue = 0;
          Object.keys(coinPayment).forEach(coinType => {
              const count = parseInt(coinPayment[coinType]) || 0;
              if (count > 0 && coinValues[coinType]) {
                  totalCoinValue += count * coinValues[coinType];
              }
          });
          

          if (totalCoinValue < paymentAmount) {
              return res.status(400).json({
                  success: false,
                  message: 'Insufficient coin payment for the bill amount'
              });
          }
          
          const change = totalCoinValue - paymentAmount;
          if (change > 0) {
              user.walletBalance += change;
          }
      } else {
          return res.status(400).json({
              success: false,
              message: 'Invalid payment method'
          });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyTransactions = await BillPayment.find({
          userId: req.user._id,
          paymentDate: { $gte: today }
      });
      
      const dailyTotal = dailyTransactions.reduce((sum, payment) => sum + payment.amount, 0);
      const dailyLimit = parseFloat(process.env.BILL_PAYMENT_DAILY_LIMIT) || 50000;
      
      if (dailyTotal + paymentAmount > dailyLimit) {
          return res.status(400).json({
              success: false,
              message: `Daily payment limit of ₹${dailyLimit} exceeded`
          });
      }
      
      const transactionFee = paymentAmount * (parseFloat(process.env.BILL_TRANSACTION_FEE) || 0);
      let totalDeduction = paymentAmount + transactionFee;
      
      const transaction = new Transaction({
          userId: req.user._id,
          type: 'BILL_PAYMENT',
          amount: paymentAmount,
          fee: transactionFee,
          description: `Bill payment to ${provider} for ${billType}`,
          status: 'COMPLETED',
          reference: consumerNumber,
          paymentMethod: paymentMethod
      });
      
      if (paymentMethod === 'coins') {
          transaction.coinPayment = coinPayment;
      }
      
      const billPayment = new BillPayment({
          userId: req.user._id,
          billType,
          provider,
          consumerNumber,
          amount: paymentAmount,
          transactionId: transaction._id,
          status: 'Paid',
          paymentDate: new Date(),
          paymentMethod: paymentMethod
      });
      
      let rewardsAmount = 0;
      if (process.env.BILL_PAYMENT_REWARDS_ENABLED === 'true') {
          const rewardPercentage = parseFloat(process.env.BILL_PAYMENT_REWARD_PERCENTAGE) || 0.02;
          const specialCategories = (process.env.BILL_PAYMENT_SPECIAL_CATEGORIES || '').split(',');
          
          if (specialCategories.includes(billType)) {
              rewardsAmount = paymentAmount * (rewardPercentage * 2);
          } else {
              rewardsAmount = paymentAmount * rewardPercentage;
          }
      }

      if (billType === 'electricity' && req.body.code === 'ERUPEE10') {
          const cashbackAmount = Math.min(paymentAmount * 0.1, 100);
          rewardsAmount += cashbackAmount;
      }
      
      if (billType === 'tax') {
          rewardsAmount *= 2;
      }
      
      if (billType === 'water') {
          totalDeduction = paymentAmount;
      }
      
      if (paymentMethod === 'wallet') {
          user.walletBalance -= totalDeduction;
      }
      
      if (rewardsAmount > 0) {
          user.walletBalance += rewardsAmount;
          user.rewardsEarned = (user.rewardsEarned || 0) + rewardsAmount;
      }
      
      await Promise.all([
          user.save(),
          transaction.save(),
          billPayment.save()
      ]);
      
      sendNotification(
          req.user._id,
          'Bill Payment Successful',
          `Your payment of ₹${paymentAmount} to ${provider} was successful.`,
          'success',
          process.env.BILL_PAYMENT_SUCCESS_TEMPLATE
      );
      
      return res.status(200).json({
          success: true,
          message: 'Bill payment successful',
          transactionId: transaction._id,
          amount: paymentAmount,
          fee: transactionFee,
          rewards: rewardsAmount,
          newBalance: user.walletBalance,
          paymentMethod: paymentMethod,
          change: paymentMethod === 'coins' ? (totalCoinValue - paymentAmount) : 0
      });
  } catch (err) {
      console.error('Error processing bill payment:', err);
      return res.status(500).json({ 
          success: false, 
          message: 'Payment processing failed. Please try again.' 
      });
  }
});

router.post('dashboard/bill/verify-coins', isLoggedIn, (req, res) => {
  try {
      const { amount, coinPayment } = req.body;
      
      if (!amount || !coinPayment) {
          return res.status(400).json({
              success: false,
              message: 'Amount and coin payment details are required'
          });
      }
      
      const paymentAmount = parseFloat(amount);
      
      const coinValues = {
          quarters: 0.25,
          dimes: 0.10,
          nickels: 0.05,
          pennies: 0.01,
          oneRupee: 1,
          twoRupee: 2,
          fiveRupee: 5,
          tenRupee: 10
      };
      
      let totalCoinValue = 0;
      const coinCounts = {};
      
      Object.keys(coinPayment).forEach(coinType => {
          const count = parseInt(coinPayment[coinType]) || 0;
          coinCounts[coinType] = count;
          if (count > 0 && coinValues[coinType]) {
              totalCoinValue += count * coinValues[coinType];
          }
      });
      
      if (totalCoinValue < paymentAmount) {
          return res.status(400).json({
              success: false,
              message: 'Insufficient coin payment for the bill amount',
              shortfall: paymentAmount - totalCoinValue
          });
      }
      
      const change = totalCoinValue - paymentAmount;
      
      return res.status(200).json({
          success: true,
          totalCoinValue,
          billAmount: paymentAmount,
          change,
          coinCounts
      });
  } catch (err) {
      console.error('Error verifying coin payment:', err);
      return res.status(500).json({
          success: false,
          message: 'Failed to verify coin payment'
      });
  }
});

router.get('dashboard/bill/history', isLoggedIn, async (req, res) => {
  try {
      const payments = await BillPayment.find({ userId: req.user._id })
          .sort({ paymentDate: -1 })
          .limit(20);
      
      return res.status(200).json({
          success: true,
          payments: payments.map(payment => ({
              id: payment._id,
              provider: payment.provider,
              amount: payment.amount,
              paymentDate: payment.paymentDate,
              status: payment.status,
              billType: payment.billType,
              consumerNumber: payment.consumerNumber,
              paymentMethod: payment.paymentMethod || 'wallet'
          }))
      });
  } catch (err) {
      console.error('Error fetching bill payment history:', err);
      return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch payment history' 
      });
  }
});

router.get('dashboard/bill/offers', isLoggedIn, (req, res) => {
  try {
      const offers = [
          {
              id: 'offer1',
              title: '10% Cashback',
              description: 'On electricity bills',
              code: 'ERUPEE10',
              details: 'Get 10% cashback up to ₹100 on electricity bill payments',
              validUntil: new Date('2025-04-30'),
              category: 'electricity',
              iconPath: '/images/cashback.gif'
          },
          {
              id: 'offer2',
              title: 'Extra Rewards',
              description: 'On tax payments',
              details: 'Earn 2X reward points on all tax payments made through e-Rupee',
              validUntil: new Date('2025-05-15'),
              category: 'tax',
              iconPath: '/images/Reward Icon.gif'
          },
          {
              id: 'offer3',
              title: 'Zero Transaction Fee',
              description: 'On water bills',
              details: 'Pay water bills with zero transaction fees this month',
              validUntil: new Date('2025-04-15'),
              category: 'water',
              iconPath: '/images/Water Icon.gif'
          }
      ];
      
      return res.status(200).json({
          success: true,
          offers
      });
  } catch (err) {
      console.error('Error fetching bill payment offers:', err);
      return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch offers' 
      });
  }
});

router.get('dashboard/bill/providers/:billType', isLoggedIn, (req, res) => {
  const { billType } = req.params;
  
  try {
      let providers = [];
      
      switch (billType) {
          case 'electricity':
              providers = ['Tata Power', 'Reliance Energy', 'Adani Electricity', 'BEST', 'MSEDCL'];
              break;
          case 'water':
              providers = ['Municipal Corporation', 'Water Supply Department', 'Jal Board'];
              break;
          case 'internet':
              providers = ['Jio Fiber', 'Airtel Xstream', 'ACT Fibernet', 'BSNL Broadband', 'Tata Play Fiber'];
              break;
          case 'mobile':
              providers = ['Jio', 'Airtel', 'Vodafone Idea', 'BSNL'];
              break;
          case 'gas':
              providers = ['Mahanagar Gas', 'Indraprastha Gas', 'Adani Gas', 'Gujarat Gas'];
              break;
          case 'tax':
              providers = ['Income Tax', 'Property Tax', 'GST', 'Professional Tax'];
              break;
          default:
              providers = [];
      }
      
      return res.status(200).json({
          success: true,
          providers
      });
  } catch (err) {
      console.error(`Error fetching providers for ${billType}:`, err);
      return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch service providers' 
      });
  }
});

router.get('dashboard/bill/quick-pay', isLoggedIn, async (req, res) => {
  try {
      const quickPayOptions = await getQuickPayOptions(req.user._id);
      
      return res.render('pages/quickpay', {
          billers: quickPayOptions,
          user: req.user
      });
  } catch (err) {
      console.error('Error fetching quick pay billers:', err);
      return res.status(500).render('error', {
          message: 'Failed to fetch quick pay options'
      });
  }
});

module.exports = router;