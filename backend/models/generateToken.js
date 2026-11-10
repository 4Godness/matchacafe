// utils/generateToken.js - ES Module version
import jwt from 'jsonwebtoken';

export const generateToken = (userId, additionalData = {}) => {
    const payload = {
        id: userId,
        ...additionalData
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production',
        {
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production'
        );
    } catch (error) {
        console.error('Token verification error:', error.message);
        return null;
    }
};

export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        console.error('Token decode error:', error.message);
        return null;
    }
};

export const generateAccessRefreshTokens = (userId, userData = {}) => {
    const accessToken = generateToken(userId, {
        ...userData,
        tokenType: 'access'
    });

    const refreshToken = generateToken(userId, {
        ...userData,
        tokenType: 'refresh'
    });

    return { accessToken, refreshToken };
};

export const validateToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during token validation'
        });
    }
};

export const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
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

export const isOwnerOrAdmin = (userId, req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    next();
};

// Default export
export default {
    generateToken,
    verifyToken,
    decodeToken,
    generateAccessRefreshTokens,
    validateToken,
    isAdmin,
    isOwnerOrAdmin
};