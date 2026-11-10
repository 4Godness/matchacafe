-- database/seed-data.sql
-- Sample data for Matcha Cafe application

-- Insert sample categories
INSERT IGNORE INTO categories (name, description, is_active) VALUES
('Coffee', 'Various coffee drinks', 1),
('Tea', 'Traditional and modern tea drinks', 1),
('Matcha', 'Specialty matcha drinks', 1),
('Pastry', 'Freshly baked pastries', 1),
('Dessert', 'Sweet desserts and cakes', 1),
('Makanan', 'Freshly prepared meals and savory dishes', 1),
('Minuman', 'Coffee, tea, and refreshing drinks', 1);

-- Insert sample products
INSERT IGNORE INTO products (name, description, price, category, image_url, stock) VALUES
('Classic Matcha', 'Traditional Japanese matcha tea', 25000, 'Matcha', 'matcha_classic.jpg', 50),
('Matcha Latte', 'Creamy matcha with steamed milk', 35000, 'Matcha', 'matcha_latte.jpg', 30),
('Iced Matcha', 'Refreshing cold matcha drink', 30000, 'Matcha', 'matcha_iced.jpg', 40),
('Matcha Frappe', 'Blended matcha with ice cream', 40000, 'Matcha', 'matcha_frappe.jpg', 25),
('Espresso', 'Strong black coffee', 20000, 'Coffee', 'espresso.jpg', 60),
('Cappuccino', 'Espresso with steamed milk foam', 30000, 'Coffee', 'cappuccino.jpg', 45),
('Latte', 'Smooth coffee with lots of milk', 32000, 'Coffee', 'latte.jpg', 50),
('Green Tea', 'Traditional Japanese green tea', 18000, 'Tea', 'green_tea.jpg', 70),
('Black Tea', 'Strong black tea', 18000, 'Tea', 'black_tea.jpg', 65),
('Croissant', 'Buttery French croissant', 25000, 'Pastry', 'croissant.jpg', 20),
('Chocolate Cake', 'Rich chocolate cake slice', 35000, 'Dessert', 'chocolate_cake.jpg', 15),
('Cheesecake', 'Creamy New York cheesecake', 40000, 'Dessert', 'cheesecake.jpg', 12),
('Strawberry Matcha Latte', 'Layered ceremonial matcha with fresh strawberry milk', 38000, 'Minuman', 'strawberry_matcha.jpg', 30),
('Brown Sugar Boba', 'Milk tea with chewy tapioca pearls and brown sugar', 29000, 'Minuman', 'brown_sugar_boba.jpg', 35),
('Peach Jasmine Tea', 'Light jasmine tea with sweet peach', 24000, 'Minuman', 'peach_jasmine_tea.jpg', 35),
('Iced Vanilla Latte', 'Double espresso, milk, and vanilla over ice', 32000, 'Minuman', 'iced_vanilla_latte.jpg', 35),
('Nasi Goreng Kampung', 'Savory wok-fried rice with egg and crackers', 32000, 'Makanan', 'nasi_goreng.jpg', 25),
('Chicken Katsu Curry', 'Crispy chicken katsu with Japanese curry rice', 46000, 'Makanan', 'chicken_katsu_curry.jpg', 20),
('Beef Burger', 'Grilled beef, cheddar, lettuce, and house sauce', 48000, 'Makanan', 'beef_burger.jpg', 20),
('Chicken Pesto Sandwich', 'Toasted sourdough with chicken and basil pesto', 39000, 'Makanan', 'chicken_pesto_sandwich.jpg', 20),
('Matcha Tiramisu', 'Mascarpone layers with a delicate matcha finish', 36000, 'Dessert', 'matcha_tiramisu.jpg', 15),
('Strawberry Cheesecake', 'Creamy cheesecake with strawberry compote', 38000, 'Dessert', 'strawberry_cheesecake.jpg', 15);

-- Insert sample orders for admin user (if exists)
INSERT IGNORE INTO orders (user_id, total_amount, status, payment_method, payment_status) 
SELECT 
    u.id,
    85000,
    'completed',
    'cash',
    'paid'
FROM users u 
WHERE u.email = 'admin@matcha.com'
LIMIT 1;

-- Insert order items for the sample order
INSERT IGNORE INTO order_items (order_id, product_id, quantity, price)
SELECT 
    o.id,
    p.id,
    2,
    p.price
FROM orders o
CROSS JOIN products p 
WHERE p.name IN ('Classic Matcha', 'Matcha Latte')
LIMIT 2;
