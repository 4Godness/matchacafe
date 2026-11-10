// backend/config/uploadConfig.js
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path untuk uploads
const uploadsDir = path.join(__dirname, '../uploads');
const profileUploadsDir = path.join(uploadsDir, 'profile');
const productUploadsDir = path.join(uploadsDir, 'products');
const tempUploadsDir = path.join(uploadsDir, 'temp');

// Buat folder jika belum ada
[uploadsDir, profileUploadsDir, productUploadsDir, tempUploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Konfigurasi storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'profilePhoto') {
            cb(null, profileUploadsDir);
        } else if (file.fieldname === 'productImage') {
            cb(null, productUploadsDir);
        } else {
            cb(null, tempUploadsDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filter file
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// Buat instance multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

export { upload, uploadsDir, profileUploadsDir, productUploadsDir };