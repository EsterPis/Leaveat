const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Order = require('../models/Order');
const { authMiddleware } = require('../middleware/auth');

/* A → ROUTE HANDLER */
router.get('/:id/stats', authMiddleware, getRestaurantStats);

/* B → FUNCTIONS */
async function getRestaurantStats(req, res) {

    try {

        const restaurantId = new mongoose.Types.ObjectId(req.params.id);

        const summary = await getSummaryStats(restaurantId);
        const ordersByDay = await getOrdersByDay(restaurantId);
        const topDishes = await getTopDishes(restaurantId);

        res.json({
            success: true,
            data: {
                summary,
                ordersByDay,
                topDishes
            }
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

}


async function getSummaryStats(restaurantId) {

    const result = await Order.aggregate([
        { $match: { restaurantId } },

        {
            $group: {
                _id: null,

                totalOrders: { $sum: 1 },

                completedOrders: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", "CONSEGNATO"] },
                            1,
                            0
                        ]
                    }
                },

                revenue: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", "CONSEGNATO"] },
                            "$totalPrice",
                            0
                        ]
                    }
                },

                avgOrder: { $avg: "$totalPrice" }
            }
        }
    ]);

    return result[0] || {
        totalOrders: 0,
        completedOrders: 0,
        revenue: 0,
        avgOrder: 0
    };
}

async function getOrdersByDay(restaurantId) {

    return await Order.aggregate([

        { $match: { restaurantId } },

        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                    }
                },
                count: { $sum: 1 }
            }
        },

        { $sort: { _id: 1 } }

    ]);
}

async function getTopDishes(restaurantId) {

    return await Order.aggregate([

        { $match: { restaurantId } },

        { $unwind: "$items" },

        {
            $group: {
                _id: "$items.dishId",
                totalSold: { $sum: "$items.quantity" }
            }
        },

        { $sort: { totalSold: -1 } },

        { $limit: 5 },

        {
            $lookup: {
                from: "dishes",
                localField: "_id",
                foreignField: "_id",
                as: "dish"
            }
        },

        { $unwind: "$dish" },

        {
            $project: {
                name: "$dish.name",
                totalSold: 1
            }
        }

    ]);
}

module.exports = router;