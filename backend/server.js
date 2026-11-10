import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean)
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'matcha_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');

        // Cek struktur tabel orders dan order_items
        const [ordersStructure] = await connection.query('DESCRIBE orders');
        console.log('📊 Orders table structure:');
        ordersStructure.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Extra || ''}`);
        });

        const [orderItemsStructure] = await connection.query('DESCRIBE order_items');
        console.log('📊 Order_items table structure:');
        orderItemsStructure.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Extra || ''}`);
        });

        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// ======================
// MIDDLEWARE
// ======================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, user) => {
        if (err) {
            console.error('❌ Token verification error:', err.message);
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        next();
    });
};

// ======================
// HELPER FUNCTIONS
// ======================

// Helper untuk validasi product ID
const validateProductId = (productId) => {
    if (productId === undefined || productId === null) {
        return { valid: false, error: 'Product ID is required' };
    }

    let parsedId;

    // Handle berbagai format
    if (typeof productId === 'object') {
        // Coba ekstrak dari berbagai properti
        if (productId.id !== undefined) parsedId = productId.id;
        else if (productId.product_id !== undefined) parsedId = productId.product_id;
        else if (productId.productId !== undefined) parsedId = productId.productId;
        else return { valid: false, error: 'Invalid product ID object format' };
    } else {
        parsedId = productId;
    }

    // Parse ke integer
    const id = parseInt(parsedId);

    if (isNaN(id) || id <= 0) {
        return {
            valid: false,
            error: 'Product ID must be a positive number',
            received: productId,
            parsed: id
        };
    }

    return { valid: true, id: id };
};

// Helper untuk logging request
const logRequest = (req, endpoint) => {
    console.log(`📥 ${endpoint} Request:`);
    console.log('  Headers:', req.headers);
    console.log('  Body:', JSON.stringify(req.body, null, 2));
    console.log('  Query:', req.query);
    console.log('  Params:', req.params);
    console.log('  User:', req.user);
};

// Helper untuk generate kode unik
const generateUniqueCode = (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}${timestamp}${random}`.toUpperCase();
};

// ======================
// DEBUGGING ENDPOINTS
// ======================

// Debugging: Cek data produk
app.get('/api/debug/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(`🔍 Debugging product ID: ${productId}`);

        const [product] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        res.json({
            success: true,
            product: product[0] || null,
            tableInfo: {
                exists: product.length > 0,
                count: product.length
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debugging: Cek semua produk
app.get('/api/debug/products', async (req, res) => {
    try {
        console.log('🔍 Debugging all products');

        const [products] = await pool.query('SELECT * FROM products ORDER BY id');
        const [activeProducts] = await pool.query('SELECT * FROM products WHERE is_active = 1 ORDER BY id');

        res.json({
            success: true,
            allProducts: products,
            activeProducts: activeProducts,
            counts: {
                total: products.length,
                active: activeProducts.length,
                inactive: products.length - activeProducts.length
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debugging: Cek struktur tabel
app.get('/api/debug/tables', async (req, res) => {
    try {
        console.log('🔍 Debugging table structures');

        const tables = ['products', 'categories', 'carts', 'favorites', 'users', 'orders', 'order_items'];
        const results = {};

        for (const table of tables) {
            try {
                const [structure] = await pool.query(`DESCRIBE ${table}`);
                const [count] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                results[table] = {
                    structure: structure,
                    rowCount: count[0].count
                };
            } catch (err) {
                results[table] = { error: err.message };
            }
        }

        res.json({
            success: true,
            tables: results
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debugging: Test add to cart dengan data spesifik
app.post('/api/debug/cart/test', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;

        console.log(`🔍 Debug add to cart test - User: ${userId}, Product: ${productId}, Qty: ${quantity}`);

        // Cek product di database
        const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);

        if (product.length === 0) {
            return res.json({
                success: false,
                error: 'Product not found',
                availableProducts: await getAvailableProductIds()
            });
        }

        // Cek apakah sudah ada di cart
        const [existingCart] = await pool.query(
            'SELECT * FROM carts WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        res.json({
            success: true,
            debugInfo: {
                product: product[0],
                productExists: product.length > 0,
                productIsActive: product[0]?.is_active === 1,
                inCart: existingCart.length > 0,
                cartQuantity: existingCart[0]?.quantity || 0,
                stockAvailable: product[0]?.stock || 0
            }
        });

    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper: Get available product IDs
const getAvailableProductIds = async () => {
    try {
        const [products] = await pool.query('SELECT id, name FROM products WHERE is_active = 1 ORDER BY id');
        return products;
    } catch (error) {
        return [];
    }
};

// Debugging: Simulasikan add to cart
app.post('/api/debug/cart/simulate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;

        console.log(`🔍 Simulating add to cart - User: ${userId}, Product: ${productId}`);

        // Langkah 1: Cek produk
        const [product] = await pool.query(
            'SELECT id, name, price, stock, is_active FROM products WHERE id = ?',
            [productId]
        );

        if (product.length === 0) {
            return res.json({
                success: false,
                error: 'Product not found in database',
                step: 'product_check'
            });
        }

        if (product[0].is_active !== 1) {
            return res.json({
                success: false,
                error: 'Product is not active',
                step: 'product_active_check'
            });
        }

        if (product[0].stock < quantity) {
            return res.json({
                success: false,
                error: 'Insufficient stock',
                stock: product[0].stock,
                requested: quantity,
                step: 'stock_check'
            });
        }

        // Langkah 2: Cek cart
        const [cartItem] = await pool.query(
            'SELECT id, quantity FROM carts WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        // Langkah 3: Simulasikan operasi
        const operation = cartItem.length > 0 ? 'update' : 'insert';
        const newQuantity = cartItem.length > 0 ? cartItem[0].quantity + quantity : quantity;

        // Cek total quantity vs stock
        if (newQuantity > product[0].stock) {
            return res.json({
                success: false,
                error: 'Total quantity exceeds stock',
                currentInCart: cartItem[0]?.quantity || 0,
                adding: quantity,
                total: newQuantity,
                stock: product[0].stock,
                step: 'total_quantity_check'
            });
        }

        res.json({
            success: true,
            simulation: {
                product: product[0],
                cartExists: cartItem.length > 0,
                operation: operation,
                currentQuantity: cartItem[0]?.quantity || 0,
                newQuantity: newQuantity,
                subtotal: product[0].price * newQuantity,
                stockCheck: 'PASS',
                activeCheck: 'PASS',
                quantityCheck: 'PASS'
            }
        });

    } catch (error) {
        console.error('Debug simulation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================
// HEALTH & TEST ROUTES
// ======================

app.get('/', (req, res) => {
    res.json({
        message: 'Matcha App API',
        version: '1.0.0',
        status: 'running',
        database: 'matcha_app'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Matcha App API'
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const isConnected = await testConnection();
        if (isConnected) {
            res.json({
                success: true,
                message: 'Database connection OK'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database test failed',
            message: error.message
        });
    }
});

// ======================
// AUTH ROUTES
// ======================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log('📝 Register attempt:', email);

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Check if user exists
        const [existingUser] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // Generate token
        const token = jwt.sign(
            { id: result.insertId, email, name },
            process.env.JWT_SECRET || 'your_jwt_secret_key',
            { expiresIn: '7d' }
        );

        // Get created user
        const [user] = await pool.query(
            'SELECT id, name, email, phone, address, profile_image, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        console.log('✅ Registration successful:', email);

        res.json({
            success: true,
            message: 'Registration successful',
            token,
            user: user[0]
        });

    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: error.message
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt:', email);

        // Find user
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key',
            { expiresIn: '7d' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        console.log('✅ Login successful:', email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: error.message
        });
    }
});

// Get Profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, phone, address, profile_image, role, created_at, updated_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
});

// ======================
// PRODUCTS ROUTES
// ======================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        console.log('📦 Fetching all products');
        const [products] = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_active = 1 
            ORDER BY p.created_at DESC
        `);

        res.json({
            success: true,
            data: products,
            count: products.length
        });
    } catch (error) {
        console.error('❌ Get products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch products',
            message: error.message
        });
    }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const [products] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ? AND p.is_active = 1`,
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: products[0]
        });
    } catch (error) {
        console.error('❌ Get product error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product',
            message: error.message
        });
    }
});

// INSERT: Create new product (Admin only)
app.post('/api/products', authenticateAdmin, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        logRequest(req, 'CREATE PRODUCT');
        const {
            name,
            description,
            price,
            category_id,
            stock,
            image_url,
            is_active = 1
        } = req.body;

        // Validasi input
        if (!name || !price || !category_id) {
            return res.status(400).json({
                success: false,
                error: 'Name, price, and category are required'
            });
        }

        await connection.beginTransaction();

        try {
            // Insert produk baru
            const [result] = await connection.query(
                `INSERT INTO products (
                    name, 
                    description, 
                    price, 
                    category_id, 
                    stock, 
                    image_url, 
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    name,
                    description || '',
                    parseFloat(price) || 0,
                    parseInt(category_id),
                    parseInt(stock) || 0,
                    image_url || '',
                    is_active ? 1 : 0
                ]
            );

            const productId = result.insertId;

            // Dapatkan data produk yang baru dibuat
            const [products] = await connection.query(
                `SELECT p.*, c.name as category_name 
                 FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.id 
                 WHERE p.id = ?`,
                [productId]
            );

            await connection.commit();

            console.log(`✅ Product created: ${name} (ID: ${productId})`);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                product: products[0]
            });

        } catch (transactionError) {
            await connection.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('❌ Create product error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create product',
            message: error.message
        });
    } finally {
        connection.release();
    }
});

// ======================
// CATEGORIES ROUTES
// ======================

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        console.log('📋 Fetching all categories');
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');

        res.json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        console.error('❌ Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});

// INSERT: Create new category (Admin only)
app.post('/api/categories', authenticateAdmin, async (req, res) => {
    try {
        logRequest(req, 'CREATE CATEGORY');
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        // Cek apakah kategori sudah ada
        const [existingCategories] = await pool.query(
            'SELECT id FROM categories WHERE name = ?',
            [name]
        );

        if (existingCategories.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Category already exists'
            });
        }

        // Insert kategori baru
        const [result] = await pool.query(
            'INSERT INTO categories (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
            [name, description || '']
        );

        const categoryId = result.insertId;

        // Dapatkan data kategori yang baru dibuat
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        console.log(`✅ Category created: ${name} (ID: ${categoryId})`);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: categories[0]
        });

    } catch (error) {
        console.error('❌ Create category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create category',
            message: error.message
        });
    }
});

// ======================
// CART ROUTES
// ======================

// Get user cart
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🛒 Fetching cart for user: ${userId}`);

        const [cartItems] = await pool.query(`
            SELECT 
                c.id as cart_id,
                c.user_id,
                c.product_id,
                c.quantity,
                c.created_at,
                c.updated_at,
                p.name as product_name,
                p.description,
                p.price,
                p.image_url,
                p.stock,
                p.is_active,
                (c.quantity * p.price) as subtotal,
                cat.name as category_name
            FROM carts c
            LEFT JOIN products p ON c.product_id = p.id
            LEFT JOIN categories cat ON p.category_id = cat.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        console.log(`✅ Found ${cartItems.length} items in cart`);

        // Filter hanya produk aktif
        const activeCartItems = cartItems.filter(item => item.is_active === 1);

        // Hitung total
        const total = activeCartItems.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * parseInt(item.quantity));
        }, 0);

        const totalQuantity = activeCartItems.reduce((sum, item) => sum + parseInt(item.quantity), 0);

        res.json({
            success: true,
            data: {
                items: activeCartItems,
                summary: {
                    totalItems: activeCartItems.length,
                    totalQuantity: totalQuantity,
                    totalAmount: total,
                    estimatedShipping: 10000,
                    grandTotal: total + 10000
                }
            },
            count: activeCartItems.length
        });
    } catch (error) {
        console.error('❌ Get cart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cart',
            message: error.message
        });
    }
});

// Get cart count (total items)
app.get('/api/cart/count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [result] = await pool.query(
            'SELECT COUNT(*) as count, SUM(quantity) as total_quantity FROM carts WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            data: {
                itemCount: result[0].count || 0,
                totalQuantity: result[0].total_quantity || 0
            }
        });
    } catch (error) {
        console.error('❌ Get cart count error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get cart count',
            message: error.message
        });
    }
});

// Add item to cart - FIXED VERSION (INSERT ke cart)
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const userId = req.user.id;
        let { productId, quantity = 1 } = req.body;

        console.log(`🛒 Adding to cart - User: ${userId}`);
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

        // ============================================
        // 1. VALIDASI INPUT
        // ============================================

        // Cek apakah ada body request
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Request body is required'
            });
        }

        // Debug: Log semua field dalam request body
        console.log('Available fields in body:', Object.keys(req.body));

        // Cek berbagai format untuk productId
        if (productId === undefined || productId === null) {
            // Cek format alternatif
            if (req.body.product_id !== undefined) {
                productId = req.body.product_id;
                console.log('Using product_id from request body');
            } else if (req.body.id !== undefined) {
                productId = req.body.id;
                console.log('Using id from request body');
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Product ID is required. Please provide productId, product_id, or id',
                    receivedFields: Object.keys(req.body)
                });
            }
        }

        // ============================================
        // 2. VALIDASI PRODUCT ID MENGGUNAKAN HELPER
        // ============================================

        const validationResult = validateProductId(productId);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                error: validationResult.error
            });
        }

        const parsedProductId = validationResult.id;
        const parsedQuantity = parseInt(quantity) || 1;

        if (parsedQuantity < 1) {
            return res.status(400).json({
                success: false,
                error: 'Quantity must be at least 1',
                received: quantity
            });
        }

        // ============================================
        // 3. TRANSAKSI DATABASE
        // ============================================

        await connection.beginTransaction();

        try {
            // 3.1 Cek produk ada dan aktif
            console.log(`🔍 Checking product with ID: ${parsedProductId}`);
            const [products] = await connection.query(
                `SELECT 
                    id, 
                    name, 
                    price, 
                    stock, 
                    is_active,
                    image_url
                FROM products 
                WHERE id = ?`,
                [parsedProductId]
            );

            if (products.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    error: `Product with ID ${parsedProductId} not found`
                });
            }

            const product = products[0];

            if (product.is_active !== 1) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Product is not active',
                    productName: product.name
                });
            }

            console.log(`✅ Product found: ${product.name} (Stock: ${product.stock})`);

            // 3.2 Cek stok tersedia
            if (product.stock < parsedQuantity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient stock',
                    productName: product.name,
                    availableStock: product.stock,
                    requestedQuantity: parsedQuantity
                });
            }

            // 3.3 Cek apakah produk sudah ada di cart
            const [existingCartItems] = await connection.query(
                `SELECT 
                    id, 
                    quantity 
                FROM carts 
                WHERE user_id = ? AND product_id = ?`,
                [userId, parsedProductId]
            );

            let newQuantity = parsedQuantity;
            let operation = 'added';

            if (existingCartItems.length > 0) {
                // Update quantity
                const existingItem = existingCartItems[0];
                const totalQuantity = existingItem.quantity + parsedQuantity;

                // Cek total quantity tidak melebihi stok
                if (totalQuantity > product.stock) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        error: 'Total quantity exceeds available stock',
                        productName: product.name,
                        currentInCart: existingItem.quantity,
                        adding: parsedQuantity,
                        availableStock: product.stock,
                        maxCanAdd: product.stock - existingItem.quantity
                    });
                }

                await connection.query(
                    `UPDATE carts 
                    SET quantity = ?, updated_at = NOW() 
                    WHERE id = ?`,
                    [totalQuantity, existingItem.id]
                );

                newQuantity = totalQuantity;
                operation = 'updated';
                console.log(`🔄 Updated cart item. New quantity: ${newQuantity}`);
            } else {
                // INSERT new item ke cart
                await connection.query(
                    `INSERT INTO carts (user_id, product_id, quantity, created_at, updated_at) 
                    VALUES (?, ?, ?, NOW(), NOW())`,
                    [userId, parsedProductId, parsedQuantity]
                );
                console.log(`➕ Added new item to cart. Quantity: ${parsedQuantity}`);
            }

            // 3.4 Commit transaction
            await connection.commit();
            console.log('✅ Transaction committed successfully');

            // ============================================
            // 4. RESPONSE
            // ============================================

            // Get updated cart for response
            const [updatedCart] = await connection.query(`
                SELECT 
                    c.id as cart_id,
                    c.user_id,
                    c.product_id,
                    c.quantity,
                    c.created_at,
                    c.updated_at,
                    p.name as product_name,
                    p.description,
                    p.price,
                    p.image_url,
                    p.stock,
                    (c.quantity * p.price) as subtotal
                FROM carts c
                LEFT JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC
            `, [userId]);

            // Hitung total cart
            const cartTotal = updatedCart.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * parseInt(item.quantity));
            }, 0);

            const itemTotal = updatedCart.reduce((sum, item) => sum + parseInt(item.quantity), 0);

            console.log(`📊 Cart updated: ${itemTotal} items, Total: Rp${cartTotal.toLocaleString()}`);

            res.json({
                success: true,
                message: `Product ${operation} to cart successfully`,
                data: {
                    product: {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image_url: product.image_url
                    },
                    cartItem: {
                        product_id: parsedProductId,
                        quantity: newQuantity,
                        subtotal: product.price * newQuantity
                    },
                    cartSummary: {
                        totalItems: updatedCart.length,
                        totalQuantity: itemTotal,
                        totalAmount: cartTotal,
                        items: updatedCart
                    }
                }
            });

        } catch (transactionError) {
            await connection.rollback();
            console.error('❌ Transaction error:', transactionError);
            throw transactionError;
        }

    } catch (error) {
        console.error('❌ Add to cart error:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        if (error.code) {
            console.error('Database error code:', error.code);
            console.error('Database error number:', error.errno);
            console.error('SQL State:', error.sqlState);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to add item to cart',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && {
                details: {
                    code: error.code,
                    sqlMessage: error.sqlMessage,
                    stack: error.stack
                }
            })
        });
    } finally {
        connection.release();
    }
});

// Update cart item quantity
app.put('/api/cart/update/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const userId = req.user.id;
        const cartItemId = req.params.id;
        const { quantity } = req.body;

        console.log(`🔄 Updating cart item - ID: ${cartItemId}, User: ${userId}, New Qty: ${quantity}`);

        if (!quantity && quantity !== 0) {
            return res.status(400).json({
                success: false,
                error: 'Quantity is required'
            });
        }

        const parsedQuantity = parseInt(quantity);
        if (isNaN(parsedQuantity)) {
            return res.status(400).json({
                success: false,
                error: 'Quantity must be a number'
            });
        }

        if (parsedQuantity < 0) {
            return res.status(400).json({
                success: false,
                error: 'Quantity cannot be negative'
            });
        }

        await connection.beginTransaction();

        try {
            // Jika quantity adalah 0, hapus item
            if (parsedQuantity === 0) {
                const [deleteResult] = await connection.query(
                    'DELETE FROM carts WHERE id = ? AND user_id = ?',
                    [cartItemId, userId]
                );

                if (deleteResult.affectedRows === 0) {
                    await connection.rollback();
                    return res.status(404).json({
                        success: false,
                        error: 'Cart item not found'
                    });
                }

                await connection.commit();
                return res.json({
                    success: true,
                    message: 'Item removed from cart'
                });
            }

            // Cek apakah item ada dan dapatkan product info
            const [cartItem] = await connection.query(`
                SELECT c.*, p.stock 
                FROM carts c
                JOIN products p ON c.product_id = p.id
                WHERE c.id = ? AND c.user_id = ?
            `, [cartItemId, userId]);

            if (cartItem.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Cart item not found'
                });
            }

            // Cek stok tersedia
            if (parsedQuantity > cartItem[0].stock) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient stock',
                    availableStock: cartItem[0].stock,
                    requestedQuantity: parsedQuantity
                });
            }

            // Update quantity
            const [updateResult] = await connection.query(
                'UPDATE carts SET quantity = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
                [parsedQuantity, cartItemId, userId]
            );

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Cart item not found'
                });
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Cart item updated successfully',
                data: {
                    cartItemId,
                    quantity: parsedQuantity
                }
            });

        } catch (transactionError) {
            await connection.rollback();
            throw transactionError;
        }

    } catch (error) {
        console.error('❌ Update cart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update cart',
            message: error.message
        });
    } finally {
        connection.release();
    }
});

// Remove item from cart
app.delete('/api/cart/remove/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = req.params.id;

        console.log(`🗑️ Removing from cart - ID: ${itemId}, User: ${userId}`);

        const [result] = await pool.query(
            'DELETE FROM carts WHERE id = ? AND user_id = ?',
            [itemId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cart item not found'
            });
        }

        res.json({
            success: true,
            message: 'Item removed from cart'
        });

    } catch (error) {
        console.error('❌ Remove from cart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove item from cart',
            message: error.message
        });
    }
});

// Clear cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🧹 Clearing cart for user: ${userId}`);

        const [result] = await pool.query(
            'DELETE FROM carts WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Cart cleared',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error('❌ Clear cart error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cart',
            message: error.message
        });
    }
});

// ======================
// ORDERS ROUTES - IMPROVED FOR PAYMENT METHOD
// ======================

// Create new order (compatible with PaymentMethod.jsx) - INSERT endpoint untuk order
app.post('/api/orders/new', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        console.log('📦 Creating new order from PaymentMethod.jsx');
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

        const {
            orderNumber,
            customer,
            items,
            totals,
            payment,
            status = 'pending',
            notes = ''
        } = req.body;

        const userId = req.user.id;

        // Validasi data order
        if (!orderNumber) {
            return res.status(400).json({
                success: false,
                error: 'orderNumber is required'
            });
        }

        if (!customer || !customer.name) {
            return res.status(400).json({
                success: false,
                error: 'Customer name is required'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Order items are required'
            });
        }

        if (!totals || !totals.grandTotal) {
            return res.status(400).json({
                success: false,
                error: 'Order totals are required'
            });
        }

        // Validasi dan parse data
        const parsedItems = items.map(item => ({
            product_id: parseInt(item.id) || 0,
            name: item.name || 'Produk',
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 1,
            total: parseFloat(item.total) || 0
        }));

        // Start transaction
        await connection.beginTransaction();

        try {
            // 1. INSERT order utama
            const [orderResult] = await connection.query(
                `INSERT INTO orders (
                    order_number,
                    user_id,
                    total_amount,
                    shipping_fee,
                    final_amount,
                    status,
                    payment_method,
                    payment_status,
                    shipping_address,
                    notes,
                    customer_name,
                    customer_phone,
                    customer_email,
                    table_number,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    orderNumber,
                    userId,
                    totals.subtotal || 0,
                    totals.serviceFee || 0,
                    totals.grandTotal || 0,
                    status,
                    payment?.method || 'cash',
                    payment?.status || 'pending',
                    'Makan di tempat', // Default untuk restaurant
                    notes,
                    customer.name,
                    customer.phone || '',
                    customer.email || '',
                    customer.tableNumber || '1'
                ]
            );

            const orderId = orderResult.insertId;
            console.log(`✅ Main order created with ID: ${orderId}, Number: ${orderNumber}`);

            // 2. INSERT order items
            for (const item of parsedItems) {
                if (item.product_id > 0) {
                    // Cek stok jika ada product_id
                    const [product] = await connection.query(
                        'SELECT stock FROM products WHERE id = ?',
                        [item.product_id]
                    );

                    if (product.length > 0 && product[0].stock < item.quantity) {
                        console.warn(`⚠️ Insufficient stock for product ${item.product_id}`);
                    }

                    // Update stok jika ada product_id
                    if (item.product_id > 0 && product.length > 0) {
                        await connection.query(
                            'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?',
                            [item.quantity, item.product_id]
                        );
                    }
                }

                // INSERT order item
                await connection.query(
                    `INSERT INTO order_items (
                        order_id,
                        product_id,
                        product_name,
                        quantity,
                        price,
                        subtotal,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        orderId,
                        item.product_id > 0 ? item.product_id : null,
                        item.name,
                        item.quantity,
                        item.price,
                        item.total
                    ]
                );
            }

            // 3. Update payment status jika sudah dibayar
            if (payment?.status === 'paid') {
                await connection.query(
                    `UPDATE orders 
                    SET payment_status = 'paid', 
                        status = 'processing',
                        updated_at = NOW()
                    WHERE id = ?`,
                    [orderId]
                );
            }

            // 4. Clear user cart jika pembayaran berhasil
            if (payment?.status === 'paid') {
                await connection.query(
                    'DELETE FROM carts WHERE user_id = ?',
                    [userId]
                );
                console.log(`🧹 Cleared cart for user ${userId}`);
            }

            // Commit transaction
            await connection.commit();
            console.log(`✅ Transaction committed for order ${orderNumber}`);

            // 5. Get complete order data for response
            const [orderData] = await connection.query(`
                SELECT 
                    o.*,
                    oi.id as item_id,
                    oi.product_id,
                    oi.product_name,
                    oi.quantity,
                    oi.price,
                    oi.subtotal
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.id = ?
            `, [orderId]);

            // Format response
            const formattedOrder = {
                id: orderData[0].id,
                order_number: orderData[0].order_number,
                user_id: orderData[0].user_id,
                total_amount: parseFloat(orderData[0].total_amount),
                shipping_fee: parseFloat(orderData[0].shipping_fee),
                final_amount: parseFloat(orderData[0].final_amount),
                payment_method: orderData[0].payment_method,
                payment_status: orderData[0].payment_status,
                shipping_address: orderData[0].shipping_address,
                customer_name: orderData[0].customer_name,
                customer_phone: orderData[0].customer_phone,
                customer_email: orderData[0].customer_email,
                table_number: orderData[0].table_number,
                notes: orderData[0].notes,
                status: orderData[0].status,
                created_at: orderData[0].created_at,
                items: orderData.map(item => ({
                    item_id: item.item_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    subtotal: parseFloat(item.subtotal)
                }))
            };

            console.log('🎉 Order created successfully:', orderNumber);

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                order: formattedOrder,
                orderNumber: orderNumber,
                paymentStatus: payment?.status || 'pending'
            });

        } catch (transactionError) {
            await connection.rollback();
            console.error('❌ Transaction error:', transactionError);
            throw transactionError;
        }

    } catch (error) {
        console.error('❌ Create order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            message: error.message,
            details: error.sqlMessage || 'Unknown database error'
        });
    } finally {
        connection.release();
    }
});

// INSERT: Create order (original version - keep for compatibility)
app.post('/api/orders', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            items,
            total_amount,
            shipping_fee = 10000,
            final_amount,
            payment_method = 'cash',
            shipping_address,
            notes = ''
        } = req.body;

        const userId = req.user.id;

        console.log(`📦 Creating order for user: ${userId}`);

        // Validasi total_amount
        if (!total_amount || total_amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Total amount must be greater than 0'
            });
        }

        // Validasi items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Order items are required'
            });
        }

        // Validasi setiap item
        const validatedItems = [];
        for (const item of items) {
            if (!item.product_id) {
                return res.status(400).json({
                    success: false,
                    error: 'product_id is required for all items',
                    invalidItem: item
                });
            }

            const productId = parseInt(item.product_id);
            if (isNaN(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'product_id must be a valid positive number',
                    invalidItem: item
                });
            }

            const quantity = parseInt(item.quantity) || 1;
            if (isNaN(quantity) || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    error: 'quantity must be a positive number',
                    invalidItem: item
                });
            }

            const [product] = await pool.query(
                'SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1',
                [productId]
            );

            if (product.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: `Product with id ${productId} not found or inactive`,
                    invalidItem: item
                });
            }

            // Cek stok tersedia
            if (product[0].stock < quantity) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient stock for product ${product[0].name}`,
                    availableStock: product[0].stock,
                    requestedQuantity: quantity
                });
            }

            validatedItems.push({
                product_id: productId,
                quantity: quantity,
                price: parseFloat(item.price) || product[0].price,
                product_name: product[0].name
            });
        }

        // Start transaction
        await connection.beginTransaction();

        try {
            // Generate order number
            const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            // 1. INSERT order
            const [orderResult] = await connection.query(
                `INSERT INTO orders (
                    order_number, 
                    user_id, 
                    total_amount, 
                    shipping_fee, 
                    final_amount, 
                    status,
                    payment_method,
                    payment_status,
                    shipping_address,
                    notes
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 'pending', ?, ?)`,
                [
                    orderNumber,
                    userId,
                    total_amount || validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    shipping_fee,
                    final_amount || ((total_amount || validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)) + shipping_fee),
                    payment_method,
                    shipping_address || 'Makan di tempat',
                    notes
                ]
            );

            const orderId = orderResult.insertId;
            console.log(`✅ Order created with ID: ${orderId}`);

            // 2. INSERT order items dan update stok
            for (const item of validatedItems) {
                console.log(`📝 Inserting order item:`, item);

                await connection.query(
                    `INSERT INTO order_items (
                        order_id,
                        product_id,
                        quantity,
                        price,
                        subtotal
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [
                        orderId,
                        item.product_id,
                        item.quantity,
                        item.price,
                        item.price * item.quantity
                    ]
                );

                // Update stok produk
                await connection.query(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );

                console.log(`✅ Inserted order item for product ${item.product_id}`);
            }

            // 3. Clear user cart
            await connection.query('DELETE FROM carts WHERE user_id = ?', [userId]);
            console.log(`🧹 Cleared cart for user ${userId}`);

            // Commit transaction
            await connection.commit();

            // Get created order with items
            const [orderData] = await connection.query(`
                SELECT 
                    o.*,
                    oi.id as item_id,
                    oi.product_id,
                    oi.quantity,
                    oi.price,
                    oi.subtotal,
                    p.name as product_name,
                    p.image_url as product_image
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE o.id = ?
            `, [orderId]);

            if (orderData.length === 0) {
                throw new Error('Order not found after creation');
            }

            // Format response
            const formattedOrder = {
                id: orderData[0].id,
                order_number: orderData[0].order_number,
                user_id: orderData[0].user_id,
                total_amount: parseFloat(orderData[0].total_amount),
                shipping_fee: parseFloat(orderData[0].shipping_fee),
                final_amount: parseFloat(orderData[0].final_amount),
                payment_method: orderData[0].payment_method,
                payment_status: orderData[0].payment_status,
                shipping_address: orderData[0].shipping_address,
                notes: orderData[0].notes,
                status: orderData[0].status,
                created_at: orderData[0].created_at,
                items: orderData.map(item => ({
                    item_id: item.item_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_image: item.product_image,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    subtotal: parseFloat(item.subtotal)
                }))
            };

            console.log('✅ Order created successfully:', orderNumber);

            res.json({
                success: true,
                message: 'Order created successfully',
                order: formattedOrder,
                order_number: orderNumber
            });

        } catch (transactionError) {
            await connection.rollback();
            console.error('❌ Transaction error:', transactionError);
            throw transactionError;
        }

    } catch (error) {
        console.error('❌ Create order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            message: error.message,
            details: error.sqlMessage || 'Check item data structure'
        });
    } finally {
        connection.release();
    }
});

// Get order by order number
app.get('/api/orders/number/:orderNumber', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderNumber = req.params.orderNumber;

        console.log(`🔍 Fetching order: ${orderNumber} for user: ${userId}`);

        const [orderData] = await pool.query(`
            SELECT 
                o.*,
                oi.id as item_id,
                oi.product_id,
                oi.product_name,
                oi.quantity,
                oi.price,
                oi.subtotal
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.order_number = ? AND o.user_id = ?
        `, [orderNumber, userId]);

        if (orderData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Format response
        const formattedOrder = {
            id: orderData[0].id,
            order_number: orderData[0].order_number,
            user_id: orderData[0].user_id,
            total_amount: parseFloat(orderData[0].total_amount),
            shipping_fee: parseFloat(orderData[0].shipping_fee),
            final_amount: parseFloat(orderData[0].final_amount),
            payment_method: orderData[0].payment_method,
            payment_status: orderData[0].payment_status,
            shipping_address: orderData[0].shipping_address,
            customer_name: orderData[0].customer_name,
            customer_phone: orderData[0].customer_phone,
            customer_email: orderData[0].customer_email,
            table_number: orderData[0].table_number,
            notes: orderData[0].notes,
            status: orderData[0].status,
            created_at: orderData[0].created_at,
            items: orderData.map(item => ({
                item_id: item.item_id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                price: parseFloat(item.price),
                subtotal: parseFloat(item.subtotal)
            }))
        };

        res.json({
            success: true,
            order: formattedOrder
        });

    } catch (error) {
        console.error('❌ Get order by number error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order',
            message: error.message
        });
    }
});

// Get user orders with pagination
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        console.log(`📦 Fetching orders for user: ${userId}, Page: ${page}, Limit: ${limit}`);

        // Get total count
        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
            [userId]
        );

        const [orders] = await pool.query(`
            SELECT 
                o.*,
                COUNT(oi.id) as items_count,
                SUM(oi.subtotal) as order_total
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        console.log(`✅ Found ${orders.length} orders`);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('❌ Get orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders',
            message: error.message
        });
    }
});

// Get order details by ID
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.id;

        console.log(`📦 Fetching order details: ${orderId} for user: ${userId}`);

        const [orderData] = await pool.query(`
            SELECT 
                o.*,
                oi.id as item_id,
                oi.product_id,
                oi.quantity,
                oi.price,
                oi.subtotal,
                p.name as product_name,
                p.image_url as product_image,
                p.description as product_description
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = ? AND o.user_id = ?
        `, [orderId, userId]);

        if (orderData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Format response
        const formattedOrder = {
            id: orderData[0].id,
            order_number: orderData[0].order_number,
            user_id: orderData[0].user_id,
            total_amount: parseFloat(orderData[0].total_amount),
            shipping_fee: parseFloat(orderData[0].shipping_fee),
            final_amount: parseFloat(orderData[0].final_amount),
            payment_method: orderData[0].payment_method,
            payment_status: orderData[0].payment_status,
            shipping_address: orderData[0].shipping_address,
            notes: orderData[0].notes,
            status: orderData[0].status,
            created_at: orderData[0].created_at,
            items: orderData.map(item => ({
                item_id: item.item_id,
                product_id: item.product_id,
                product_name: item.product_name,
                product_image: item.product_image,
                product_description: item.product_description,
                quantity: item.quantity,
                price: parseFloat(item.price),
                subtotal: parseFloat(item.subtotal)
            }))
        };

        res.json({
            success: true,
            data: formattedOrder
        });

    } catch (error) {
        console.error('❌ Get order details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details',
            message: error.message
        });
    }
});

// ======================
// FAVORITES ROUTES - IMPROVED
// ======================

// Get user favorites (simplified - use user from token)
app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`❤️ Fetching favorites for user: ${userId}`);

        const [favorites] = await pool.query(`
            SELECT 
                p.*,
                c.name as category_name,
                f.created_at as favorited_at
            FROM favorites f
            JOIN products p ON f.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE f.user_id = ? AND p.is_active = 1
            ORDER BY f.created_at DESC
        `, [userId]);

        console.log(`✅ Found ${favorites.length} favorites`);

        res.json({
            success: true,
            data: favorites,
            count: favorites.length
        });

    } catch (error) {
        console.error('❌ Get favorites error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get favorites',
            message: error.message
        });
    }
});

// INSERT: Add to favorites
app.post('/api/favorites/add', authenticateToken, async (req, res) => {
    try {
        const { product_id } = req.body;
        const user_id = req.user.id;

        console.log(`❤️ Adding to favorites - User: ${user_id}, Product: ${product_id}`);

        if (!product_id) {
            return res.status(400).json({
                success: false,
                error: 'product_id is required'
            });
        }

        // Validasi product ID
        const validationResult = validateProductId(product_id);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                error: validationResult.error
            });
        }

        const parsedProductId = validationResult.id;

        // Cek dulu apakah product ada
        const [productCheck] = await pool.query(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [parsedProductId]
        );

        if (productCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Cek apakah sudah ada di favorites
        const [existing] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [user_id, parsedProductId]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Product already in favorites'
            });
        }

        // INSERT ke favorites
        await pool.query(
            'INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, NOW())',
            [user_id, parsedProductId]
        );

        console.log('✅ Product added to favorites');

        res.json({
            success: true,
            message: 'Product added to favorites'
        });

    } catch (error) {
        console.error('❌ Add favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add favorite',
            message: error.message
        });
    }
});

// Remove from favorites
app.delete('/api/favorites/remove/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const user_id = req.user.id;

        console.log(`💔 Removing from favorites - User: ${user_id}, Product: ${productId}`);

        // Validasi product ID
        const validationResult = validateProductId(productId);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                error: validationResult.error
            });
        }

        const parsedProductId = validationResult.id;

        const [result] = await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
            [user_id, parsedProductId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Favorite not found'
            });
        }

        console.log('✅ Product removed from favorites');

        res.json({
            success: true,
            message: 'Product removed from favorites'
        });

    } catch (error) {
        console.error('❌ Remove favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove favorite',
            message: error.message
        });
    }
});

// Check if product is in favorites
app.get('/api/favorites/check/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const user_id = req.user.id;

        console.log(`🔍 Checking favorite status - User: ${user_id}, Product: ${productId}`);

        // Validasi product ID
        const validationResult = validateProductId(productId);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                error: validationResult.error
            });
        }

        const parsedProductId = validationResult.id;

        const [result] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [user_id, parsedProductId]
        );

        const isFavorite = result.length > 0;

        console.log(`✅ Favorite status: ${isFavorite}`);

        res.json({
            success: true,
            isFavorite
        });

    } catch (error) {
        console.error('❌ Check favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check favorite status',
            message: error.message
        });
    }
});

// ======================
// CHECKOUT HELPER ROUTE
// ======================

// Get checkout summary from cart with stock validation
app.get('/api/checkout/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`🛍️ Preparing checkout summary for user: ${userId}`);

        // Get cart items dengan stok
        const [cartItems] = await pool.query(`
            SELECT 
                c.id,
                c.product_id,
                c.quantity,
                p.name as product_name,
                p.price,
                p.image_url,
                p.stock,
                (c.quantity * p.price) as subtotal
            FROM carts c
            LEFT JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ? AND p.is_active = 1
            ORDER BY c.created_at DESC
        `, [userId]);

        if (cartItems.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cart is empty'
            });
        }

        // Cek stok untuk setiap item
        const outOfStockItems = cartItems.filter(item => item.quantity > item.stock);
        if (outOfStockItems.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Some items exceed available stock',
                outOfStockItems: outOfStockItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    requested: item.quantity,
                    available: item.stock
                }))
            });
        }

        const totalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        const shippingFee = 10000;
        const finalAmount = totalAmount + shippingFee;

        // Mendapatkan alamat pengguna
        const [userAddress] = await pool.query(
            'SELECT address, phone, name FROM users WHERE id = ?',
            [userId]
        );

        const user = userAddress[0] || {};

        res.json({
            success: true,
            summary: {
                total_items: cartItems.length,
                total_amount: parseFloat(totalAmount).toFixed(2),
                shipping_fee: shippingFee.toFixed(2),
                final_amount: parseFloat(finalAmount).toFixed(2),
                items: cartItems,
                customer: {
                    name: user.name,
                    phone: user.phone,
                    address: user.address
                },
                stock_valid: true
            }
        });

    } catch (error) {
        console.error('❌ Get checkout summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch checkout summary',
            message: error.message
        });
    }
});

// ======================
// USERS ROUTES (Admin only)
// ======================

// INSERT: Create new user (Admin only)
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        logRequest(req, 'CREATE USER');
        const { name, email, password, phone, address, role = 'customer' } = req.body;

        // Validasi input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        // Cek apakah email sudah terdaftar
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // INSERT user baru
        const [result] = await pool.query(
            `INSERT INTO users (
                name, 
                email, 
                password, 
                phone, 
                address, 
                role,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [name, email, hashedPassword, phone || '', address || '', role]
        );

        const userId = result.insertId;

        // Dapatkan data user yang baru dibuat (tanpa password)
        const [users] = await pool.query(
            'SELECT id, name, email, phone, address, role, profile_image, created_at FROM users WHERE id = ?',
            [userId]
        );

        console.log(`✅ User created: ${name} (ID: ${userId}, Role: ${role})`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: users[0]
        });

    } catch (error) {
        console.error('❌ Create user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            message: error.message
        });
    }
});

// ======================
// PAYMENT METHODS ROUTES (Admin only)
// ======================

// INSERT: Create new payment method (Admin only)
app.post('/api/admin/payment-methods', authenticateAdmin, async (req, res) => {
    try {
        logRequest(req, 'CREATE PAYMENT METHOD');
        const { name, description, is_active = 1 } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Payment method name is required'
            });
        }

        // Cek apakah payment method sudah ada
        const [existingMethods] = await pool.query(
            'SELECT id FROM payment_methods WHERE name = ?',
            [name]
        );

        if (existingMethods.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Payment method already exists'
            });
        }

        // INSERT payment method baru
        const [result] = await pool.query(
            'INSERT INTO payment_methods (name, description, is_active, created_at) VALUES (?, ?, ?, NOW())',
            [name, description || '', is_active ? 1 : 0]
        );

        const methodId = result.insertId;

        // Dapatkan data payment method yang baru dibuat
        const [methods] = await pool.query(
            'SELECT * FROM payment_methods WHERE id = ?',
            [methodId]
        );

        console.log(`✅ Payment method created: ${name} (ID: ${methodId})`);

        res.status(201).json({
            success: true,
            message: 'Payment method created successfully',
            payment_method: methods[0]
        });

    } catch (error) {
        console.error('❌ Create payment method error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment method',
            message: error.message
        });
    }
});

// ======================
// REVIEWS ROUTES
// ======================

// INSERT: Create new review
app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        logRequest(req, 'CREATE REVIEW');
        const { product_id, rating, comment } = req.body;
        const user_id = req.user.id;

        // Validasi input
        if (!product_id || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Product ID and rating are required'
            });
        }

        // Validasi rating (1-5)
        const parsedRating = parseInt(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Cek apakah product ada
        const [productCheck] = await pool.query(
            'SELECT id FROM products WHERE id = ? AND is_active = 1',
            [product_id]
        );

        if (productCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Cek apakah user sudah membeli product ini
        const [orderCheck] = await pool.query(`
            SELECT oi.id 
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
        `, [user_id, product_id]);

        // Optional: Hanya izinkan review dari yang sudah membeli
        // if (orderCheck.length === 0) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'You can only review products you have purchased'
        //     });
        // }

        // Cek apakah user sudah memberi review untuk product ini
        const [existingReview] = await pool.query(
            'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );

        if (existingReview.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'You have already reviewed this product'
            });
        }

        // INSERT review baru
        const [result] = await pool.query(
            `INSERT INTO reviews (
                user_id,
                product_id,
                rating,
                comment,
                is_approved,
                created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [user_id, product_id, parsedRating, comment || '', 1] // is_approved = 1 untuk auto approve
        );

        const reviewId = result.insertId;

        // Dapatkan data review yang baru dibuat
        const [reviews] = await pool.query(`
            SELECT r.*, u.name as user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [reviewId]);

        console.log(`✅ Review created for product ${product_id} by user ${user_id}`);

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            review: reviews[0]
        });

    } catch (error) {
        console.error('❌ Create review error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create review',
            message: error.message
        });
    }
});

// ======================
// ADDRESSES ROUTES
// ======================

// INSERT: Add new shipping address
app.post('/api/addresses', authenticateToken, async (req, res) => {
    try {
        logRequest(req, 'CREATE ADDRESS');
        const {
            recipient_name,
            phone,
            address_line1,
            address_line2,
            city,
            province,
            postal_code,
            is_default = 0
        } = req.body;

        const user_id = req.user.id;

        // Validasi input
        if (!recipient_name || !phone || !address_line1 || !city || !province || !postal_code) {
            return res.status(400).json({
                success: false,
                error: 'All address fields are required'
            });
        }

        // Jika ini alamat default, set semua alamat lain menjadi tidak default
        if (is_default) {
            await pool.query(
                'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
                [user_id]
            );
        }

        // INSERT alamat baru
        const [result] = await pool.query(
            `INSERT INTO user_addresses (
                user_id,
                recipient_name,
                phone,
                address_line1,
                address_line2,
                city,
                province,
                postal_code,
                is_default,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                user_id,
                recipient_name,
                phone,
                address_line1,
                address_line2 || '',
                city,
                province,
                postal_code,
                is_default ? 1 : 0
            ]
        );

        const addressId = result.insertId;

        // Dapatkan data alamat yang baru dibuat
        const [addresses] = await pool.query(
            'SELECT * FROM user_addresses WHERE id = ?',
            [addressId]
        );

        console.log(`✅ Address created for user ${user_id} (ID: ${addressId})`);

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            address: addresses[0]
        });

    } catch (error) {
        console.error('❌ Create address error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create address',
            message: error.message
        });
    }
});

// ======================
// BULK INSERT ENDPOINTS (Admin only)
// ======================

// BULK INSERT: Insert multiple products
app.post('/api/admin/products/bulk', authenticateAdmin, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        logRequest(req, 'BULK INSERT PRODUCTS');
        const products = req.body.products;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Products array is required'
            });
        }

        // Validasi maksimum batch size
        if (products.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 products per batch'
            });
        }

        await connection.beginTransaction();

        try {
            const insertedProducts = [];
            const errors = [];

            for (const product of products) {
                try {
                    const { name, description, price, category_id, stock, image_url, is_active = 1 } = product;

                    if (!name || !price || !category_id) {
                        errors.push({
                            product,
                            error: 'Name, price, and category are required'
                        });
                        continue;
                    }

                    const [result] = await connection.query(
                        `INSERT INTO products (
                            name, 
                            description, 
                            price, 
                            category_id, 
                            stock, 
                            image_url, 
                            is_active,
                            created_at,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                        [
                            name,
                            description || '',
                            parseFloat(price) || 0,
                            parseInt(category_id),
                            parseInt(stock) || 0,
                            image_url || '',
                            is_active ? 1 : 0
                        ]
                    );

                    insertedProducts.push({
                        id: result.insertId,
                        name,
                        price: parseFloat(price) || 0
                    });

                } catch (productError) {
                    errors.push({
                        product,
                        error: productError.message
                    });
                }
            }

            await connection.commit();

            console.log(`✅ Bulk insert: ${insertedProducts.length} products inserted, ${errors.length} errors`);

            res.status(201).json({
                success: true,
                message: `Bulk insert completed: ${insertedProducts.length} inserted, ${errors.length} errors`,
                inserted: insertedProducts.length,
                errors: errors.length,
                details: {
                    insertedProducts,
                    errors: errors.length > 0 ? errors : undefined
                }
            });

        } catch (transactionError) {
            await connection.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('❌ Bulk insert products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk insert products',
            message: error.message
        });
    } finally {
        connection.release();
    }
});

// ======================
// IMPORT/EXPORT ENDPOINTS (Admin only)
// ======================

// IMPORT: Import products from CSV/JSON
app.post('/api/admin/import/products', authenticateAdmin, async (req, res) => {
    try {
        logRequest(req, 'IMPORT PRODUCTS');
        const { data, format = 'json' } = req.body;

        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'Import data is required'
            });
        }

        let products = [];

        if (format === 'json') {
            if (!Array.isArray(data)) {
                return res.status(400).json({
                    success: false,
                    error: 'JSON data must be an array'
                });
            }
            products = data;
        } else if (format === 'csv') {
            // Convert CSV string to array
            const rows = data.trim().split('\n');
            const headers = rows[0].split(',');

            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',');
                const product = {};
                headers.forEach((header, index) => {
                    product[header.trim()] = values[index] ? values[index].trim() : '';
                });
                products.push(product);
            }
        } else {
            return res.status(400).json({
                success: false,
                error: 'Unsupported format. Use "json" or "csv"'
            });
        }

        // Process import
        const results = {
            total: products.length,
            success: 0,
            failed: 0,
            errors: []
        };

        for (const product of products) {
            try {
                const { name, price, category_id, stock = 0, description = '', image_url = '' } = product;

                if (!name || !price || !category_id) {
                    throw new Error('Missing required fields');
                }

                // Cek apakah kategori ada
                const [category] = await pool.query(
                    'SELECT id FROM categories WHERE id = ?',
                    [category_id]
                );

                if (category.length === 0) {
                    throw new Error(`Category ID ${category_id} not found`);
                }

                // INSERT produk
                await pool.query(
                    `INSERT INTO products (
                        name, 
                        description, 
                        price, 
                        category_id, 
                        stock, 
                        image_url, 
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
                    [
                        name,
                        description,
                        parseFloat(price),
                        parseInt(category_id),
                        parseInt(stock),
                        image_url
                    ]
                );

                results.success++;

            } catch (error) {
                results.failed++;
                results.errors.push({
                    product,
                    error: error.message
                });
            }
        }

        console.log(`✅ Import completed: ${results.success} successful, ${results.failed} failed`);

        res.json({
            success: true,
            message: `Import completed: ${results.success} successful, ${results.failed} failed`,
            results
        });

    } catch (error) {
        console.error('❌ Import products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import products',
            message: error.message
        });
    }
});

// Debug order endpoint untuk PaymentMethod.jsx
app.post('/api/debug/order-test', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Debug order test request from PaymentMethod.jsx');
        console.log('📥 Full request:', JSON.stringify(req.body, null, 2));

        res.json({
            success: true,
            message: 'Debug endpoint working',
            received: req.body,
            timestamp: new Date().toISOString(),
            user: req.user,
            serverInfo: {
                endpoint: '/api/orders/new',
                method: 'POST',
                database: 'matcha_app'
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'matcha_app'}`);
    console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:3001`);
    console.log(`🔧 Order endpoint: POST http://localhost:${PORT}/api/orders/new`);
    console.log(`📝 Available INSERT endpoints:`);
    console.log(`   • POST /api/products (Admin)`);
    console.log(`   • POST /api/categories (Admin)`);
    console.log(`   • POST /api/cart/add (User)`);
    console.log(`   • POST /api/orders/new (User)`);
    console.log(`   • POST /api/orders (User)`);
    console.log(`   • POST /api/favorites/add (User)`);
    console.log(`   • POST /api/admin/users (Admin)`);
    console.log(`   • POST /api/admin/payment-methods (Admin)`);
    console.log(`   • POST /api/reviews (User)`);
    console.log(`   • POST /api/addresses (User)`);
    console.log(`   • POST /api/admin/products/bulk (Admin)`);
    console.log(`   • POST /api/admin/import/products (Admin)`);

    await testConnection();
});
