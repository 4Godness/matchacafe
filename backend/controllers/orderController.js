// controllers/orderController.js - FULL UPDATED VERSION (ESM)
import db from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

// Generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random.toString().padStart(3, '0')}`;
};

// =======================================================
// =============== CREATE ORDER (UPDATED) ================
// =======================================================
export const createOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            user_id,
            name,
            phone,
            email,
            table_number,
            shipping_address,
            notes,
            total_amount,
            final_amount,
            items
        } = req.body;

        // Validate
        if (!items || !Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item'
            });
        }

        // Generate order number
        const order_number = generateOrderNumber();

        const shipAddress =
            shipping_address ||
            `Makan di tempat - Meja ${table_number || ''}`;

        // CREATE ORDER ROW
        const [orderResult] = await connection.execute(
            `INSERT INTO orders 
             (order_number, user_id, customer_name, customer_email, customer_phone,
              total_amount, final_amount, shipping_address, table_number, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                order_number,
                user_id,
                name,
                email,
                phone,
                total_amount,
                final_amount,
                shipAddress,
                table_number,
                notes || '',
                'pending'
            ]
        );

        const orderId = orderResult.insertId;

        // CREATE ORDER ITEMS
        for (const item of items) {
            await connection.execute(
                `INSERT INTO order_items 
                 (order_id, product_id, quantity, price)
                 VALUES (?, ?, ?, ?)`,
                [
                    orderId,
                    item.id,      // <-- product_id
                    item.quantity,
                    item.price
                ]
            );
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order_id: orderId,
            order_number
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Create order error:', error);

        res.status(500).json({
            success: false,
            message: 'Server error while creating order'
        });
    }
};

// =======================================================
// =============== GET USER ORDERS =======================
// =======================================================
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userEmail = req.user?.email;

        let query = `SELECT * FROM orders WHERE 1=1`;
        const params = [];

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        } else if (userEmail) {
            query += ' AND customer_email = ?';
            params.push(userEmail);
        }

        query += ' ORDER BY created_at DESC';

        const [orders] = await db.execute(query, params);

        // Fetch items
        for (const order of orders) {
            const [items] = await db.execute(
                `SELECT oi.*, p.name as product_name, p.image_url as product_image
                 FROM order_items oi
                 LEFT JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

// =======================================================
// =============== GET ORDER BY ID =======================
// =======================================================
export const getOrderById = async (req, res) => {
    try {
        const orderId = req.params.id;

        const [orders] = await db.execute(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        const [items] = await db.execute(
            `SELECT oi.*, p.name as product_name, p.image_url as product_image,
                    p.description as product_description
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        order.items = items;

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching order'
        });
    }
};

// =======================================================
// =============== UPDATE ORDER STATUS ===================
// =======================================================
export const updateOrderStatus = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { status } = req.body;
        const orderId = req.params.id;

        const validStatuses = [
            'pending',
            'processing',
            'preparing',
            'ready',
            'completed',
            'cancelled'
        ];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be: ${validStatuses.join(', ')}`
            });
        }

        await db.execute(
            `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, orderId]
        );

        res.json({
            success: true,
            message: 'Order status updated'
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating status'
        });
    }
};

// =======================================================
// ==================== ADMIN GET ALL ====================
// =======================================================
export const getAllOrders = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const [orders] = await db.execute(
            `SELECT * FROM orders ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

// =======================================================
// ==================== CANCEL ORDER =====================
// =======================================================
export const cancelOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const orderId = req.params.id;

        const [orders] = await connection.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Validate allowed cancellation
        if (['completed', 'cancelled', 'ready'].includes(order.status)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled in status: ${order.status}`
            });
        }

        // Restore stock only if order was already processed
        if (order.status === 'processing' || order.status === 'preparing') {
            const [items] = await connection.execute(
                'SELECT * FROM order_items WHERE order_id = ?',
                [orderId]
            );

            for (const item of items) {
                await connection.execute(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        // Cancel order
        await connection.execute(
            'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [orderId]
        );

        await connection.commit();
        connection.release();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        await connection.rollback();
        connection.release();

        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error cancelling order'
        });
    }
};

// =======================================================
// ==================== STATISTICS (ADMIN) ===============
// =======================================================
export const getOrderStatistics = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { period = 'today' } = req.query;

        let dateFilter = '';

        switch (period) {
            case 'today':
                dateFilter = 'DATE(created_at) = CURDATE()';
                break;
            case 'week':
                dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
                break;
            case 'month':
                dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
                break;
            case 'year':
                dateFilter = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
                break;
            default:
                dateFilter = '1=1';
        }

        const [summary] = await db.execute(`
            SELECT COUNT(*) AS total_orders,
                   SUM(total_amount) AS total_revenue
            FROM orders
            WHERE ${dateFilter}
        `);

        const [statusData] = await db.execute(`
            SELECT status, COUNT(*) AS count
            FROM orders
            WHERE ${dateFilter}
            GROUP BY status
        `);

        res.json({
            success: true,
            data: {
                summary: summary[0],
                by_status: statusData
            }
        });

    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching statistics'
        });
    }
};
