// database/setup.js - ES Module version
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class DatabaseSetup {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'matcha_app',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        };

        this.schemaPath = path.join(__dirname, 'schema.sql');
        this.dataPath = path.join(__dirname, 'seed-data.sql');
        this.initPath = path.join(__dirname, 'init.sql');
    }

    async setup() {
        console.log('\nðŸš€ Starting comprehensive database setup...\n');

        try {
            // Step 1: Connect to MySQL
            const connection = await this.createConnection();

            // Step 2: Ensure database exists
            await this.ensureDatabase(connection);

            // Step 3: Use the database
            await connection.query(`USE ${this.config.database}`);
            console.log(`âœ… Using database: ${this.config.database}`);

            // Step 4: Execute init.sql (if exists)
            await this.executeSqlFile(connection, this.initPath, 'Initialization');

            // Step 5: Execute schema.sql
            await this.executeSqlFile(connection, this.schemaPath, 'Schema');

            // Step 6: Create admin user
            await this.createAdminUser(connection);

            // Step 7: Execute seed data (if exists)
            await this.executeSqlFile(connection, this.dataPath, 'Seed Data');

            // Step 8: Show summary
            await this.showDatabaseSummary(connection);

            // Step 9: Test the setup
            await this.testDatabaseSetup(connection);

            await connection.end();

            console.log('\nðŸŽ‰ Database setup completed successfully!\n');

        } catch (error) {
            console.error('\nâŒ Database setup failed:', error.message);
            console.error('Stack:', error.stack);
            process.exit(1);
        }
    }

    async createConnection() {
        try {
            const connection = await mysql.createConnection({
                host: this.config.host,
                user: this.config.user,
                password: this.config.password,
                port: this.config.port,
                multipleStatements: true
            });

            console.log('âœ… Connected to MySQL server');
            return connection;

        } catch (error) {
            console.error('\nâŒ MySQL Connection failed:', error.message);
            console.log('\nðŸ’¡ Troubleshooting tips:');
            console.log('   1. Check if MySQL/XAMPP/WAMP is running');
            console.log('   2. Verify credentials in .env file:');
            console.log(`      DB_HOST=${this.config.host}`);
            console.log(`      DB_USER=${this.config.user}`);
            console.log(`      DB_NAME=${this.config.database}`);
            console.log('   3. Try connecting manually:');
            console.log(`      mysql -h ${this.config.host} -u ${this.config.user}`);
            console.log('\nðŸ”§ Common solutions:');
            console.log('   â€¢ Start MySQL service: `sudo service mysql start`');
            console.log('   â€¢ For XAMPP: Start Apache & MySQL from control panel');
            console.log('   â€¢ For WAMP: Click "Start All Services"');
            throw error;
        }
    }

    async ensureDatabase(connection) {
        try {
            // Check if database exists
            const [rows] = await connection.query(
                `SELECT SCHEMA_NAME 
                 FROM INFORMATION_SCHEMA.SCHEMATA 
                 WHERE SCHEMA_NAME = ?`,
                [this.config.database]
            );

            if (rows.length === 0) {
                // Create database with proper charset
                await connection.query(
                    `CREATE DATABASE ${this.config.database} 
                     CHARACTER SET utf8mb4 
                     COLLATE utf8mb4_unicode_ci`
                );
                console.log(`âœ… Created database: ${this.config.database}`);
            } else {
                console.log(`âœ… Database already exists: ${this.config.database}`);
            }

        } catch (error) {
            console.error('âŒ Error ensuring database:', error.message);
            throw error;
        }
    }

    async executeSqlFile(connection, filePath, description) {
        if (!fs.existsSync(filePath)) {
            console.log(`â„¹ï¸  No ${description.toLowerCase()} file found (${path.basename(filePath)})`);
            return;
        }

        try {
            console.log(`\nðŸ“‹ Executing ${description}...`);
            const sqlContent = fs.readFileSync(filePath, 'utf8');

            // Split into individual statements
            const statements = sqlContent
                .split(';')
                .filter(stmt => stmt.trim().length > 0)
                .map(stmt => stmt.trim() + ';');

            console.log(`   Found ${statements.length} SQL statements`);

            let successCount = 0;
            let errorCount = 0;
            let warningCount = 0;

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];

                // Skip comments and empty lines
                if (statement.startsWith('--') || statement.trim() === ';') {
                    continue;
                }

                try {
                    const [result] = await connection.query(statement);

                    // Check what type of statement it was
                    if (result.affectedRows !== undefined) {
                        // INSERT, UPDATE, DELETE
                        if (result.affectedRows > 0) {
                            console.log(`   âœ… ${i + 1}. Affected ${result.affectedRows} rows`);
                        }
                    } else if (result.warningStatus !== undefined) {
                        // SHOW, SELECT, etc.
                        console.log(`   âœ… ${i + 1}. Executed successfully`);
                    }

                    successCount++;

                } catch (error) {
                    // Handle specific errors gracefully
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log(`   âš ï¸  ${i + 1}. Table already exists`);
                        warningCount++;
                    } else if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`   âš ï¸  ${i + 1}. Duplicate entry (already exists)`);
                        warningCount++;
                    } else if (error.message.includes('already exists')) {
                        console.log(`   âš ï¸  ${i + 1}. Already exists`);
                        warningCount++;
                    } else {
                        console.error(`   âŒ ${i + 1}. Error:`, error.message);
                        console.error(`       SQL: ${statement.substring(0, 100)}...`);
                        errorCount++;
                    }
                }
            }

            console.log(`âœ… ${description} completed: ${successCount} success, ${warningCount} warnings, ${errorCount} errors`);

        } catch (error) {
            console.error(`âŒ Error executing ${description}:`, error.message);
            // Don't throw - continue with setup
        }
    }

    async createAdminUser(connection) {
        try {
            console.log('\nðŸ‘‘ Creating admin user...');

            // Check if admin already exists
            const [existing] = await connection.query(
                'SELECT id FROM users WHERE email = ?',
                ['admin@matcha.com']
            );

            if (existing.length > 0) {
                console.log('âœ… Admin user already exists');
                return;
            }

            // Generate hash for admin password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            // Insert admin user
            const [result] = await connection.query(
                `INSERT INTO users (name, email, password, phone, role, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Admin', 'admin@matcha.com', hashedPassword, '08123456789', 'admin', true]
            );

            console.log('âœ… Admin user created successfully');
            console.log('   ðŸ“§ Email: admin@matcha.com');
            console.log('   ðŸ”‘ Password: admin123');
            console.log('   ðŸ“± Phone: 08123456789');
            console.log('   ðŸ‘‘ Role: Admin');
            console.log(`   ðŸ†” User ID: ${result.insertId}`);

        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('â„¹ï¸  Users table not found yet, will create later');
            } else {
                console.error('âŒ Error creating admin user:', error.message);
            }
        }
    }

    async showDatabaseSummary(connection) {
        try {
            console.log('\nðŸ“Š Database Summary Report\n');

            // Get all tables
            const [tables] = await connection.query('SHOW TABLES');

            console.log(`ðŸ“ Total Tables: ${tables.length}`);
            console.log('â”€'.repeat(50));

            if (tables.length === 0) {
                console.log('No tables found in the database');
                return;
            }

            // Show each table with row count
            for (const table of tables) {
                const tableName = Object.values(table)[0];

                try {
                    const [countResult] = await connection.query(
                        `SELECT COUNT(*) as row_count FROM ${tableName}`
                    );

                    const rowCount = countResult[0].row_count;
                    console.log(`   ðŸ“„ ${tableName.padEnd(20)} : ${rowCount.toString().padStart(5)} rows`);

                } catch (countError) {
                    console.log(`   ðŸ“„ ${tableName.padEnd(20)} : ERROR (${countError.message})`);
                }
            }

            // Show database info
            const [dbInfo] = await connection.query(
                `SELECT 
                    @@version as version,
                    @@character_set_database as charset,
                    @@collation_database as collation`
            );

            console.log('\nðŸ”§ Database Information');
            console.log('â”€'.repeat(50));
            console.log(`   Version:   ${dbInfo[0].version}`);
            console.log(`   Charset:   ${dbInfo[0].charset}`);
            console.log(`   Collation: ${dbInfo[0].collation}`);

        } catch (error) {
            console.error('âŒ Error generating summary:', error.message);
        }
    }

    async testDatabaseSetup(connection) {
        try {
            console.log('\nðŸ§ª Testing database setup...');

            // Test 1: Check users table
            const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
            console.log(`   âœ… Users table: ${users[0].count} users`);

            // Test 2: Try to login with admin
            const [admin] = await connection.query(
                'SELECT id, name, email, role FROM users WHERE email = ?',
                ['admin@matcha.com']
            );

            if (admin.length > 0) {
                console.log(`   âœ… Admin account: ${admin[0].name} (${admin[0].role})`);
            } else {
                console.log('   âŒ Admin account not found');
            }

            // Test 3: Check all required tables
            const requiredTables = ['users', 'products'];
            for (const table of requiredTables) {
                try {
                    await connection.query(`SELECT 1 FROM ${table} LIMIT 1`);
                    console.log(`   âœ… ${table} table: OK`);
                } catch (error) {
                    console.log(`   âŒ ${table} table: Missing`);
                }
            }

            console.log('âœ… Database tests completed');

        } catch (error) {
            console.error('âŒ Database test error:', error.message);
        }
    }
}

// Run setup if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const setup = new DatabaseSetup();
    setup.setup().catch(console.error);
}

export default DatabaseSetup;
