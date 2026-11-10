// routes/orderRoutes.js (Updated with safer user.id checks)
import express from 'express';
import Order from '../models/Order.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Middleware untuk memastikan req.user.id ada
const ensureUserId = (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'User authentication failed. User ID not found.'
        });
    }
    next();
};

// Gunakan kedua middleware: verifyToken dan ensureUserId
const authWithUserId = [verifyToken, ensureUserId];

// --- CART ROUTES ---

// @route   GET /api/orders/checkout
// @desc    Get checkout data (cart items)
// @access  Private
router.get('/checkout', authWithUserId, async (req, res) => {
    try {
        // PENTING: Menggunakan metode model yang sudah diperbaiki
        const cartData = await Order.getCartForCheckout(req.user.id);

        if (cartData.items_count === 0) {
            return res.json({
                success: true,
                message: "Keranjang kosong",
                cart: cartData,
                cart_count: 0
            });
        }

        res.json({
            success: true,
            message: "Cart loaded successfully",
            cart: cartData,
            cart_count: cartData.items_count
        });

    } catch (error) {
        console.error('❌ Checkout error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get checkout data',
            error: error.message,
            cart: { items: [], subtotal: 0, tax: 0, deliveryFee: 0, grandTotal: 0, items_count: 0 }
        });
    }
});

// @route   POST /api/orders/create
// @desc    Create new order (Checkout)
// @access  Private
router.post('/create', authWithUserId, async (req, res) => {
    try {
        const {
            shipping_address,
            payment_method,
            notes
        } = req.body;

        console.log('📦 [MAIN] Creating order for user:', req.user.id);

        // 1. Ambil data keranjang (yang berisi items[])
        const cartData = await Order.getCartForCheckout(req.user.id);

        if (!cartData || cartData.items_count === 0) {
            return res.status(400).json({
                success: false,
                message: 'Keranjang Anda kosong. Tambahkan produk untuk checkout.'
            });
        }

        // 2. Kirim orderData dan items dari keranjang ke Order.create
        const order = await Order.create(
            req.user.id,
            {
                shipping_address: shipping_address || 'Take Away',
                payment_method: payment_method || 'cash',
                notes: notes || ''
            },
            cartData.items
        );

        console.log('📊 Order data:', {
            orderNumber: order.orderNumber,
            items_count: order.items_count,
            grandTotal: order.grandTotal,
            paymentMethod: payment_method || 'cash'
        });

        console.log(`✅ Order created via /api/orders/create: ${order.orderNumber}`);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: {
                order_id: order.orderId,
                order_number: order.orderNumber,
                items_count: order.items_count,
                subtotal: order.subtotal,
                tax: order.tax,
                delivery_fee: order.deliveryFee,
                grand_total: order.grandTotal,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Create order error:', error);

        let statusCode = 500;
        let errorMessage = 'Failed to create order';

        if (error.message.includes('Keranjang Anda kosong') || error.message.includes('Cannot create order')) {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.message.includes('missing product_id')) {
            statusCode = 400;
            errorMessage = "Item di keranjang Anda tidak valid. Mohon bersihkan dan coba lagi.";
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

// @route   POST /api/orders/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/cart/add', authWithUserId, async (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.body;

        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number'
            });
        }

        console.log('🛒 Add to cart:', {
            userId: req.user.id,
            productId: product_id,
            quantity: qty
        });

        const result = await Order.addToCart(req.user.id, product_id, qty);

        res.json({
            success: true,
            message: result.message,
            cart_count: result.cart_count
        });

    } catch (error) {
        console.error('❌ Add to cart error:', error);

        let statusCode = 500;
        let errorMessage = 'Failed to add item to cart';

        if (error.message.includes('Product not found')) {
            statusCode = 404;
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

// @route   DELETE /api/orders/cart/remove/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/cart/remove/:productId', authWithUserId, async (req, res) => {
    try {
        const { productId } = req.params;

        const result = await Order.removeFromCart(req.user.id, productId);

        res.json({
            success: result.success,
            message: result.message
        });

    } catch (error) {
        console.error('❌ Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from cart',
            error: error.message
        });
    }
});

// @route   DELETE /api/orders/cart/clear
// @desc    Clear cart
// @access  Private
router.delete('/cart/clear', authWithUserId, async (req, res) => {
    try {
        const result = await Order.clearCart(req.user.id);

        console.log(`🗑️ Cleared cart for user: ${req.user.id}`);
        console.log(`🗑️ ${result.message}`);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('❌ Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error.message
        });
    }
});

// @route   GET /api/orders/cart/count
// @desc    Get cart count
// @access  Private
router.get('/cart/count', authWithUserId, async (req, res) => {
    try {
        const count = await Order.getCartCount(req.user.id);

        res.json({
            success: true,
            cart_count: count
        });

    } catch (error) {
        console.error('❌ Get cart count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cart count',
            cart_count: 0,
            error: error.message
        });
    }
});

// @route   GET /api/orders/cart/items
// @desc    Get cart items with product details
// @access  Private
router.get('/cart/items', authWithUserId, async (req, res) => {
    try {
        const items = await Order.getCartItems(req.user.id);

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1;
        const deliveryFee = 10000;
        const grandTotal = subtotal + tax + deliveryFee;

        res.json({
            success: true,
            message: 'Cart items retrieved successfully',
            cart: {
                items,
                subtotal: parseFloat(subtotal.toFixed(2)),
                tax: parseFloat(tax.toFixed(2)),
                deliveryFee: parseFloat(deliveryFee.toFixed(2)),
                grandTotal: parseFloat(grandTotal.toFixed(2)),
                items_count: items.length,
                cart_count: items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });

    } catch (error) {
        console.error('❌ Get cart items error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cart items',
            error: error.message,
            cart: { items: [], subtotal: 0, tax: 0, deliveryFee: 0, grandTotal: 0, items_count: 0, cart_count: 0 }
        });
    }
});

// @route   PUT /api/orders/cart/update/:productId
// @desc    Update cart item quantity
// @access  Private
router.put('/cart/update/:productId', authWithUserId, async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!quantity) {
            return res.status(400).json({
                success: false,
                message: 'Quantity is required'
            });
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number'
            });
        }

        console.log('✏️ Update cart quantity:', {
            userId: req.user.id,
            productId,
            quantity: qty
        });

        const result = await Order.updateCartQuantity(req.user.id, productId, qty);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.message
            });
        }

        // Get updated cart count
        const count = await Order.getCartCount(req.user.id);

        res.json({
            success: true,
            message: result.message,
            cart_count: count
        });

    } catch (error) {
        console.error('❌ Update cart quantity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart quantity',
            error: error.message
        });
    }
});

// --- ORDER HISTORY/DETAIL ROUTES ---

router.get('/', authWithUserId, async (req, res) => {
    try {
        const orders = await Order.findByUserId(req.user.id);
        res.json({
            success: true,
            message: 'User orders retrieved successfully',
            orders
        });
    } catch (error) {
        console.error('❌ Get user orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve orders', error: error.message });
    }
});

router.get('/:id', authWithUserId, async (req, res) => {
    try {
        const orderId = req.params.id;
        const orderDetails = await Order.getOrderDetails(orderId);

        if (!orderDetails) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Pastikan user hanya bisa melihat order miliknya sendiri
        if (orderDetails.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This order belongs to another user.'
            });
        }

        res.json({
            success: true,
            message: 'Order details retrieved successfully',
            order: orderDetails
        });
    } catch (error) {
        console.error('❌ Get order details error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve order details', error: error.message });
    }
});

// --- ADMIN ROUTES ---

// Middleware untuk admin saja
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

const adminAuth = [verifyToken, ensureUserId, adminOnly];

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin only)
// @access  Private (Admin)
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const orders = await Order.getAll(parseInt(limit), parseInt(offset));

        res.json({
            success: true,
            message: 'All orders retrieved successfully',
            orders,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('❌ Get all orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve all orders', error: error.message });
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const updatedOrder = await Order.updateStatus(req.params.id, status);

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({
            success: true,
            message: `Order status updated to ${updatedOrder.status}`,
            order: updatedOrder
        });
    } catch (error) {
        console.error('❌ Update status error:', error);

        if (error.message.includes('Invalid status')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
});

// @route   PUT /api/orders/:id/payment-status
// @desc    Update payment status (Admin only)
// @access  Private (Admin)
router.put('/:id/payment-status', adminAuth, async (req, res) => {
    try {
        const { payment_status } = req.body;

        if (!payment_status) {
            return res.status(400).json({
                success: false,
                message: 'Payment status is required'
            });
        }

        const updatedOrder = await Order.updatePaymentStatus(req.params.id, payment_status);

        res.json({
            success: true,
            message: `Payment status updated to ${payment_status}`,
            order: updatedOrder
        });
    } catch (error) {
        console.error('❌ Update payment status error:', error);

        if (error.message.includes('Invalid payment status')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
});

// @route   GET /api/orders/admin/recent
// @desc    Get recent orders (Admin only)
// @access  Private (Admin)
router.get('/admin/recent', adminAuth, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const orders = await Order.getRecentOrders(parseInt(limit));

        res.json({
            success: true,
            message: 'Recent orders retrieved successfully',
            orders
        });
    } catch (error) {
        console.error('❌ Get recent orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve recent orders', error: error.message });
    }
});

// @route   DELETE /api/orders/admin/:id
// @desc    Delete order (Admin only)
// @access  Private (Admin)
router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        const deleted = await Order.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order',
            error: error.message
        });
    }
});

// @route   GET /api/orders/admin/statistics
// @desc    Get order statistics (Admin only)
// @access  Private (Admin)
router.get('/admin/statistics', adminAuth, async (req, res) => {
    try {
        const stats = await Order.getStatistics();

        res.json({
            success: true,
            message: 'Statistics retrieved successfully',
            statistics: stats
        });
    } catch (error) {
        console.error('❌ Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics',
            error: error.message
        });
    }
});

// @route   GET /api/orders/admin/status/:status
// @desc    Get orders by status (Admin only)
// @access  Private (Admin)
router.get('/admin/status/:status', adminAuth, async (req, res) => {
    try {
        const { status } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const orders = await Order.findByStatus(status, parseInt(limit), parseInt(offset));

        res.json({
            success: true,
            message: `Orders with status '${status}' retrieved successfully`,
            orders,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                status: status
            }
        });
    } catch (error) {
        console.error('❌ Get orders by status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve orders by status',
            error: error.message
        });
    }
});

export default router;