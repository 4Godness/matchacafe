const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
        let uploadPath = uploadDir;

        // Tentukan folder berdasarkan tipe upload
        if (file.fieldname === 'profilePhoto') {
            uploadPath = path.join(uploadDir, 'profile');
        } else if (file.fieldname === 'productImage') {
            uploadPath = path.join(uploadDir, 'products');
        } else {
            uploadPath = path.join(uploadDir, 'temp');
        }

        // Pastikan folder ada
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate nama file unik: timestamp + random + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = file.fieldname + '-' + uniqueSuffix + ext;
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

// Middleware spesifik untuk upload profile photo
const uploadProfilePhoto = upload.single('profilePhoto');

// Middleware untuk upload product image
const uploadProductImage = upload.single('productImage');

// Middleware untuk menghapus file
const deleteFile = (filePath) => {
    const fullPath = path.join(uploadDir, filePath);

    if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('File deleted:', fullPath);
        });
    }
};

// Helper untuk mendapatkan URL file
const getFileUrl = (filePath) => {
    if (!filePath) return null;

    // Untuk development
    if (process.env.NODE_ENV === 'development') {
        return `http://localhost:5000/uploads/${filePath}`;
    }

    // Untuk production
    return `/uploads/${filePath}`;
};

module.exports = {
    uploadProfilePhoto,
    uploadProductImage,
    deleteFile,
    getFileUrl
};