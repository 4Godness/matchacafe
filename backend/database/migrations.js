// database/migrations.js - Enhanced ES Module version
import fs from 'fs/promises';
import db from './connection.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseMigration {
    constructor() {
        this.schemaPath = path.join(__dirname, 'schema.sql');
        this.initPath = path.join(__dirname, 'init.sql');
    }

    async run() {
        console.log('\n🚀 Starting database migration...\n');

        try {
            // Check if database connection is working
            await this.testConnection();

            // Execute init.sql if exists
            await this.executeSqlFile(this.initPath, 'Initialization');

            // Execute schema.sql
            await this.executeSqlFile(this.schemaPath, 'Schema');

            console.log('\n🎉 Migration completed successfully!\n');

        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
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

    async executeSqlFile(filePath, description) {
        try {
            if (!(await this.fileExists(filePath))) {
                console.log(`ℹ️  ${description} file not found: ${path.basename(filePath)}`);
                return;
            }

            console.log(`📄 Executing ${description}...`);
            const sql = await fs.readFile(filePath, 'utf8');

            // Split SQL into individual statements
            const statements = this.splitSqlStatements(sql);
            console.log(`   Found ${statements.length} SQL statements`);

            let successCount = 0;
            let errorCount = 0;

            // Execute each statement
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];

                // Skip empty statements
                if (!statement.trim()) continue;

                try {
                    await db.query(statement);
                    successCount++;
                } catch (error) {
                    // Handle common errors gracefully
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log(`   ⚠️  Statement ${i + 1}: Table already exists`);
                        successCount++;
                    } else if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`   ⚠️  Statement ${i + 1}: Duplicate entry (already exists)`);
                        successCount++;
                    } else {
                        console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
                        console.error(`       SQL: ${statement.substring(0, 100)}...`);
                        errorCount++;
                    }
                }
            }

            console.log(`   ✅ ${description}: ${successCount} succeeded, ${errorCount} failed`);

        } catch (error) {
            console.error(`❌ Error executing ${description}:`, error.message);
            throw error;
        }
    }

    splitSqlStatements(sql) {
        // Remove comments
        const cleanedSql = sql
            .replace(/--.*$/gm, '')  // Remove single line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
            .trim();

        // Split by semicolon, but not inside quotes or parentheses
        const statements = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        let parenDepth = 0;

        for (let i = 0; i < cleanedSql.length; i++) {
            const char = cleanedSql[i];
            const nextChar = cleanedSql[i + 1];

            current += char;

            // Handle quotes
            if ((char === "'" || char === '"' || char === '`') && cleanedSql[i - 1] !== '\\') {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuotes = false;
                }
            }

            // Handle parentheses
            if (char === '(' && !inQuotes) {
                parenDepth++;
            } else if (char === ')' && !inQuotes) {
                parenDepth--;
            }

            // Split on semicolon when not in quotes or parentheses
            if (char === ';' && !inQuotes && parenDepth === 0) {
                statements.push(current.trim());
                current = '';
            }
        }

        // Add any remaining SQL
        if (current.trim()) {
            statements.push(current.trim());
        }

        return statements.filter(stmt => stmt.length > 0);
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const migration = new DatabaseMigration();
    migration.run();
}

export default DatabaseMigration;