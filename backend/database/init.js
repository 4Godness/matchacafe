// database/init.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function initDatabase() {
    console.log("ðŸš€ Starting database initialization...");
    console.log("â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");

    try {
        // Configuration
        const config = {
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASS || "",
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || "matcha_app"
        };

        console.log("ðŸ“Š Configuration:");
        console.log(`   Host: ${config.host}`);
        console.log(`   User: ${config.user}`);
        console.log(`   Database: ${config.database}`);

        // Step 1: Connect to MySQL server (without database)
        console.log("\nðŸ”— Connecting to MySQL server...");
        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port
        });

        console.log("âœ… Connected to MySQL server");

        // Step 2: Create database if not exists
        console.log(`\nðŸ—„ï¸ Creating database '${config.database}'...`);
        await connection.execute(
            `CREATE DATABASE IF NOT EXISTS \`${config.database}\`
             CHARACTER SET utf8mb4 
             COLLATE utf8mb4_unicode_ci`
        );

        console.log(`âœ… Database '${config.database}' ready`);

        // Step 3: Switch to database
        await connection.execute(`USE \`${config.database}\``);
        console.log(`âœ… Using database: ${config.database}`);

        // Step 4: Check existing tables
        console.log("\nðŸ“‹ Checking existing tables...");
        const [tables] = await connection.execute("SHOW TABLES");

        if (tables.length > 0) {
            console.log(`âœ… Found ${tables.length} existing tables:`);
            tables.forEach((table, index) => {
                const tableName = Object.values(table)[0];
                console.log(`   ${index + 1}. ${tableName}`);
            });
        } else {
            console.log("â„¹ï¸ No tables found yet");
        }

        await connection.end();

        console.log("\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
        console.log("ðŸŽ‰ DATABASE INITIALIZATION COMPLETE!");
        console.log("â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
        console.log("\nðŸ’¡ Next steps:");
        console.log("   1. Run: npm run db:setup    (to create tables)");
        console.log("   2. Run: npm run db:create-admin  (to create admin user)");
        console.log("   3. Run: npm run start       (to start server)");

    } catch (error) {
        console.error("\nâŒ DATABASE INITIALIZATION FAILED!");
        console.error("â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
        console.error(`Error: ${error.message}`);
        console.error("\nðŸ”§ TROUBLESHOOTING:");
        console.error("   1. Make sure MySQL is running");
        console.error("   2. Check your .env file configuration");
        console.error("   3. Test connection manually:");
        console.error(`      mysql -h ${process.env.DB_HOST || "localhost"} -u ${process.env.DB_USER || "root"}`);
        console.error("\nðŸ“ Current .env configuration:");
        console.error(`   DB_HOST=${process.env.DB_HOST || "not set"}`);
        console.error(`   DB_USER=${process.env.DB_USER || "not set"}`);
        console.error(`   DB_NAME=${process.env.DB_NAME || "not set"}`);

        process.exit(1);
    }
}

// Run if called directly
if (process.argv[1] === import.meta.url.substring(7)) {
    initDatabase();
}

export default initDatabase;
