const express = require('express');
const orderModel = require('../models/order');
const router = express.Router();
const { isAdmin, authorizeRoles } = require('../middleware/isAdmin');
const isLogged = require('../middleware/isLogged');
const moment = require('moment');
const productModel = require('../models/product')
const userModel = require('../models/user')
const notifyModel = require('../models/notification')



router.post('/create', isLogged, async (req, res) => {
    const { products, totalAmount, payment } = req.body;
    const userId = req.user.userId;

    try {
        const user = await userModel.findById(userId).populate('cart');
        if (!user || !user.cart) {
            return res.status(404).json({ message: 'User or cart not found' });
        }

        // Deduct stock
        for (const item of products) {
            const product = await productModel.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.productId} not found` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.name}` });
            }
            product.stock -= item.quantity;
            await product.save();
        }

        // Create order
        const newOrder = new orderModel({
            userId,
            products,
            totalAmount,
            paymentStatus: `${payment}` || 'unpaid',
        });
        await newOrder.save();

        // Remove ordered items from cart
        user.cart.items = user.cart.items.filter(cartItem =>
            !products.some(orderItem => orderItem.productId.toString() === cartItem.productId.toString())
        );
        await user.cart.save();

        // Create notify
        await new notifyModel({
            name: user.name,
            message: `Order received from ${user.name}`,
            type: 'order',
        }).save();

        res.status(201).json({ message: 'Order created successfully', order: newOrder });


    } catch (error) {
        console.error("Order creation failed:", error);
        return res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
});



router.post('/update-status', isAdmin, authorizeRoles("admin", "manager"), async (req, res) => {

    const { orderId, paymentStatus, orderStatus } = req.body;

    try {
        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (paymentStatus) {
            if (paymentStatus === 'paid' || paymentStatus === 'unpaid') {
                order.paymentStatus = paymentStatus;
            } else {
                return res.status(400).json({ message: 'Invalid payment status value' });
            }
        }

        if (orderStatus) {
            if (['pending', 'completed', 'cancelled'].includes(orderStatus)) {
                order.orderStatus = orderStatus;
            } else {
                return res.status(400).json({ message: 'Invalid order status value' });
            }
        }


        order.validateSync();
        await order.save({ validateBeforeSave: false });

        const notify = new notifyModel({
            name: req.admin.name,
            message: `${req.admin.name} update order status`,
            type: 'order',
        })
        await notify.save();

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order status', error: error.message });
    }
});


router.get('/fetch', isAdmin, authorizeRoles("admin", "editor", "manager"), async (req, res) => {
    try {
        const { status, paymentStatus, year, month, page = 1, limit = 10, search } = req.query;
        const query = {};

        // ✅ Handle Search by Order ID
        if (search) {
            query._id = search;
        }

        // ✅ Handle Date Filtering
        if (year && month) {
            query.createdAt = {
                $gte: moment(`${year}-${month}-01`, "YYYY-MM-DD").startOf('month').toDate(),
                $lte: moment(`${year}-${month}-01`, "YYYY-MM-DD").endOf('month').toDate(),
            };
        } else if (year) {
            query.createdAt = {
                $gte: moment(`${year}-01-01`, "YYYY-MM-DD").startOf('year').toDate(),
                $lte: moment(`${year}-12-31`, "YYYY-MM-DD").endOf('year').toDate(),
            };
        } else if (month) {
            const currentYear = moment().year();
            query.createdAt = {
                $gte: moment(`${currentYear}-${month}-01`, "YYYY-MM-DD").startOf('month').toDate(),
                $lte: moment(`${currentYear}-${month}-01`, "YYYY-MM-DD").endOf('month').toDate(),
            };
        }

        // ✅ Handle Status Filtering
        if (status) {
            const validStatuses = ['completed', 'cancelled', 'pending'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid order status' });
            }
            query.orderStatus = status;
        }

        // ✅ Handle Payment Status Filtering
        if (paymentStatus) {
            const validPaymentStatuses = ['paid', 'unpaid'];
            if (!validPaymentStatuses.includes(paymentStatus)) {
                return res.status(400).json({ message: 'Invalid payment status' });
            }
            query.paymentStatus = paymentStatus;
        }

        // ✅ Apply Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const orders = await orderModel.find(query)
            .populate('userId', 'name email')
            .populate('products.productId', 'title price')
            .skip(skip)
            .limit(parseInt(limit));




        if (orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for this query' });
        }

        // ✅ Return Response
        res.status(200).json({
            success: true,
            message: 'Orders fetched successfully',
            page: parseInt(page),
            limit: parseInt(limit),
            totalOrders: orders.length,
            orders
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
});



router.get('/history/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const orders = await orderModel.find({ userId })
            .populate('products userId')
            .exec();

        if (!orders) {
            return res.status(404).json({ message: 'No orders found' });
        }

        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order history', error: error.message });
    }
});



router.get("/stats", async (req, res) => {
    try {
        const { all, year, month } = req.query;
        let filter = { orderStatus: "completed" };

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (all) {
            // All-time revenue & completed orders
            filter = { orderStatus: "completed" };
        } else if (year && month) {
            // Specific Year & Month
            filter.createdAt = {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1),
            };
        } else if (year) {
            // Only Year Provided
            filter.createdAt = {
                $gte: new Date(year, 0, 1),
                $lt: new Date(Number(year) + 1, 0, 1),
            };
        } else if (month) {
            // Only Month Provided (Use Current Year)
            filter.createdAt = {
                $gte: new Date(currentYear, month - 1, 1),
                $lt: new Date(currentYear, month, 1),
            };
        } else {
            // Default: Current Month & Year
            filter.createdAt = {
                $gte: new Date(currentYear, currentMonth - 1, 1),
                $lt: new Date(currentYear, currentMonth, 1),
            };
        }

        // Aggregate total revenue & completed orders
        const revenueData = await orderModel.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 },
                },
            },
        ]);

        // Extract values or set defaults
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        const totalOrders = revenueData.length > 0 ? revenueData[0].totalOrders : 0;

        res.status(200).json({
            message: "Revenue stats fetched successfully",
            totalRevenue,
            totalOrders,
            filterApplied: filter.createdAt ? filter.createdAt : "All-time",
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching revenue stats", error });
    }
});


router.post('/set-transaction/:orderId', isLogged, async (req, res) => {
    const { orderId } = req.params;
    const { paymentId } = req.body;

    try {
        if (!paymentId) {
            return res.status(400).json({ message: 'Payment ID is required' });
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.paymentId = paymentId;
        await order.save();

        res.status(200).json({ message: 'Payment ID updated successfully', order });
    } catch (error) {
        console.error('Error updating payment ID:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});



module.exports = router;