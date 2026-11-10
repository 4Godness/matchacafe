// database/restore.js - Enhanced ES Module version
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

class DatabaseRestore {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'matcha_app',
            port: process.env.DB_PORT || 3306
        };

        this.backupDir = path.join(__dirname, 'backups');
    }

    async run() {
        console.log('\n' + '═'.repeat(50));
        console.log('🔄 DATABASE RESTORE TOOL');
        console.log('═'.repeat(50));

        // Check backup directory
        if (!await this.directoryExists(this.backupDir)) {
            console.log('\n❌ No backups directory found');
            console.log('   Run `npm run db:backup` first to create a backup');
            return;
        }

        // List backups
        const backups = await this.listBackups();
        if (backups.length === 0) {
            console.log('\n❌ No backup files found');
            return;
        }

        // Display backups
        console.log('\n📊 Available backups:');
        backups.forEach((backup, index) => {
            console.log(`   ${index + 1}. ${backup.name} (${backup.size}) - ${backup.date}`);
        });

        // Select backup
        const selectedBackup = await this.selectBackup(backups);
        if (!selectedBackup) {
            console.log('❌ Restore cancelled.');
            return;
        }

        // Confirm restore
        const confirmed = await this.confirmRestore(selectedBackup);
        if (!confirmed) {
            console.log('❌ Restore cancelled.');
            return;
        }

        // Perform restore
        try {
            await this.performRestore(selectedBackup);

            console.log('\n' + '═'.repeat(50));
            console.log('🎉 DATABASE RESTORE COMPLETE');
            console.log('═'.repeat(50));

        } catch (error) {
            console.error('\n❌ Restore failed:', error.message);
            process.exit(1);
        }
    }

    async directoryExists(dirPath) {
        try {
            await fs.access(dirPath);
            return true;
        } catch {
            return false;
        }
    }

    async listBackups() {
        const files = await fs.readdir(this.backupDir);

        const backups = [];
        for (const file of files) {
            if (file.endsWith('.sql')) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);

                backups.push({
                    name: file,
                    path: filePath,
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    date: stats.mtime.toLocaleString(),
                    stats: stats
                });
            }
        }

        return backups.sort((a, b) => b.stats.mtime - a.stats.mtime);
    }

    async selectBackup(backups) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('\nSelect backup number to restore (or "cancel"): ', (answer) => {
                rl.close();

                if (answer.toLowerCase() === 'cancel') {
                    resolve(null);
                    return;
                }

                const index = parseInt(answer) - 1;
                if (isNaN(index) || index < 0 || index >= backups.length) {
                    console.log('❌ Invalid selection.');
                    resolve(null);
                    return;
                }

                resolve(backups[index]);
            });
        });
    }

    async confirmRestore(backup) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            console.log('\n' + '⚠️'.repeat(20));
            console.log('WARNING: This will OVERWRITE the database!');
            console.log('   All current data will be replaced.');
            console.log('\n   Backup:', backup.name);
            console.log('   Size:', backup.size);
            console.log('   Created:', backup.date);
            console.log('\n   Target database:', this.config.database);
            console.log('   Host:', `${this.config.host}:${this.config.port}`);
            console.log('⚠️'.repeat(20));

            rl.question('\nType "RESTORE" (uppercase) to confirm: ', (answer) => {
                rl.close();
                resolve(answer === 'RESTORE');
            });
        });
    }

    async performRestore(backup) {
        console.log(`\n🔄 Restoring from backup: ${backup.name}`);
        console.log('   This may take a moment...');

        return new Promise((resolve, reject) => {
            // Build mysql command
            const command = `mysql \
                -h "${this.config.host}" \
                -u "${this.config.user}" \
                ${this.config.password ? `-p"${this.config.password}"` : ''} \
                -P ${this.config.port} \
                "${this.config.database}" \
                < "${backup.path}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('\n❌ Restore failed!');
                    console.error('Error:', error.message);

                    if (stderr) {
                        console.error('\nError details:');
                        console.error(stderr.substring(0, 500) + '...');
                    }

                    reject(new Error(`Restore failed: ${error.message}`));
                    return;
                }

                // Check for warnings
                if (stderr && !stderr.includes('Using a password on the command line')) {
                    console.log('\n⚠️  Warnings during restore:');
                    console.error(stderr);
                }

                console.log('\n✅ Restore completed successfully!');

                // Show summary
                console.log('\n📋 Restore Summary:');
                console.log('   Backup:', backup.name);
                console.log('   Size:', backup.size);
                console.log('   Target:', this.config.database);
                console.log('   Timestamp:', new Date().toLocaleString());

                resolve();
            });
        });
    }

    // Utility function untuk restore otomatis dari file tertentu
    async restoreFromFile(backupPath) {
        if (!await this.directoryExists(path.dirname(backupPath))) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        console.log(`Restoring from: ${backupPath}`);

        return this.performRestore({
            name: path.basename(backupPath),
            path: backupPath,
            size: 'N/A',
            date: new Date().toLocaleString(),
            stats: await fs.stat(backupPath)
        });
    }
}

// Run if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const restorer = new DatabaseRestore();
    restorer.run();
}

// Export untuk penggunaan programmatic
export { DatabaseRestore };

// Fungsi utilitas untuk restore otomatis
export async function restoreBackup(backupPath) {
    const restorer = new DatabaseRestore();
    return restorer.restoreFromFile(backupPath);
}

export default DatabaseRestore;