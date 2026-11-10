import db from '../database/connection.js';
import bcrypt from 'bcryptjs';

class User {
    // Create user
    static async create(userData) {
        const { name, email, password, phone } = userData;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone || '', 'user']
        );

        return this.findById(result.insertId);
    }

    // Find by ID
    static async findById(id) {
        try {
            const [rows] = await db.execute(
                `SELECT id, name, email, phone, role, created_at, last_login, 
                        profile_image, preferences, is_active, address 
                 FROM users WHERE id = ?`,
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    // Find by Email (with password for login)
    static async findByEmail(email, includePassword = false) {
        try {
            let query = `SELECT id, name, email, phone, role, created_at, last_login, 
                                profile_image, preferences, is_active, address`;

            if (includePassword) {
                query += ', password';
            }

            query += ' FROM users WHERE email = ?';

            const [rows] = await db.execute(query, [email]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    // Update user - metode umum
    static async update(id, updateData) {
        try {
            const { name, phone, address, profile_image } = updateData;

            // Build dynamic query
            let query = 'UPDATE users SET ';
            const params = [];
            const updates = [];

            if (name !== undefined && name.trim() !== '') {
                updates.push('name = ?');
                params.push(name.trim());
            }

            if (phone !== undefined) {
                updates.push('phone = ?');
                params.push(phone || '');
            }

            if (address !== undefined) {
                updates.push('address = ?');
                params.push(address || '');
            }

            if (profile_image !== undefined) {
                updates.push('profile_image = ?');
                params.push(profile_image || null);
            }

            // Jika tidak ada yang diupdate, return user saat ini
            if (updates.length === 0) {
                return await this.findById(id);
            }

            // Tambahkan updated_at jika field ada di database
            updates.push('updated_at = CURRENT_TIMESTAMP');

            query += updates.join(', ') + ' WHERE id = ?';
            params.push(id);

            console.log('Update query:', query, 'Params:', params);

            const [result] = await db.execute(query, params);

            if (result.affectedRows === 0) {
                console.log('No rows affected');
                return null;
            }

            // Ambil user yang sudah diupdate
            const updatedUser = await this.findById(id);
            console.log('Updated user:', updatedUser);

            return updatedUser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // **updateProfile - alias untuk update dengan logging lebih baik**
    static async updateProfile(userId, updateData) {
        console.log('🔄 User.updateProfile called with:', { userId, updateData });

        try {
            // Gunakan metode update yang sudah ada
            const result = await this.update(userId, updateData);

            if (result) {
                console.log('✅ User profile updated successfully:', {
                    userId,
                    updatedFields: Object.keys(updateData)
                });
            } else {
                console.error('❌ Failed to update user profile');
            }

            return result;
        } catch (error) {
            console.error('❌ Error in updateProfile:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: updatePassword - untuk reset password langsung**
    static async updatePassword(userId, hashedPassword) {
        try {
            console.log('🔄 Updating password for user:', userId);

            const [result] = await db.execute(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, userId]
            );

            const success = result.affectedRows > 0;
            console.log(`✅ Password update ${success ? 'successful' : 'failed'} for user:`, userId);

            return success;
        } catch (error) {
            console.error('❌ Error updating password:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: changePassword - dengan hash otomatis**
    static async changePassword(userId, newPassword) {
        try {
            console.log('🔄 Changing password for user:', userId);

            // Hash password baru
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Gunakan metode updatePassword yang sudah ada
            return await this.updatePassword(userId, hashedPassword);
        } catch (error) {
            console.error('❌ Error changing password:', error);
            throw error;
        }
    }

    // Update user preferences
    static async updatePreferences(id, preferences) {
        try {
            const { emailNotifications, pushNotifications, specialOffers, language } = preferences;

            const preferencesObj = {
                emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
                pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
                specialOffers: specialOffers !== undefined ? specialOffers : false,
                language: language || 'english'
            };

            const [result] = await db.execute(
                'UPDATE users SET preferences = ? WHERE id = ?',
                [JSON.stringify(preferencesObj), id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating preferences:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: updateLastLogin - metode yang sudah diperbaiki**
    static async updateLastLogin(userId) {
        try {
            console.log('🔄 Updating last login for user:', userId);

            const [result] = await db.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [userId]
            );

            const success = result.affectedRows > 0;
            console.log(`✅ Last login update ${success ? 'successful' : 'failed'} for user:`, userId);

            return success;
        } catch (error) {
            console.error('❌ Error updating last login:', error);
            // Tidak perlu throw error untuk ini, karena tidak kritis
            return false;
        }
    }

    // **TAMBAHKAN: logActivity - untuk logging aktivitas user**
    static async logActivity(userId, activityType, description) {
        try {
            console.log('📝 Logging activity:', { userId, activityType, description });

            // Cek apakah tabel user_activities ada
            const [tableExists] = await db.execute(
                `SELECT table_name FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = 'user_activities'`
            );

            // Jika tabel tidak ada, buat tabel (opsional)
            if (tableExists.length === 0) {
                console.log('Creating user_activities table...');
                await db.execute(`
                    CREATE TABLE IF NOT EXISTS user_activities (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        activity_type VARCHAR(50) NOT NULL,
                        description TEXT,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
            }

            // Insert log activity
            const [result] = await db.execute(
                `INSERT INTO user_activities (user_id, activity_type, description) 
                 VALUES (?, ?, ?)`,
                [userId, activityType, description]
            );

            console.log('✅ Activity logged with ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('❌ Error logging activity:', error);
            // Jangan throw error, karena logging tidak boleh mengganggu flow utama
            return null;
        }
    }

    // Verify password
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            const isValid = await bcrypt.compare(plainPassword, hashedPassword);
            console.log('🔐 Password verification result:', isValid ? 'Valid' : 'Invalid');
            return isValid;
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    // **TAMBAHKAN: hashPassword - utility untuk hashing password**
    static async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(10);
            return await bcrypt.hash(password, salt);
        } catch (error) {
            console.error('Error hashing password:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: validatePasswordStrength - validasi strength password**
    static validatePasswordStrength(password) {
        const errors = [];

        if (!password || password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Check if email exists
    static async emailExists(email) {
        try {
            const [rows] = await db.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking email existence:', error);
            throw error;
        }
    }

    // Get all users (admin only)
    static async getAll(limit = 50, offset = 0) {
        try {
            const [rows] = await db.execute(
                `SELECT id, name, email, phone, role, created_at, last_login, 
                        profile_image, is_active 
                 FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [limit, offset]
            );
            return rows;
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }

    // Delete user (admin only)
    static async delete(id) {
        try {
            const [result] = await db.execute(
                'DELETE FROM users WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // findOne untuk kompatibilitas (digunakan oleh routes)
    static async findOne(condition) {
        try {
            // Untuk kompatibilitas dengan kode lama
            if (condition.email) {
                return await this.findByEmail(condition.email);
            }
            if (condition.id || condition._id) {
                const id = condition.id || condition._id;
                return await this.findById(id);
            }
            return null;
        } catch (error) {
            console.error('Error in findOne:', error);
            throw error;
        }
    }

    // Save method untuk kompatibilitas (seperti MongoDB)
    static async save(userData) {
        try {
            if (userData.id || userData._id) {
                // Update existing user
                const id = userData.id || userData._id;
                delete userData.id;
                delete userData._id;
                return await this.update(id, userData);
            } else {
                // Create new user
                return await this.create(userData);
            }
        } catch (error) {
            console.error('Error in save method:', error);
            throw error;
        }
    }

    // toObject method untuk kompatibilitas
    static toObject(user) {
        if (!user) return null;

        // Clone user object and remove password
        const userObj = { ...user };
        delete userObj.password;

        // Convert _id to id for consistency
        if (userObj._id) {
            userObj.id = userObj._id;
            delete userObj._id;
        }

        return userObj;
    }

    // Select method untuk kompatibilitas (+password)
    static async findOneWithPassword(condition) {
        try {
            if (condition.email) {
                return await this.findByEmail(condition.email, true);
            }
            return null;
        } catch (error) {
            console.error('Error in findOneWithPassword:', error);
            throw error;
        }
    }

    // Static method untuk create admin (compatibility)
    static async createAdmin(adminData) {
        const { name, email, password, phone } = adminData;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone || '', 'admin']
        );

        return {
            id: result.insertId,
            name,
            email,
            role: 'admin',
            created_at: new Date()
        };
    }

    // **TAMBAHKAN: validateProfileData - untuk validasi data profile**
    static validateProfileData(profileData) {
        const errors = [];

        if (!profileData.name || profileData.name.trim() === '') {
            errors.push('Name is required');
        }

        if (profileData.phone && profileData.phone.length > 20) {
            errors.push('Phone number is too long');
        }

        if (profileData.address && profileData.address.length > 500) {
            errors.push('Address is too long');
        }

        return errors;
    }

    // **TAMBAHKAN: getActivityLogs - untuk mendapatkan log aktivitas user**
    static async getActivityLogs(userId, limit = 50) {
        try {
            // Cek apakah tabel ada
            const [tableExists] = await db.execute(
                `SELECT table_name FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = 'user_activities'`
            );

            if (tableExists.length === 0) {
                console.log('user_activities table does not exist');
                return [];
            }

            const [rows] = await db.execute(
                `SELECT * FROM user_activities 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [userId, limit]
            );
            return rows;
        } catch (error) {
            console.error('Error getting activity logs:', error);
            return [];
        }
    }

    // **TAMBAHKAN: countUsers - untuk menghitung total user**
    static async countUsers() {
        try {
            const [rows] = await db.execute('SELECT COUNT(*) as count FROM users');
            return rows[0]?.count || 0;
        } catch (error) {
            console.error('Error counting users:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: deactivateUser - untuk menonaktifkan user**
    static async deactivateUser(userId) {
        try {
            const [result] = await db.execute(
                'UPDATE users SET is_active = 0 WHERE id = ?',
                [userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating user:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: activateUser - untuk mengaktifkan user kembali**
    static async activateUser(userId) {
        try {
            const [result] = await db.execute(
                'UPDATE users SET is_active = 1 WHERE id = ?',
                [userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error activating user:', error);
            throw error;
        }
    }

    // **TAMBAHKAN: updateUserRole - untuk mengubah role user (admin only)**
    static async updateUserRole(userId, role) {
        try {
            const validRoles = ['user', 'admin', 'moderator'];
            if (!validRoles.includes(role)) {
                throw new Error('Invalid role');
            }

            const [result] = await db.execute(
                'UPDATE users SET role = ? WHERE id = ?',
                [role, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }
}

export default User;