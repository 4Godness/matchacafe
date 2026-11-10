// database/status.js - ES Module version
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkDatabaseStatus() {
    console.log('\n📊 Database Status Check\n');

    try {
        // Check connection
        console.log('🔗 Connection test...');
        await db.query('SELECT 1 as test');
        console.log('✅ Database connection: OK\n');

        // Check tables
        console.log('📁 Checking tables...');
        const [tables] = await db.query('SHOW TABLES');

        if (tables.length === 0) {
            console.log('❌ No tables found in database');
            return;
        }

        console.log(`✅ Found ${tables.length} tables:\n`);

        // Check each table
        for (const table of tables) {
            const tableName = Object.values(table)[0];

            try {
                const [count] = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                const [columns] = await db.query(`SHOW COLUMNS FROM ${tableName}`);

                console.log(`📄 ${tableName}`);
                console.log(`   📊 Rows: ${count[0].count}`);
                console.log(`   🏷️  Columns: ${columns.length}`);

                // Show sample data for users table
                if (tableName === 'users') {
                    const [users] = await db.query(
                        'SELECT id, name, email, role FROM users LIMIT 3'
                    );
                    if (users.length > 0) {
                        console.log('   👥 Sample users:');
                        users.forEach(user => {
                            console.log(`     - ${user.name} (${user.email}) [${user.role}]`);
                        });
                    }
                }

                console.log('');

            } catch (error) {
                console.log(`❌ Error checking ${tableName}: ${error.message}\n`);
            }
        }

        // Check database info
        console.log('🔧 Database Information:');
        const [info] = await db.query(
            'SELECT @@version as version, @@character_set_database as charset'
        );
        console.log(`   🐬 Version: ${info[0].version}`);
        console.log(`   🔤 Charset: ${info[0].charset}`);

        console.log('\n✅ Database status: HEALTHY\n');

    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    checkDatabaseStatus();
}

export default checkDatabaseStatus;