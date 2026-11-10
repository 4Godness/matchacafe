// middleware/authMiddleware.js - ES Module version
import jwt from 'jsonwebtoken';

// Main authentication middleware
export const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token provided'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production'
        );

        // Attach user info to request
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
    }
};

// Admin-only middleware
export const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();
};

// Check if user is owner or admin
export const isOwnerOrAdmin = (resourceUserId) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        if (req.user.role !== 'admin' && req.user.id !== resourceUserId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        next();
    };
};

// Optional authentication (user can be authenticated or not)
export const optionalAuth = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production'
            );

            // Attach user info to request
            req.user = decoded;
            req.userId = decoded.id;
            req.isAuthenticated = true;
        } catch (error) {
            // Token is invalid, but continue without authentication
            console.log('Optional auth token invalid:', error.message);
            req.isAuthenticated = false;
        }
    } else {
        req.isAuthenticated = false;
    }

    next();
};

// Validate user ID in params
export const validateUserId = (req, res, next) => {
    const userId = req.params.userId || req.params.id;

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }

    if (req.user.role !== 'admin' && req.user.id.toString() !== userId) {
        return res.status(403).json({
            success: false,
            message: 'Access denied to this resource'
        });
    }

    next();
};

// Generate token helper (for testing or internal use)
export const generateTestToken = (userId, role = 'user', expiresIn = '7d') => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production',
        { expiresIn }
    );
};

// Verify token helper (for testing or internal use)
export const verifyToken = (token) => {
    try {
        return jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production'
        );
    } catch (error) {
        return null;
    }
};

// Default export with all middleware
export default {
    protect,
    admin,
    isOwnerOrAdmin,
    optionalAuth,
    validateUserId,
    generateTestToken,
    verifyToken
};