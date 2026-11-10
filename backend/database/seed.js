// database/seed.js - Enhanced ES Module version
import db from './connection.js';

class DatabaseSeeder {
    constructor() {
        this.seedData = {
            categories: [
                { name: 'Coffee', description: 'Various coffee drinks', is_active: true },
                { name: 'Tea', description: 'Traditional and modern tea drinks', is_active: true },
                { name: 'Matcha', description: 'Specialty matcha drinks', is_active: true },
                { name: 'Pastry', description: 'Freshly baked pastries', is_active: true },
                { name: 'Dessert', description: 'Sweet desserts and cakes', is_active: true },
                { name: 'Makanan', description: 'Freshly prepared meals and savory dishes', is_active: true },
                { name: 'Minuman', description: 'Coffee, tea, and refreshing drinks', is_active: true }
            ],
            products: [
                { name: 'Classic Matcha', description: 'Traditional Japanese matcha tea', price: 25000, category: 'Matcha', image_url: 'matcha_classic.jpg', stock: 50 },
                { name: 'Matcha Latte', description: 'Creamy matcha with steamed milk', price: 35000, category: 'Matcha', image_url: 'matcha_latte.jpg', stock: 30 },
                { name: 'Iced Matcha', description: 'Refreshing cold matcha drink', price: 30000, category: 'Matcha', image_url: 'matcha_iced.jpg', stock: 40 },
                { name: 'Matcha Frappe', description: 'Blended matcha with ice cream', price: 40000, category: 'Matcha', image_url: 'matcha_frappe.jpg', stock: 25 },
                { name: 'Espresso', description: 'Strong black coffee', price: 20000, category: 'Coffee', image_url: 'espresso.jpg', stock: 60 },
                { name: 'Cappuccino', description: 'Espresso with steamed milk foam', price: 30000, category: 'Coffee', image_url: 'cappuccino.jpg', stock: 45 },
                { name: 'Latte', description: 'Smooth coffee with lots of milk', price: 32000, category: 'Coffee', image_url: 'latte.jpg', stock: 50 },
                { name: 'Green Tea', description: 'Traditional Japanese green tea', price: 18000, category: 'Tea', image_url: 'green_tea.jpg', stock: 70 },
                { name: 'Black Tea', description: 'Strong black tea', price: 18000, category: 'Tea', image_url: 'black_tea.jpg', stock: 65 },
                { name: 'Croissant', description: 'Buttery French croissant', price: 25000, category: 'Pastry', image_url: 'croissant.jpg', stock: 20 },
                { name: 'Chocolate Cake', description: 'Rich chocolate cake slice', price: 35000, category: 'Dessert', image_url: 'chocolate_cake.jpg', stock: 15 },
                { name: 'Cheesecake', description: 'Creamy New York cheesecake', price: 40000, category: 'Dessert', image_url: 'cheesecake.jpg', stock: 12 },
                { name: 'Strawberry Matcha Latte', description: 'Layered ceremonial matcha with fresh strawberry milk', price: 38000, category: 'Minuman', image_url: 'strawberry_matcha.jpg', stock: 30 },
                { name: 'Brown Sugar Boba', description: 'Milk tea with chewy tapioca pearls and brown sugar', price: 29000, category: 'Minuman', image_url: 'brown_sugar_boba.jpg', stock: 35 },
                { name: 'Peach Jasmine Tea', description: 'Light jasmine tea with sweet peach', price: 24000, category: 'Minuman', image_url: 'peach_jasmine_tea.jpg', stock: 35 },
                { name: 'Iced Vanilla Latte', description: 'Double espresso, milk, and vanilla over ice', price: 32000, category: 'Minuman', image_url: 'iced_vanilla_latte.jpg', stock: 35 },
                { name: 'Nasi Goreng Kampung', description: 'Savory wok-fried rice with egg and crackers', price: 32000, category: 'Makanan', image_url: 'nasi_goreng.jpg', stock: 25 },
                { name: 'Chicken Katsu Curry', description: 'Crispy chicken katsu with Japanese curry rice', price: 46000, category: 'Makanan', image_url: 'chicken_katsu_curry.jpg', stock: 20 },
                { name: 'Beef Burger', description: 'Grilled beef, cheddar, lettuce, and house sauce', price: 48000, category: 'Makanan', image_url: 'beef_burger.jpg', stock: 20 },
                { name: 'Chicken Pesto Sandwich', description: 'Toasted sourdough with chicken and basil pesto', price: 39000, category: 'Makanan', image_url: 'chicken_pesto_sandwich.jpg', stock: 20 },
                { name: 'Matcha Tiramisu', description: 'Mascarpone layers with a delicate matcha finish', price: 36000, category: 'Dessert', image_url: 'matcha_tiramisu.jpg', stock: 15 },
                { name: 'Strawberry Cheesecake', description: 'Creamy cheesecake with strawberry compote', price: 38000, category: 'Dessert', image_url: 'strawberry_cheesecake.jpg', stock: 15 }
            ]
        };
    }

    async run() {
        console.log('\n' + '═'.repeat(50));
        console.log('🌱 DATABASE SEEDING TOOL');
        console.log('═'.repeat(50));

        try {
            // Check database connection
            await this.testConnection();

            // Show what will be seeded
            this.showSeedSummary();

            // Confirm seeding
            const confirmed = await this.confirmSeeding();
            if (!confirmed) {
                console.log('❌ Seeding cancelled.');
                return;
            }

            // Start seeding
            console.log('\n🚀 Starting database seeding...\n');

            // Seed categories
            const categoryResults = await this.seedCategories();

            // Seed products
            const productResults = await this.seedProducts();

            // Seed sample data (optional)
            await this.seedSampleData();

            // Show results
            this.showResults(categoryResults, productResults);

            console.log('\n' + '═'.repeat(50));
            console.log('🎉 SEEDING COMPLETED SUCCESSFULLY');
            console.log('═'.repeat(50));

        } catch (error) {
            console.error('\n❌ Seeding failed:', error.message);
            process.exit(1);
        }
    }

    async testConnection() {
        try {
            console.log('🔗 Testing database connection...');
            const [rows] = await db.query('SELECT 1 as test');
            console.log('✅ Database connection: OK');
            return rows;
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    showSeedSummary() {
        console.log('\n📋 Seed Data Summary:');
        console.log(`   📁 Categories: ${this.seedData.categories.length} items`);
        console.log(`   📦 Products: ${this.seedData.products.length} items`);
        console.log('\n📊 Categories to be created:');
        this.seedData.categories.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.name} - ${cat.description}`);
        });
    }

    async confirmSeeding() {
        const readline = (await import('readline')).default;
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            console.log('\n⚠️  WARNING: This will insert sample data into the database.');
            console.log('   Existing data in categories/products tables may be duplicated.');

            rl.question('\nType "SEED" to confirm: ', (answer) => {
                rl.close();
                resolve(answer === 'SEED');
            });
        });
    }

    async seedCategories() {
        console.log('\n📦 Seeding categories...');

        const results = {
            inserted: 0,
            skipped: 0,
            errors: 0
        };

        for (const category of this.seedData.categories) {
            try {
                const [result] = await db.execute(
                    'INSERT IGNORE INTO categories (name, description, is_active) VALUES (?, ?, ?)',
                    [category.name, category.description, category.is_active]
                );

                if (result.affectedRows > 0) {
                    results.inserted++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                console.error(`   ❌ Error inserting category "${category.name}":`, error.message);
                results.errors++;
            }
        }

        console.log(`   ✅ Categories: ${results.inserted} inserted, ${results.skipped} skipped, ${results.errors} errors`);
        return results;
    }

    async seedProducts() {
        console.log('\n📦 Seeding products...');

        const results = {
            inserted: 0,
            skipped: 0,
            errors: 0
        };

        // Get category IDs for mapping
        const [categories] = await db.execute('SELECT id, name FROM categories');
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });

        for (const product of this.seedData.products) {
            try {
                const categoryId = categoryMap[product.category];

                if (!categoryId) {
                    console.log(`   ⚠️  Skipping product "${product.name}": Category "${product.category}" not found`);
                    results.skipped++;
                    continue;
                }

                const [result] = await db.execute(
                    `INSERT IGNORE INTO products 
                     (name, description, price, category_id, image_url, stock) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [product.name, product.description, product.price, categoryId, product.image_url, product.stock]
                );

                if (result.affectedRows > 0) {
                    results.inserted++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                console.error(`   ❌ Error inserting product "${product.name}":`, error.message);
                results.errors++;
            }
        }

        console.log(`   ✅ Products: ${results.inserted} inserted, ${results.skipped} skipped, ${results.errors} errors`);
        return results;
    }

    async seedSampleData() {
        try {
            console.log('\n📊 Creating sample orders...');

            // Check if orders table exists
            const [tables] = await db.execute("SHOW TABLES LIKE 'orders'");
            if (tables.length === 0) {
                console.log('   ℹ️  Orders table not found, skipping sample orders');
                return;
            }

            // Create a sample order
            const [orderResult] = await db.execute(
                `INSERT INTO orders (order_number, customer_name, customer_email, status, total_amount) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['ORD-SEED-001', 'Sample Customer', 'sample@matcha.com', 'completed', 85000]
            );

            console.log(`   ✅ Created sample order: ORD-SEED-001`);

        } catch (error) {
            console.log('   ℹ️  Could not create sample orders:', error.message);
        }
    }

    showResults(categoryResults, productResults) {
        console.log('\n📊 SEEDING RESULTS');
        console.log('═'.repeat(30));

        console.log('\n📁 Categories:');
        console.log(`   ✅ Inserted: ${categoryResults.inserted}`);
        console.log(`   ⚠️  Skipped: ${categoryResults.skipped}`);
        console.log(`   ❌ Errors: ${categoryResults.errors}`);

        console.log('\n📦 Products:');
        console.log(`   ✅ Inserted: ${productResults.inserted}`);
        console.log(`   ⚠️  Skipped: ${productResults.skipped}`);
        console.log(`   ❌ Errors: ${productResults.errors}`);

        console.log('\n📈 Summary:');
        const totalInserted = categoryResults.inserted + productResults.inserted;
        const totalSkipped = categoryResults.skipped + productResults.skipped;
        const totalErrors = categoryResults.errors + productResults.errors;

        console.log(`   Total inserted: ${totalInserted} items`);
        console.log(`   Total skipped: ${totalSkipped} items`);
        console.log(`   Total errors: ${totalErrors} items`);
    }
}

// Run if this file is executed directly
if (process.argv[1] === import.meta.url) {
    const seeder = new DatabaseSeeder();
    seeder.run();
}

// Export untuk penggunaan programmatic
export { DatabaseSeeder };

// Fungsi utilitas untuk seeding cepat
export async function seedSampleData() {
    const seeder = new DatabaseSeeder();
    await seeder.seedCategories();
    await seeder.seedProducts();
}

export default DatabaseSeeder;
