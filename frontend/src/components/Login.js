// src/components/Login.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { API_URL } from '../services/api';
import "./Login.css";

export const Login = () => {
    const navigate = useNavigate();
    const { login, state } = useApp();

    const { isLoading = false, error: contextError = '' } = state || {};

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [localError, setLocalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [googleLoaded, setGoogleLoaded] = useState(false);

    const googleScriptRef = useRef(null);
    const isInitialized = useRef(false);

    // Load Google OAuth script
    useEffect(() => {
        // Cek apakah script sudah ada
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

        if (existingScript) {
            setGoogleLoaded(true);
            if (!isInitialized.current) {
                initializeGoogleSignIn();
            }
            return;
        }

        // Buat script baru
        googleScriptRef.current = document.createElement('script');
        googleScriptRef.current.src = 'https://accounts.google.com/gsi/client';
        googleScriptRef.current.async = true;
        googleScriptRef.current.defer = true;

        googleScriptRef.current.onload = () => {
            console.log('✅ Google OAuth script loaded');
            setGoogleLoaded(true);
            if (!isInitialized.current) {
                initializeGoogleSignIn();
                isInitialized.current = true;
            }
        };

        googleScriptRef.current.onerror = () => {
            console.error('❌ Failed to load Google OAuth script');
            setLocalError('Failed to load Google Sign-In. Please try again or use email login.');
        };

        document.head.appendChild(googleScriptRef.current);

        return () => {
            // Cleanup: jangan hapus script global, cukup reset state
            if (window.google && window.google.accounts && window.google.accounts.id) {
                window.google.accounts.id.cancel();
            }
            isInitialized.current = false;
        };
    }, []);

    // Initialize Google Sign-In
    const initializeGoogleSignIn = () => {
        if (!window.google || !window.google.accounts) {
            console.log('Google API not available yet, retrying...');
            setTimeout(() => {
                if (window.google && window.google.accounts) {
                    doInitialize();
                } else {
                    console.error('Google API failed to load');
                }
            }, 500);
            return;
        }

        doInitialize();
    };

    const doInitialize = () => {
        try {
            const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

            if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
                console.warn('⚠️ Google Client ID not configured');
                return;
            }

            console.log('Initializing Google Sign-In with client ID:', clientId.substring(0, 10) + '...');

            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
                context: 'signin',
                ux_mode: 'popup'
            });

            // Render button
            setTimeout(() => {
                const buttonContainer = document.getElementById('googleSignInButton');
                if (buttonContainer && window.google.accounts.id) {
                    try {
                        // Clear container dulu
                        buttonContainer.innerHTML = '';

                        window.google.accounts.id.renderButton(
                            buttonContainer,
                            {
                                type: 'standard',
                                theme: 'outline',
                                size: 'large',
                                text: 'signin_with',
                                shape: 'rectangular',
                                logo_alignment: 'left',
                                width: buttonContainer.offsetWidth || 300
                            }
                        );

                        // Tambahkan prompt untuk one-tap
                        window.google.accounts.id.prompt((notification) => {
                            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                                console.log('One-tap sign-in not displayed');
                            }
                        });

                        console.log('✅ Google Sign-In button rendered');
                    } catch (renderError) {
                        console.error('Error rendering Google button:', renderError);
                    }
                }
            }, 300);

        } catch (err) {
            console.error('Error initializing Google Sign-In:', err);
        }
    };

    // Handle Google response
    const handleGoogleResponse = async (response) => {
        console.log('Google response received');
        setIsSubmitting(true);
        setLocalError('');

        try {
            // Send credential to backend
            const backendResponse = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credential: response.credential })
            });

            const data = await backendResponse.json();

            if (!backendResponse.ok) {
                const errorMsg = data.message || data.error || 'Google login failed';
                throw new Error(errorMsg);
            }

            if (data.success && data.token) {
                // Save token and user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to home
                navigate('/home', { replace: true });
            } else {
                throw new Error(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Google login error:', error);
            setLocalError(error.message || 'Failed to login with Google. Please try email login.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle regular login
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error saat user mulai mengetik
        if (localError || contextError) {
            setLocalError('');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsSubmitting(true);

        // Validasi input
        const validationError = validateForm();
        if (validationError) {
            setLocalError(validationError);
            setIsSubmitting(false);
            return;
        }

        try {
            console.log('📝 Attempting login...', formData.email);

            // Gunakan login function dari context
            const result = await login(formData.email.trim(), formData.password);

            if (result && result.success) {
                console.log('✅ Login successful via context');
                // Navigate ke home atau dashboard
                navigate('/home', { replace: true });
            } else {
                const errorMsg = result?.error || result?.message || 'Login failed';
                setLocalError(errorMsg);
            }
        } catch (error) {
            console.error('❌ Login error:', error);

            // Error handling yang lebih spesifik
            let errorMessage = 'Login failed. Please try again.';

            if (error.message.includes('Network') || !navigator.onLine) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.message.includes('401') || error.message.includes('Invalid') || error.message.includes('credential')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setLocalError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateForm = () => {
        if (!formData.email.trim()) {
            return 'Email is required';
        }

        if (!formData.password) {
            return 'Password is required';
        }

        if (!isValidEmail(formData.email)) {
            return 'Please enter a valid email address';
        }

        if (formData.password.length < 6) {
            return 'Password must be at least 6 characters';
        }

        return null;
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleDemoAccount = (email, password) => {
        setFormData({
            email: email,
            password: password
        });
        setLocalError('');

        // Auto-submit setelah 500ms
        setTimeout(() => {
            document.querySelector('.login-form')?.requestSubmit();
        }, 500);
    };

    // PERBAIKAN: Navigasi ke Forgot Password page
    const handleForgotPassword = () => {
        console.log('Navigating to forgot password with email:', formData.email);
        navigate('/forgot-password', {
            state: {
                email: formData.email,
                from: 'login'
            }
        });
    };

    // Navigate ke Sign Up
    const handleSignUpClick = () => {
        navigate('/signup', {
            state: {
                from: 'login',
                suggestedEmail: formData.email
            }
        });
    };

    // Gabungkan error dari context dan local
    const displayError = contextError || localError;

    return (
        <div className="login">
            <div className="login-container">
                <div className="login-header">
                    {/* Logo dan Title */}
                    <div className="logo">
                        <div className="logo-icon">☕</div>
                        <h1 className="logo-text">Matcha Cafe</h1>
                    </div>
                    <p className="login-subtitle">Welcome back! Please sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="login-form" noValidate>
                    {displayError && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            <span className="error-text">{displayError}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email Address *
                        </label>
                        <div className="input-container">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="your.email@example.com"
                                className={`form-input ${displayError ? 'error' : ''}`}
                                required
                                disabled={isSubmitting || isLoading}
                                autoComplete="email"
                            />
                            <span className="input-icon">✉️</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password *
                        </label>
                        <div className="input-container">
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                className={`form-input ${displayError ? 'error' : ''}`}
                                required
                                disabled={isSubmitting || isLoading}
                                autoComplete="current-password"
                            />
                            <span className="input-icon">🔒</span>
                        </div>
                        <div className="password-options">
                            {/* PERBAIKAN: Ini akan navigate ke /forgot-password */}
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="forgot-password-btn"
                                disabled={isSubmitting}
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting || isLoading ? (
                            <>
                                <div className="loading-spinner"></div>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Demo Accounts Section - Opsional */}
                {process.env.REACT_APP_ENABLE_DEMO === 'true' && (
                    <div className="demo-accounts">
                        <h3>Quick Test Accounts:</h3>
                        <div className="demo-buttons">
                            <button
                                type="button"
                                className="demo-btn"
                                onClick={() => handleDemoAccount('admin@matchacafe.com', 'Admin123!')}
                                disabled={isSubmitting}
                            >
                                Admin Account
                            </button>
                            <button
                                type="button"
                                className="demo-btn"
                                onClick={() => handleDemoAccount('user@matchacafe.com', 'User123!')}
                                disabled={isSubmitting}
                            >
                                User Account
                            </button>
                        </div>
                        <p className="demo-info">
                            Use demo accounts for testing purposes only
                        </p>
                    </div>
                )}

                {/* Divider */}
                <div className="divider">
                    <span className="divider-text">or</span>
                </div>

                {/* Sign Up Section */}
                <div className="signup-section">
                    <p className="signup-text">
                        Don't have an account?
                    </p>
                    <button
                        type="button"
                        className="btn btn-signup"
                        onClick={handleSignUpClick}
                        disabled={isSubmitting}
                    >
                        <span className="signup-icon">📝</span>
                        Create New Account
                    </button>
                </div>

                {/* Divider untuk Social Login */}
                <div className="divider">
                    <span className="divider-text">or continue with</span>
                </div>

                {/* Google Sign-In */}
                <div className="social-login">
                    <div
                        id="googleSignInButton"
                        className="google-signin-container"
                        style={{
                            minHeight: '44px',
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '10px'
                        }}
                    >
                        {/* Button akan dirender oleh Google JS */}
                    </div>

                    {/* Fallback button jika Google gagal load */}
                    {!googleLoaded && (
                        <button
                            type="button"
                            className="btn btn-google manual-google-btn"
                            onClick={() => {
                                setLocalError('Google Sign-In is not available. Please use email login.');
                            }}
                            disabled={isSubmitting}
                        >
                            <span className="social-icon google-icon">G</span>
                            Continue with Google
                        </button>
                    )}

                    <p className="social-hint">
                        By continuing, you agree to our{' '}
                        <Link to="/terms" className="link">Terms</Link> and{' '}
                        <Link to="/privacy" className="link">Privacy Policy</Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <div className="footer-links">
                        <Link to="/help" className="footer-link">Help Center</Link>
                        <span className="footer-separator">•</span>
                        <Link to="/contact" className="footer-link">Contact Us</Link>
                        <span className="footer-separator">•</span>
                        <Link to="/about" className="footer-link">About</Link>
                    </div>
                    <p className="copyright">
                        © {new Date().getFullYear()} Matcha Cafe. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};
