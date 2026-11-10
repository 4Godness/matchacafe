// database/reset.js - Enhanced ES Module version
import mysql from 'mysql2/promise';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

class DatabaseReset {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'matcha_app'
        };
    }

    async run() {
        console.log('\n' + '═'.repeat(50));
        console.log('⚠️   DATABASE RESET TOOL');
        console.log('═'.repeat(50));

        // Show current configuration
        console.log('\n📊 Current Configuration:');
        console.log(`   Database: ${this.config.database}`);
        console.log(`   Host: ${this.config.host}:${this.config.port}`);
        console.log(`   User: ${this.config.user}`);

        // Double confirmation
        const confirmed = await this.getConfirmation();
        if (!confirmed) {
            console.log('❌ Reset cancelled by user.');
            return;
        }

        // Backup before reset (optional)
        const backupConfirmed = await this.askQuestion('\n📦 Create backup before reset? (y/N): ');
        let backupFile = null;

        if (backupConfirmed.toLowerCase() === 'y') {
            backupFile = await this.createBackup();
        }

        try {
            // Perform reset
            await this.performReset();

            console.log('\n' + '═'.repeat(50));
            console.log('🎉 DATABASE RESET COMPLETE');
            console.log('═'.repeat(50));

            if (backupFile) {
                console.log(`\n💾 Backup saved at: ${backupFile}`);
            }

            console.log('\n💡 Next steps:');
            console.log('   1. Run: npm run db:setup');
            console.log('   2. Run: npm run db:create-admin');
            console.log('   3. Run: npm run db:seed');

        } catch (error) {
            console.error('\n❌ Reset failed:', error.message);
            console.error('\n🔧 Error details:', error.code);

            if (backupFile) {
                console.log(`\n📦 A backup was created before the error: ${backupFile}`);
            }

            process.exit(1);
        }
    }

    async getConfirmation() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            console.log('\n' + '⚠️'.repeat(20));
            console.log('WARNING: This will PERMANENTLY delete:');
            console.log('   • All tables and data');
            console.log('   • All users and settings');
            console.log('   • Everything in the database');
            console.log('⚠️'.repeat(20));

            rl.question('\nType "RESET" (uppercase) to confirm: ', (answer) => {
                rl.close();
                resolve(answer === 'RESET');
            });
        });
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(query, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    async createBackup() {
        console.log('\n📦 Creating backup...');

        try {
            const backupDir = path.join(__dirname, 'backups');
            await fs.mkdir(backupDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `pre-reset-${timestamp}.sql`);

            const connection = await mysql.createConnection({
                host: this.config.host,
                user: this.config.user,
                password: this.config.password,
                port: this.config.port,
                database: this.config.database
            });

            // Get list of tables
            const [tables] = await connection.query('SHOW TABLES');

            if (tables.length === 0) {
                console.log('   ℹ️  No tables to backup');
                await connection.end();
                return null;
            }

            console.log(`   Found ${tables.length} tables to backup`);

            // Simple backup - just DROP and CREATE statements
            let backupSQL = `-- Database Backup before reset\n`;
            backupSQL += `-- Generated: ${new Date().toISOString()}\n`;
            backupSQL += `-- Database: ${this.config.database}\n\n`;

            for (const table of tables) {
                const tableName = Object.values(table)[0];

                // Get CREATE TABLE statement
                const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
                backupSQL += `${createTable[0]['Create Table']};\n\n`;

                // Get row count
                const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                console.log(`   📊 ${tableName}: ${count[0].count} rows`);
            }

            await connection.end();

            // Save backup file
            await fs.writeFile(backupFile, backupSQL, 'utf8');
            console.log(`   ✅ Backup saved: ${backupFile}`);

            return backupFile;

        } catch (error) {
            console.log('   ⚠️  Backup failed:', error.message);
            return null;
        }
    }

    async performReset() {
        console.log('\n🔨 Performing database reset...');

        const connection = await mysql.createConnection({
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            port: this.config.port
        });

        try {
            // Check if database exists
            const [databases] = await connection.query(
                `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA 
                 WHERE SCHEMA_NAME = ?`,
                [this.config.database]
            );

            if (databases.length === 0) {
                console.log(`   ℹ️  Database doesn't exist: ${this.config.database}`);
            } else {
                // Drop database
                await connection.query(`DROP DATABASE IF EXISTS \`${this.config.database}\``);
                console.log(`   ✅ Dropped database: ${this.config.database}`);
            }

            // Create fresh database
            await connection.query(
                `CREATE DATABASE \`${this.config.database}\` 
                 CHARACTER SET utf8mb4 
                 COLLATE utf8mb4_unicode_ci`
            );

            console.log(`   ✅ Created database: ${this.config.database}`);

            await connection.end();

        } catch (error) {
            await connection.end();
            throw error;
        }
    }
}

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const resetTool = new DatabaseReset();
    resetTool.run();
}

export default DatabaseReset;