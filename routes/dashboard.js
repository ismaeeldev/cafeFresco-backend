const express = require('express');
const router = express.Router();
const moment = require('moment');
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin');
const Order = require('../models/order')

router.get('/earning', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        // Date Ranges
        const startOfMonth = moment().startOf('month').toDate();
        const startOfWeek = moment().startOf('week').toDate();
        const startOfYear = moment().startOf('year').toDate();
        const endOfToday = moment().endOf('day').toDate();

        // Common Filter
        const filter = { paymentStatus: "paid" };

        // Earnings for this Month
        const earningsThisMonth = await Order.aggregate([
            { $match: { ...filter, createdAt: { $gte: startOfMonth, $lte: endOfToday } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        // Earnings for this Week
        const earningsThisWeek = await Order.aggregate([
            { $match: { ...filter, createdAt: { $gte: startOfWeek, $lte: endOfToday } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        // Earnings for this Year
        const earningsThisYear = await Order.aggregate([
            { $match: { ...filter, createdAt: { $gte: startOfYear, $lte: endOfToday } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        // Response
        res.json({
            month: earningsThisMonth[0]?.total || 0,
            week: earningsThisWeek[0]?.total || 0,
            year: earningsThisYear[0]?.total || 0
        });
    } catch (error) {
        console.error("Error fetching earnings:", error);
        res.status(500).json({ message: "Error fetching earnings", error });
    }
});


router.get('/dashboard', isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // Start & End of the Current Month
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        // Start & End of the Current Year
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

        // Total Earnings (Paid Orders)
        const totalEarnings = await Order.aggregate([
            { $match: { paymentStatus: "paid" } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);

        // Total Completed Orders
        const totalCompletedOrders = await Order.countDocuments({ orderStatus: "completed" });

        // Total Pending Orders
        const totalPendingOrders = await Order.countDocuments({ orderStatus: "pending" });

        // Total Orders in Current Month
        const totalOrdersThisMonth = await Order.countDocuments({
            createdAt: { $gte: startOfMonth, $lt: endOfMonth }
        });

        // Total Orders in Current Year
        const totalOrdersThisYear = await Order.countDocuments({
            createdAt: { $gte: startOfYear, $lt: endOfYear }
        });

        res.json({
            totalEarnings: totalEarnings[0]?.total || 0,
            totalCompletedOrders,
            totalPendingOrders,
            totalOrdersThisMonth,
            totalOrdersThisYear
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Error fetching dashboard data", error });
    }
});

router.get("/yearly-report", isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        // Initialize arrays for each month (Jan to Dec)
        let ordersPerMonth = new Array(12).fill(0);
        let earningsPerMonth = new Array(12).fill(0);

        // Fetch completed orders and earnings for the current year
        const orders = await Order.aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalOrders: { $sum: 1 },
                    totalEarnings: { $sum: "$totalAmount" },
                },
            },
        ]);

        // Map data to the arrays
        orders.forEach((order) => {
            const monthIndex = order._id - 1; // MongoDB months are 1-based (Jan = 1, Feb = 2, ...)
            ordersPerMonth[monthIndex] = order.totalOrders;
            earningsPerMonth[monthIndex] = order.totalEarnings;
        });

        // Response in chart format
        res.json([
            { name: "Order", data: ordersPerMonth },
            { name: "Earning", data: earningsPerMonth },
        ]);
    } catch (error) {
        console.error("Error fetching yearly report:", error);
        res.status(500).json({ message: "Error fetching yearly report", error });
    }
});


router.get("/daily-report", isAdmin, authorizeRoles("admin"), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch the latest 5 orders of today
        const latestOrders = await Order.find({
            createdAt: { $gte: today, $lt: tomorrow }
        })
            .sort({ createdAt: -1 })
            .limit(4)
            .populate("userId", "name email");

        // Calculate total amount of all today's orders
        const totalAmount = await Order.aggregate([
            {
                $match: { createdAt: { $gte: today, $lt: tomorrow } }
            },
            {
                $group: { _id: null, total: { $sum: "$totalAmount" } }
            }
        ]);

        // Generate random data for the graph (7 values)
        const graphData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 1);

        res.json({
            success: true,
            latestOrders,
            totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
            series: [
                {
                    data: graphData
                }
            ]
        });
    } catch (error) {
        console.error("Error fetching daily report:", error);
        res.status(500).json({ message: "Error fetching daily report", error });
    }
});



module.exports = router;