// models/Order.js - FINAL FIXED VERSION
import db from '../database/connection.js';

class Order {

    // Generate unique order number
    static generateOrderNumber() {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `ORD-${timestamp}-${randomString}`;
    }

    // ================================
    // CART FUNCTIONS (Updated for cart_items)
    // ================================

    // Add item to cart
    static async addToCart(userId, productId, quantity = 1) {
        const connection = await db.getConnection();
        const qty = parseInt(quantity);

        if (isNaN(qty) || qty <= 0) {
            throw new Error('Quantity must be a positive number.');
        }

        try {
            await connection.beginTransaction();

            // Check product exists
            const [product] = await connection.execute(
                'SELECT price FROM products WHERE id = ? AND is_active = 1',
                [productId]
            );

            if (product.length === 0) {
                throw new Error('Product not found or inactive');
            }

            // Check existing cart item
            const [existing] = await connection.execute(
                'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
                [userId, productId]
            );

            if (existing.length > 0) {
                const newQty = existing[0].quantity + qty;
                await connection.execute(
                    'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
                    [newQty, existing[0].id]
                );
            } else {
                await connection.execute(
                    'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [userId, productId, qty]
                );
            }

            // Count cart items
            const [count] = await connection.execute(
                'SELECT SUM(quantity) AS count FROM cart_items WHERE user_id = ?',
                [userId]
            );

            await connection.commit();

            return {
                success: true,
                message: 'Item added to cart',
                cart_count: count[0].count || 0
            };

        } catch (error) {
            await connection.rollback();
            console.error('❌ Add to cart error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get cart items with product details
    static async getCartItems(userId) {
        try {
            const [items] = await db.execute(
                `SELECT 
                    c.id, c.user_id, c.product_id, c.quantity,
                    p.name, p.price, p.image_url,
                    cat.name AS category_name
                FROM cart_items c
                JOIN products p ON c.product_id = p.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC`,
                [userId]
            );

            return items;
        } catch (error) {
            console.error('❌ Get cart items error:', error);
            throw error;
        }
    }

    // Update cart quantity
    static async updateCartQuantity(userId, productId, quantity) {
        try {
            const [result] = await db.execute(
                'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ?',
                [quantity, userId, productId]
            );

            return {
                success: result.affectedRows > 0,
                message: result.affectedRows > 0 ? 'Quantity updated' : 'Cart item not found'
            };

        } catch (error) {
            console.error('❌ Update cart quantity error:', error);
            throw error;
        }
    }

    // Remove item from cart
    static async removeFromCart(userId, productId) {
        try {
            const [result] = await db.execute(
                'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
                [userId, productId]
            );

            return {
                success: result.affectedRows > 0,
                message: result.affectedRows > 0 ? 'Item removed' : 'Item not found'
            };

        } catch (error) {
            console.error('❌ Remove from cart error:', error);
            throw error;
        }
    }

    // Clear cart
    static async clearCart(userId) {
        try {
            const [result] = await db.execute(
                'DELETE FROM cart_items WHERE user_id = ?',
                [userId]
            );

            return {
                success: true,
                message: `Cleared ${result.affectedRows} items from cart`,
                affectedRows: result.affectedRows
            };

        } catch (error) {
            console.error('❌ Clear cart error:', error);
            throw error;
        }
    }

    // Cart count
    static async getCartCount(userId) {
        try {
            const [result] = await db.execute(
                'SELECT SUM(quantity) AS count FROM cart_items WHERE user_id = ?',
                [userId]
            );

            return result[0].count || 0;
        } catch (error) {
            console.error('❌ Cart count error:', error);
            return 0;
        }
    }

    // ================================
    // CHECKOUT FUNCTIONS
    // ================================

    static async getCartForCheckout(userId) {
        try {
            const items = await this.getCartItems(userId);

            const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const tax = subtotal * 0.1;
            const deliveryFee = 10000;
            const grandTotal = subtotal + tax + deliveryFee;

            return {
                items,
                subtotal,
                tax,
                deliveryFee,
                grandTotal,
                items_count: items.length
            };

        } catch (error) {
            console.error('❌ Get cart for checkout error:', error);
            throw error;
        }
    }

    // ================================
    // CREATE ORDER
    // ================================
    static async create(userId, orderData, cartItems) {

        if (!cartItems || cartItems.length === 0) {
            throw new Error("Cannot create order: Cart is empty");
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const subtotal = cartItems.reduce((t, i) => t + i.price * i.quantity, 0);
            const tax = subtotal * 0.1;
            const deliveryFee = 10000;
            const finalAmount = subtotal + tax + deliveryFee;

            const orderNumber = this.generateOrderNumber();

            // Insert orders
            const [orderRes] = await connection.execute(
                `INSERT INTO orders (
                    order_number, user_id, total_amount,
                    shipping_fee, final_amount,
                    status, payment_method, payment_status,
                    shipping_address, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderNumber,
                    userId,
                    subtotal,
                    deliveryFee,
                    finalAmount,
                    'pending',
                    orderData.payment_method,
                    'pending',
                    orderData.shipping_address,
                    orderData.notes
                ]
            );

            const orderId = orderRes.insertId;

            // Insert items
            for (const item of cartItems) {
                await connection.execute(
                    `INSERT INTO order_items 
                    (order_id, product_id, quantity, price, subtotal)
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        orderId,
                        item.product_id,
                        item.quantity,
                        item.price,
                        item.price * item.quantity
                    ]
                );
            }

            // Clear cart
            await connection.execute(
                'DELETE FROM cart_items WHERE user_id = ?',
                [userId]
            );

            await connection.commit();

            return {
                orderId,
                orderNumber,
                subtotal,
                tax,
                deliveryFee,
                grandTotal: finalAmount,
                items_count: cartItems.length
            };

        } catch (error) {
            await connection.rollback();
            console.error('❌ Order create error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // ================================
    // ORDER HISTORY & DETAILS
    // ================================

    static async findByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT 
                o.id, o.order_number, o.status, 
                o.final_amount, o.created_at,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC`,
            [userId]
        );

        return rows;
    }

    static async getOrderDetails(orderId) {
        const [[order]] = await db.execute(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        );

        if (!order) return null;

        const [items] = await db.execute(
            `SELECT 
                oi.*, 
                p.name AS product_name,
                p.image_url AS product_image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`,
            [orderId]
        );

        return {
            ...order,
            items
        };
    }

    // ================================
    // ADMIN FUNCTIONS
    // ================================

    static async updateStatus(id, status) {
        const valid = ['pending', 'processing', 'ready', 'completed', 'cancelled'];

        if (!valid.includes(status)) {
            throw new Error("Invalid status");
        }

        await db.execute(
            'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        return this.getOrderDetails(id);
    }

    static async updatePaymentStatus(id, paymentStatus) {
        const valid = ['pending', 'paid', 'failed', 'refunded'];

        if (!valid.includes(paymentStatus)) {
            throw new Error("Invalid payment status");
        }

        await db.execute(
            'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
            [paymentStatus, id]
        );

        return this.getOrderDetails(id);
    }

    static async getAll(limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    }

    static async getRecentOrders(limit = 10) {
        const [rows] = await db.execute(
            `SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`,
            [limit]
        );
        return rows;
    }

    static async findByStatus(status, limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [status, limit, offset]
        );
        return rows;
    }

    static async getStatistics() {
        const [[stats]] = await db.execute(
            `SELECT 
                COUNT(*) AS total_orders,
                SUM(final_amount) AS total_revenue,
                AVG(final_amount) AS avg_order_value,
                MIN(created_at) AS first_order,
                MAX(created_at) AS last_order
            FROM orders`
        );

        return stats;
    }

    static async delete(id) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.execute(
                'DELETE FROM order_items WHERE order_id = ?',
                [id]
            );

            const [result] = await connection.execute(
                'DELETE FROM orders WHERE id = ?',
                [id]
            );

            await connection.commit();

            return result.affectedRows > 0;

        } catch (error) {
            await connection.rollback();
            console.error('❌ Delete order error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default Order;
