// controllers/productController.js - ES Module version
import db from '../database/connection.js';

// Get all products
export const getProducts = async (req, res) => {
    try {
        // Get query parameters
        const {
            category,
            minPrice,
            maxPrice,
            sortBy = 'created_at',
            sortOrder = 'DESC',
            limit = 50,
            offset = 0,
            inStock = true
        } = req.query;

        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE
        `;

        const params = [];

        // Apply filters
        if (category) {
            query += ' AND c.name = ?';
            params.push(category);
        }

        if (minPrice) {
            query += ' AND p.price >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ' AND p.price <= ?';
            params.push(parseFloat(maxPrice));
        }

        if (inStock === 'true') {
            query += ' AND p.stock > 0';
        }

        // Validate sort column
        const validSortColumns = ['name', 'price', 'created_at', 'updated_at', 'stock'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY p.${sortColumn} ${order}`;

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        // Execute query
        const [products] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM products p WHERE p.is_active = TRUE';
        if (category) {
            countQuery += ' AND p.category_id IN (SELECT id FROM categories WHERE name = ?)';
        }
        const [countResult] = await db.execute(countQuery, category ? [category] : []);
        const total = countResult[0]?.total || 0;

        res.json({
            success: true,
            count: products.length,
            total,
            pagination: {
                page: Math.floor(offset / limit) + 1,
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            },
            data: products
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching products'
        });
    }
};

// Get product by ID
export const getProductById = async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.is_active = TRUE
        `, [req.params.id]);

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: products[0]
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching product'
        });
    }
};

// Get all categories
export const getCategories = async (req, res) => {
    try {
        const [categories] = await db.execute(
            'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name'
        );

        // Get product count per category
        for (const category of categories) {
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as product_count FROM products WHERE category_id = ? AND is_active = TRUE',
                [category.id]
            );
            category.product_count = countResult[0]?.product_count || 0;
        }

        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching categories'
        });
    }
};

// Create product
export const createProduct = async (req, res) => {
    try {
        const { name, description, price, category_id, image_url, stock } = req.body;

        // Validation
        if (!name || !price || !category_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, price, and category'
            });
        }

        const [result] = await db.execute(
            `INSERT INTO products 
             (name, description, price, category_id, image_url, stock) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, description, parseFloat(price), category_id, image_url || null, parseInt(stock) || 0]
        );

        // Get the created product
        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: products[0]
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating product'
        });
    }
};

// Update product
export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category_id, image_url, stock, is_active } = req.body;

        // Check if product exists
        const [existing] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            params.push(parseFloat(price));
        }
        if (category_id !== undefined) {
            updates.push('category_id = ?');
            params.push(category_id);
        }
        if (image_url !== undefined) {
            updates.push('image_url = ?');
            params.push(image_url);
        }
        if (stock !== undefined) {
            updates.push('stock = ?');
            params.push(parseInt(stock));
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data provided for update'
            });
        }

        params.push(productId);

        await db.execute(
            `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        // Get updated product
        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: products[0]
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating product'
        });
    }
};

// Delete product (soft delete)
export const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // Check if product exists
        const [existing] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete (set is_active to false)
        await db.execute(
            'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [productId]
        );

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting product'
        });
    }
};

// Search products
export const searchProducts = async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, inStock = 'true' } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE 
            AND (p.name LIKE ? OR p.description LIKE ?)
        `;

        const params = [`%${q}%`, `%${q}%`];

        if (category) {
            query += ' AND c.name = ?';
            params.push(category);
        }

        if (minPrice) {
            query += ' AND p.price >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ' AND p.price <= ?';
            params.push(parseFloat(maxPrice));
        }

        if (inStock === 'true') {
            query += ' AND p.stock > 0';
        }

        query += ' ORDER BY p.created_at DESC LIMIT 50';

        const [products] = await db.execute(query, params);

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while searching products'
        });
    }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE 
            ORDER BY p.created_at DESC 
            LIMIT 8
        `);

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Get featured products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching featured products'
        });
    }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { limit = 20, offset = 0 } = req.query;

        // Check if category exists
        const [categories] = await db.execute(
            'SELECT * FROM categories WHERE id = ? AND is_active = TRUE',
            [categoryId]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const [products] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.is_active = TRUE
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [categoryId, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            category: categories[0],
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Get products by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching products by category'
        });
    }
};