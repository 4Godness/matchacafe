// src/components/ForgotPassword.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { API_URL } from '../services/api';
import './ForgotPassword.css';

export const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get email dari state sebelumnya (jika ada)
    const initialEmail = location.state?.email || '';

    const [formData, setFormData] = useState({
        email: initialEmail,
        newPassword: '',
        confirmPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({
        hasLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false
    });
    const [serverStatus, setServerStatus] = useState('unknown'); // unknown, connected, disconnected

    // Cek status server saat komponen mount
    useEffect(() => {
        checkServerStatus();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const newFormData = {
            ...formData,
            [name]: value
        };

        setFormData(newFormData);

        // Validasi real-time untuk password strength
        if (name === 'newPassword') {
            setPasswordStrength({
                hasLength: value.length >= 6,
                hasUpperCase: /[A-Z]/.test(value),
                hasLowerCase: /[a-z]/.test(value),
                hasNumber: /\d/.test(value)
            });
        }

        // Clear error saat user mulai mengetik
        if (error) setError('');
        if (message) setMessage('');
    };

    // Fungsi untuk cek status server
    const checkServerStatus = async () => {
        try {
            console.log('🔄 Checking server status...');
            const response = await fetch(`${API_URL}/auth/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                credentials: 'same-origin'
            });

            console.log('Server health response:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Server health data:', data);
                setServerStatus('connected');
                setMessage('✅ Server terhubung!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setServerStatus('disconnected');
            }
        } catch (error) {
            console.error('❌ Server check failed:', error);
            setServerStatus('disconnected');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Validasi
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        // Cek status server sebelum submit
        if (serverStatus !== 'connected') {
            setError('❌ Server tidak terhubung. Silakan klik "Test Koneksi Server" terlebih dahulu.');
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('🔄 Sending reset password request:', {
                email: formData.email,
                newPasswordLength: formData.newPassword.length
            });

            // Kirim request ke backend untuk reset password langsung
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    newPassword: formData.newPassword
                })
            });

            console.log('Response status:', response.status);

            const data = await response.json();
            console.log('Reset password response:', data);

            if (response.ok && data.success) {
                setMessage('✅ Password berhasil direset! Mengarahkan ke halaman login...');

                // Langsung redirect ke login setelah 2 detik
                setTimeout(() => {
                    navigate('/login', {
                        state: {
                            email: formData.email,
                            message: 'Password telah berhasil direset. Silakan login dengan password baru Anda.'
                        }
                    });
                }, 2000);

            } else {
                // Error dari server
                let errorMsg = data.message || 'Gagal mereset password. Silakan coba lagi.';

                // Handle specific errors
                if (data.message?.includes('tidak ditemukan') || data.message?.includes('not found')) {
                    errorMsg = 'Email tidak ditemukan. Pastikan email Anda sudah terdaftar.';
                } else if (data.message?.includes('tidak valid') || data.message?.includes('invalid')) {
                    errorMsg = 'Email tidak valid.';
                }

                setError(`❌ ${errorMsg}`);
            }
        } catch (error) {
            console.error('❌ Network error:', error);

            let errorMessage = 'Tidak dapat terhubung ke server. ';

            if (error.name === 'TypeError' || error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                errorMessage += `Periksa koneksi internet dan URL backend (${API_URL}).`;
            } else {
                errorMessage += 'Error: ' + error.message;
            }

            setError(`❌ ${errorMessage}`);
            setServerStatus('disconnected');
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateForm = () => {
        const { email, newPassword, confirmPassword } = formData;

        // Validasi email
        if (!email.trim()) {
            return '❌ Email wajib diisi';
        }

        if (!isValidEmail(email)) {
            return '❌ Harap masukkan alamat email yang valid';
        }

        // Validasi password baru
        if (!newPassword) {
            return '❌ Password baru wajib diisi';
        }

        if (newPassword.length < 6) {
            return '❌ Password minimal 6 karakter';
        }

        // Validasi confirm password
        if (!confirmPassword) {
            return '❌ Harap konfirmasi password baru Anda';
        }

        if (newPassword !== confirmPassword) {
            return '❌ Password tidak cocok';
        }

        // Validasi strength password
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);

        if (!hasUpperCase) {
            return '❌ Password harus mengandung minimal satu huruf besar (A-Z)';
        }

        if (!hasLowerCase) {
            return '❌ Password harus mengandung minimal satu huruf kecil (a-z)';
        }

        if (!hasNumbers) {
            return '❌ Password harus mengandung minimal satu angka (0-9)';
        }

        return null;
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleBackToLogin = () => {
        navigate('/login', {
            state: { email: formData.email }
        });
    };

    // Toggle password visibility
    const [showPassword, setShowPassword] = useState({
        newPassword: false,
        confirmPassword: false
    });

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Test connection function dengan error handling yang lebih baik
    const testConnection = async () => {
        setIsSubmitting(true);
        setError('');
        setMessage('');

        try {
            console.log('🔄 Testing connection to server...');

            // Timeout setelah 5 detik
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5001);

            const response = await fetch(`${API_URL}/auth/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Server connection successful:', data);
                setMessage('✅ Terhubung ke server! Server berjalan dengan baik.');
                setServerStatus('connected');
            } else {
                setError(`❌ Server error: ${response.status} ${response.statusText}`);
                setServerStatus('disconnected');
            }
        } catch (error) {
            console.error('❌ Connection test failed:', error);

            let errorMessage = '❌ Tidak dapat terhubung ke server. ';

            if (error.name === 'AbortError') {
                errorMessage += 'Permintaan timeout. Server mungkin tidak merespons.';
            } else if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                errorMessage += `
                1. Pastikan backend berjalan pada port 5001
                2. Cek apakah server berjalan dengan perintah: npm run dev
                3. Periksa koneksi internet Anda
                4. Coba refresh halaman ini`;
            } else {
                errorMessage += error.message;
            }

            setError(errorMessage);
            setServerStatus('disconnected');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="forgot-password-page">
            <div className="forgot-container">
                <div className="forgot-header">
                    <Link to="/login" className="back-button">
                        <span className="back-arrow">←</span>
                        Kembali ke Login
                    </Link>

                    <div className="logo">
                        <div className="logo-icon">☕</div>
                        <h1 className="logo-text">Matcha Cafe</h1>
                    </div>
                    <p className="forgot-subtitle">Reset Password Anda</p>
                </div>

                <div className="forgot-card">
                    <p className="instruction">
                        Masukkan email dan password baru untuk mereset password akun Anda.
                    </p>

                    {/* Server Status Indicator */}
                    <div className="server-status">
                        <div className="status-indicator">
                            <span className={`status-dot ${serverStatus === 'connected' ? 'connected' : serverStatus === 'disconnected' ? 'disconnected' : 'unknown'}`}></span>
                            <span className="status-text">
                                Status Server: {
                                    serverStatus === 'connected' ? '✅ Terhubung' :
                                        serverStatus === 'disconnected' ? '❌ Tidak Terhubung' :
                                            '🔍 Memeriksa...'
                                }
                            </span>
                        </div>

                        <button
                            type="button"
                            className="test-connection-btn"
                            onClick={testConnection}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Memeriksa...' : 'Test Koneksi Server'}
                        </button>
                    </div>

                    {/* Display Connection Error */}
                    {error && error.includes('Tidak dapat terhubung') && (
                        <div className="connection-error-message">
                            <span className="error-icon">⚠️</span>
                            <span className="error-text">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="forgot-form">
                        {error && !error.includes('Tidak dapat terhubung') && (
                            <div className="error-message">
                                <span className="error-icon">⚠️</span>
                                <span className="error-text">{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="success-message">
                                <span className="success-icon">✓</span>
                                <span className="success-text">{message}</span>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Alamat Email *
                            </label>
                            <div className="input-container">
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="email.anda@contoh.com"
                                    className="form-input"
                                    required
                                    disabled={isSubmitting}
                                    autoComplete="email"
                                />
                                <span className="input-icon">✉️</span>
                            </div>
                        </div>

                        {/* New Password Field */}
                        <div className="form-group">
                            <label htmlFor="newPassword" className="form-label">
                                Password Baru *
                            </label>
                            <div className="input-container password-container">
                                <input
                                    type={showPassword.newPassword ? "text" : "password"}
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan password baru"
                                    className="form-input"
                                    required
                                    disabled={isSubmitting}
                                    autoComplete="new-password"
                                />
                                <span className="input-icon">🔒</span>
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('newPassword')}
                                    disabled={isSubmitting}
                                >
                                    {showPassword.newPassword ? '🙈' : '👁️'}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {formData.newPassword && (
                                <div className="password-strength">
                                    <div className="strength-item">
                                        <span className={`strength-dot ${passwordStrength.hasLength ? 'strong' : 'weak'}`}></span>
                                        <span className="strength-text">Minimal 6 karakter</span>
                                    </div>
                                    <div className="strength-item">
                                        <span className={`strength-dot ${passwordStrength.hasUpperCase ? 'strong' : 'weak'}`}></span>
                                        <span className="strength-text">Huruf besar (A-Z)</span>
                                    </div>
                                    <div className="strength-item">
                                        <span className={`strength-dot ${passwordStrength.hasLowerCase ? 'strong' : 'weak'}`}></span>
                                        <span className="strength-text">Huruf kecil (a-z)</span>
                                    </div>
                                    <div className="strength-item">
                                        <span className={`strength-dot ${passwordStrength.hasNumber ? 'strong' : 'weak'}`}></span>
                                        <span className="strength-text">Angka (0-9)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Konfirmasi Password Baru *
                            </label>
                            <div className="input-container password-container">
                                <input
                                    type={showPassword.confirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Konfirmasi password baru Anda"
                                    className={`form-input ${formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? 'error' : ''}`}
                                    required
                                    disabled={isSubmitting}
                                    autoComplete="new-password"
                                />
                                <span className="input-icon">🔒</span>
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('confirmPassword')}
                                    disabled={isSubmitting}
                                >
                                    {showPassword.confirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>

                            {/* Password Match Indicator */}
                            {formData.confirmPassword && formData.newPassword && (
                                <div className="password-match">
                                    {formData.newPassword === formData.confirmPassword ? (
                                        <span className="match-success">✓ Password cocok</span>
                                    ) : (
                                        <span className="match-error">✗ Password tidak cocok</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary reset-btn"
                            disabled={isSubmitting || serverStatus !== 'connected'}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Mereset Password...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>

                    <div className="additional-options">
                        <p className="remember-password">
                            Ingat password Anda?{' '}
                            <button
                                type="button"
                                onClick={handleBackToLogin}
                                className="link-button"
                                disabled={isSubmitting}
                            >
                                Kembali ke Login
                            </button>
                        </p>
                    </div>
                </div>

                {/* Troubleshooting Guide */}
                <div className="troubleshooting-guide">
                    <h4>🔧 Pemecahan Masalah Koneksi Server:</h4>
                    <ol>
                        <li>Pastikan URL backend pada environment <code>REACT_APP_API_URL</code> sudah benar.</li>
                        <li>Cek status server di <a href={`${API_URL}/auth/health`} target="_blank" rel="noopener noreferrer">{API_URL}/auth/health</a></li>
                        <li>Coba restart server backend</li>
                        <li>Periksa koneksi internet Anda</li>
                        <li>Buka Developer Tools (F12) dan lihat Console untuk error detail</li>
                    </ol>
                </div>

                {/* Debug Info */}
                <div className="debug-info">
                    <h4>🔍 Informasi Debug:</h4>
                    <p><strong>Server URL:</strong> {API_URL}</p>
                    <p><strong>Reset Password Endpoint:</strong> POST /api/auth/reset-password</p>
                    <p><strong>Health Check Endpoint:</strong> GET /api/auth/health</p>
                    <p><strong>Status Server:</strong> {serverStatus}</p>
                </div>

                {/* Footer */}
                <div className="forgot-footer">
                    <p className="copyright">
                        © {new Date().getFullYear()} Matcha Cafe. Hak cipta dilindungi.
                    </p>
                </div>
            </div>
        </div>
    );
};
