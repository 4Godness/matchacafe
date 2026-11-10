// utils/generateToken.js - ES Module version (simplified)
import jwt from 'jsonwebtoken';

export const generateToken = (id, additionalData = {}) => {
    const payload = {
        id,
        ...additionalData
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-fallback-secret-key-change-this-in-production',
        {
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-fallback-secret-key-change-this-in-production'
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

// Default export (compatibility with existing code)
const generateTokenDefault = (id) => {
    return generateToken(id);
};

export default generateTokenDefault;