const Cart = require('../models/Cart');
const Product = require('../models/Product');

// GET cart by user ID
exports.getUserCart = async (req, res) => {
    try {
        const userId = req.user.id; // dari middleware auth

        const cartItems = await Cart.find({ user_id: userId })
            .populate('product_id', 'name price image_url description');

        // Format response
        const formattedItems = cartItems.map(item => ({
            id: item.product_id._id,
            product_id: item.product_id._id,
            name: item.product_id.name,
            price: item.product_id.price,
            image: item.product_id.image_url,
            description: item.product_id.description,
            quantity: item.quantity
        }));

        res.json({
            success: true,
            items: formattedItems,
            count: formattedItems.length,
            message: 'Cart loaded successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ADD/UPDATE item in cart
exports.updateCartItem = async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const userId = req.user.id;

        // Validasi
        if (!product_id || quantity < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid data'
            });
        }

        // Cek apakah produk ada
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Cek apakah item sudah ada di cart
        let cartItem = await Cart.findOne({
            user_id: userId,
            product_id: product_id
        });

        if (cartItem) {
            if (quantity === 0) {
                // Remove item jika quantity = 0
                await Cart.deleteOne({ _id: cartItem._id });
                return res.json({
                    success: true,
                    message: 'Item removed from cart',
                    action: 'removed'
                });
            } else {
                // Update quantity
                cartItem.quantity = quantity;
                await cartItem.save();
                return res.json({
                    success: true,
                    message: 'Cart updated',
                    action: 'updated',
                    item: cartItem
                });
            }
        } else {
            // Add new item
            cartItem = new Cart({
                user_id: userId,
                product_id: product_id,
                quantity: quantity
            });
            await cartItem.save();

            return res.json({
                success: true,
                message: 'Item added to cart',
                action: 'added',
                item: cartItem
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// CLEAR cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        await Cart.deleteMany({ user_id: userId });

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// SYNC entire cart (untuk bulk update)
exports.syncCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body; // array of {product_id, quantity}

        // Hapus cart lama
        await Cart.deleteMany({ user_id: userId });

        // Tambahkan item baru
        const cartPromises = items.map(item => {
            if (item.quantity > 0) {
                return Cart.create({
                    user_id: userId,
                    product_id: item.product_id,
                    quantity: item.quantity
                });
            }
        });

        await Promise.all(cartPromises.filter(p => p));

        res.json({
            success: true,
            message: 'Cart synced successfully',
            count: items.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};