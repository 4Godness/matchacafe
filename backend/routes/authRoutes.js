import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const router = express.Router();

// Untuk ES Modules, dapatkan __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google OAuth client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ======================
// MULTER CONFIGURATION
// ======================

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.mkdirSync(path.join(uploadDir, 'profile'), { recursive: true });
    fs.mkdirSync(path.join(uploadDir, 'products'), { recursive: true });
    fs.mkdirSync(path.join(uploadDir, 'temp'), { recursive: true });
}

// Konfigurasi storage untuk multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(uploadDir, 'profile');

        // Pastikan folder ada
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate nama file unik: userId-timestamp-random.extension
        const userId = req.user?.id || 'unknown';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `profile-${userId}-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// Filter file untuk hanya menerima gambar
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
    }
};

// Konfigurasi multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 1 // Max 1 file per request
    }
});

// Middleware untuk upload profile photo
const uploadProfilePhoto = upload.single('profilePhoto');

// ======================
// MIDDLEWARE
// ======================

// Validation middleware
const validateRegister = (req, res, next) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Harap berikan nama, email, dan password'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password minimal 6 karakter'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Harap berikan alamat email yang valid'
        });
    }

    next();
};

// Middleware untuk reset password validation - DIPERBAIKI
const validateResetPassword = (req, res, next) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email dan password baru wajib diisi'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Harap masukkan alamat email yang valid'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password baru minimal 6 karakter'
        });
    }

    // Validasi strength password
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase) {
        return res.status(400).json({
            success: false,
            message: 'Password harus mengandung minimal satu huruf besar (A-Z)'
        });
    }

    if (!hasLowerCase) {
        return res.status(400).json({
            success: false,
            message: 'Password harus mengandung minimal satu huruf kecil (a-z)'
        });
    }

    if (!hasNumbers) {
        return res.status(400).json({
            success: false,
            message: 'Password harus mengandung minimal satu angka (0-9)'
        });
    }

    next();
};

// Middleware untuk verifikasi token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak disediakan'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');

        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        console.error('Token verification error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token telah kadaluarsa'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ======================
// AUTH ROUTES
// ======================

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', validateRegister, async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user already exists (MySQL version)
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User sudah ada dengan email ini'
            });
        }

        // Create user using MySQL model
        const user = await User.create({
            name,
            email,
            password,
            phone: phone || ''
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User berhasil didaftarkan',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role || 'user',
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error selama pendaftaran'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Harap berikan email dan password'
            });
        }

        // Cari user di database (MySQL version - dengan password)
        const user = await User.findByEmail(email, true);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password tidak valid'
            });
        }

        // Cek password
        const isPasswordValid = await User.verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password tidak valid'
            });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Buat JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '7d' }
        );

        // Kirim response tanpa password
        delete user.password;

        res.json({
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                address: user.address || '',
                role: user.role || 'user',
                profile_image: user.profile_image || null,
                created_at: user.created_at,
                last_login: user.last_login
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ======================
// PASSWORD ROUTES - DIPERBAIKI TOTAL
// ======================

// @route   POST /api/auth/reset-password
// @desc    Reset user password (tanpa perlu token, langsung update ke database)
// @access  Public
router.post('/reset-password', validateResetPassword, async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        console.log('Reset password request for email:', email);

        // Cari user berdasarkan email
        const user = await User.findByEmail(email);
        if (!user) {
            console.log('User not found for email:', email);
            // Beri tahu user bahwa email tidak ditemukan (untuk UX yang lebih baik)
            return res.status(404).json({
                success: false,
                message: 'Email tidak ditemukan. Pastikan email Anda sudah terdaftar.'
            });
        }

        console.log('User found for reset password:', user.id, user.name);

        // Hash password baru
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password di database
        const success = await User.updatePassword(user.id, hashedPassword);

        if (success) {
            console.log('Password reset successful for user:', user.id);

            // Buat log aktivitas
            await User.logActivity(user.id, 'password_reset', 'Password reset via forgot password');

            res.json({
                success: true,
                message: 'Password berhasil direset. Silakan login dengan password baru Anda.'
            });
        } else {
            console.error('Failed to reset password for user:', user.id);
            res.status(400).json({
                success: false,
                message: 'Gagal mereset password. Silakan coba lagi.'
            });
        }

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error selama reset password'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset link (compatibility route)
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email wajib diisi'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Harap berikan alamat email yang valid'
            });
        }

        // Cek apakah user ada
        const user = await User.findByEmail(email);
        if (!user) {
            // Untuk keamanan, beri response yang sama meskipun user tidak ditemukan
            console.log('Forgot password request for non-existent email:', email);
            return res.status(200).json({
                success: true,
                message: 'Jika email terdaftar, instruksi reset telah dikirim'
            });
        }

        console.log('Forgot password request for user:', user.id);

        // Di implementasi nyata, di sini Anda akan:
        // 1. Generate reset token
        // 2. Kirim email dengan reset link
        // 3. Simpan token di database dengan expiry

        // Untuk sekarang, beri response sukses
        res.json({
            success: true,
            message: 'Jika email terdaftar, instruksi reset telah dikirim'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password (butuh token, untuk user yang sudah login)
// @access  Private
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        console.log('Change password request for user:', req.user.id);

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Harap berikan password saat ini dan password baru'
            });
        }

        // Get user with password
        const user = await User.findByEmail(req.user.email, true);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Verify current password
        const isPasswordValid = await User.verifyPassword(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password saat ini salah'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal 6 karakter'
            });
        }

        // Validasi strength password
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).json({
                success: false,
                message: 'Password harus mengandung huruf besar, huruf kecil, dan angka'
            });
        }

        // Change password
        const success = await User.changePassword(req.user.id, newPassword);
        if (success) {
            console.log('Password changed successfully for user:', req.user.id);

            // Log aktivitas
            await User.logActivity(req.user.id, 'password_change', 'Password changed from settings');

            res.json({
                success: true,
                message: 'Password berhasil diubah'
            });
        } else {
            console.error('Failed to change password for user:', req.user.id);
            res.status(400).json({
                success: false,
                message: 'Gagal mengubah password'
            });
        }

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error selama perubahan password'
        });
    }
});

// @route   POST /api/auth/google
// @desc    Authenticate with Google
// @access  Public
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada kredensial yang diberikan'
            });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        console.log('Google login attempt for:', email);

        // Cek apakah user sudah ada di database
        let user = await User.findByEmail(email);

        if (!user) {
            console.log('Creating new user for Google login:', email);

            // Buat user baru jika belum ada
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

            // Create user in database
            try {
                user = await User.create({
                    name: name || 'Google User',
                    email: email,
                    password: randomPassword,
                    profile_image: picture || null
                });

                console.log('New user created with ID:', user.id);
            } catch (createError) {
                console.error('Error creating user:', createError);
                throw new Error('Failed to create user account');
            }
        } else {
            console.log('Existing user found:', user.id);
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Google login berhasil',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                address: user.address || '',
                role: user.role || 'user',
                profile_image: user.profile_image || picture,
                created_at: user.created_at,
                last_login: user.last_login || new Date()
            }
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Autentikasi Google gagal'
        });
    }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', verifyToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone || '',
                address: req.user.address || '',
                role: req.user.role || 'user',
                profile_image: req.user.profile_image,
                preferences: req.user.preferences ? JSON.parse(req.user.preferences) : {
                    emailNotifications: true,
                    pushNotifications: true,
                    specialOffers: false,
                    language: 'english'
                },
                created_at: req.user.created_at,
                last_login: req.user.last_login
            }
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ======================
// PROFILE UPDATE ROUTES
// ======================

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        console.log('UPDATE PROFILE REQUEST - /api/auth/profile (PUT):', {
            userId: req.user.id,
            name,
            phone,
            address
        });

        // Validasi minimal ada nama
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nama wajib diisi'
            });
        }

        // Update fields
        const updateData = {
            name: name.trim(),
            phone: phone || '',
            address: address || ''
        };

        console.log('Updating user with data:', updateData);

        // Update user di database
        const updatedUser = await User.updateProfile(req.user.id, updateData);

        if (!updatedUser) {
            console.error('Failed to update user in database');
            return res.status(400).json({
                success: false,
                message: 'Gagal memperbarui profil di database'
            });
        }

        console.log('Profile updated successfully in database');

        // Response dengan data user yang lengkap
        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone || '',
                address: updatedUser.address || '',
                profile_image: updatedUser.profile_image,
                role: updatedUser.role || 'user',
                created_at: updatedUser.created_at,
                last_login: updatedUser.last_login
            }
        });

    } catch (error) {
        console.error('Update profile error (PUT /profile):', error);

        // Error handling yang lebih spesifik
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Email sudah digunakan'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server error selama pembaruan profil'
        });
    }
});

// @route   PUT /api/auth/update-profile (alias untuk kompatibilitas)
// @desc    Update user profile - alias untuk PUT /profile
// @access  Private
router.put('/update-profile', verifyToken, async (req, res) => {
    try {
        console.log('Alias route /update-profile called, forwarding to /profile');
        // Forward ke route utama
        req.url = '/profile';
        req.method = 'PUT';
        router.handle(req, res);
    } catch (error) {
        console.error('Alias route error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/upload-profile-photo
// @desc    Upload profile photo
// @access  Private
router.post(
    '/upload-profile-photo',
    verifyToken,
    (req, res, next) => {
        // Gunakan multer middleware
        uploadProfilePhoto(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Ukuran file terlalu besar. Maksimal 5MB.'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`
                });
            } else if (err) {
                // An unknown error occurred
                return res.status(400).json({
                    success: false,
                    message: err.message || 'Upload file gagal'
                });
            }
            // Everything went fine
            next();
        });
    },
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada file yang diupload. Pilih foto profil.'
                });
            }

            console.log('File uploaded:', req.file);

            // Dapatkan path relatif file
            const filePath = `profile/${req.file.filename}`;

            // URL untuk mengakses file (untuk development)
            const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            const fileUrl = `${baseUrl}/uploads/${filePath}`;

            // Hapus foto lama jika ada
            if (req.user.profile_image) {
                const oldPhotoPath = req.user.profile_image.split('/uploads/')[1];
                if (oldPhotoPath) {
                    const oldPhotoFullPath = path.join(uploadDir, oldPhotoPath);
                    if (fs.existsSync(oldPhotoFullPath)) {
                        fs.unlinkSync(oldPhotoFullPath);
                        console.log('Foto lama dihapus:', oldPhotoFullPath);
                    }
                }
            }

            // Update user di database dengan photo URL
            const updatedUser = await User.updateProfile(req.user.id, {
                profile_image: fileUrl
            });

            if (updatedUser) {
                res.json({
                    success: true,
                    message: 'Foto profil berhasil diupload',
                    photoUrl: fileUrl,
                    filePath: filePath,
                    user: {
                        id: updatedUser.id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        phone: updatedUser.phone || '',
                        address: updatedUser.address || '',
                        profile_image: fileUrl,
                        role: updatedUser.role || 'user',
                        created_at: updatedUser.created_at
                    }
                });
            } else {
                // Hapus file yang sudah diupload jika gagal update database
                const fileToDelete = path.join(uploadDir, filePath);
                if (fs.existsSync(fileToDelete)) {
                    fs.unlinkSync(fileToDelete);
                }

                res.status(400).json({
                    success: false,
                    message: 'Gagal memperbarui foto profil di database'
                });
            }
        } catch (error) {
            console.error('Upload profile photo error:', error);

            // Hapus file jika ada error
            if (req.file) {
                const fileToDelete = path.join(uploadDir, 'profile', req.file.filename);
                if (fs.existsSync(fileToDelete)) {
                    fs.unlinkSync(fileToDelete);
                }
            }

            res.status(500).json({
                success: false,
                message: 'Server error selama upload foto'
            });
        }
    }
);

// @route   DELETE /api/auth/delete-profile-photo
// @desc    Delete profile photo
// @access  Private
router.delete('/delete-profile-photo', verifyToken, async (req, res) => {
    try {
        // Cek apakah user memiliki foto profil
        if (!req.user.profile_image) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada foto profil untuk dihapus'
            });
        }

        // Dapatkan path file dari URL
        const photoUrl = req.user.profile_image;
        const photoPath = photoUrl.split('/uploads/')[1];

        if (photoPath) {
            const fullPath = path.join(uploadDir, photoPath);

            // Hapus file dari sistem
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('Foto dihapus dari sistem:', fullPath);
            }
        }

        // Update database - hapus profile_image
        const updatedUser = await User.updateProfile(req.user.id, {
            profile_image: null
        });

        if (updatedUser) {
            res.json({
                success: true,
                message: 'Foto profil berhasil dihapus',
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    phone: updatedUser.phone || '',
                    address: updatedUser.address || '',
                    profile_image: null,
                    role: updatedUser.role || 'user',
                    created_at: updatedUser.created_at
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Gagal menghapus foto profil dari database'
            });
        }

    } catch (error) {
        console.error('Delete profile photo error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error selama penghapusan foto'
        });
    }
});

// ======================
// PREFERENCES & OTHER ROUTES
// ======================

// @route   PUT /api/auth/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const { emailNotifications, pushNotifications, specialOffers, language } = req.body;

        const success = await User.updatePreferences(req.user.id, {
            emailNotifications,
            pushNotifications,
            specialOffers,
            language
        });

        if (success) {
            res.json({
                success: true,
                message: 'Preferensi berhasil diperbarui'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Gagal memperbarui preferensi'
            });
        }

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', verifyToken, async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // You might want to implement token blacklisting if needed
        res.json({
            success: true,
            message: 'Logout berhasil'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Auth service berjalan',
        timestamp: new Date().toISOString(),
        uploadsPath: uploadDir
    });
});

export default router;