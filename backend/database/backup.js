// database/backup.js - ES Module version
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Create backups directory if not exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const command = `mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASS} ${process.env.DB_NAME} > "${backupFile}"`;

    console.log(`📦 Creating backup: ${backupFile}`);

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Backup failed:', error.message);
                console.error('Stderr:', stderr);
                reject(error);
                return;
            }

            console.log('✅ Backup created successfully!');
            console.log(`📁 Location: ${backupFile}`);

            // List all backups
            const backups = fs.readdirSync(backupDir)
                .filter(file => file.endsWith('.sql'))
                .sort()
                .reverse();

            console.log('\n📊 Backup history:');
            backups.forEach((file, index) => {
                const stats = fs.statSync(path.join(backupDir, file));
                console.log(`   ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
            });

            resolve(backupFile);
        });
    });
}

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    backupDatabase().catch(console.error);
}

export default backupDatabase;