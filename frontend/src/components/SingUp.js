// src/components/SingUp.js
import React, { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./SingUp.css";

export const SingUp = () => {
  const navigate = useNavigate();
  const { register, state = { isLoading: false } } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear specific error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional)
    if (formData.phone && !/^[0-9+\-\s()]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password should contain letters and numbers';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    try {
      // Prepare user data for backend
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || '',
        password: formData.password
      };

      console.log('📝 Attempting registration with:', userData);

      // Call register function from AppContext (which calls backend API)
      const result = await register(userData);

      if (result.success) {
        console.log('✅ Registration successful:', result.user);

        // Clear form
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });

        // Navigate to home
        navigate('/home');

      } else {
        // Show server error
        setServerError(result.error || 'Registration failed. Please try again.');
        console.error('❌ Registration failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      setServerError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="sing-up">
      <div className="sing-up-container">
        <div className="sing-up-header">
          <Link to="/login" className="back-button">
            <span className="back-arrow">←</span>
            Back to login
          </Link>
          <div className="logo">
            <div className="logo-icon">☕</div>
            <h1 className="logo-text">Create Account</h1>
          </div>
          <p className="sing-up-subtitle">Join our community today!</p>
        </div>

        <form onSubmit={handleSignUp} className="sing-up-form">
          {/* Server Error */}
          {serverError && (
            <div className="error-message server-error">
              <span className="error-icon">⚠️</span>
              {serverError}
            </div>
          )}

          {/* Name Field */}
          <div className="form-group">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name *"
              className={`form-input ${errors.name ? 'error' : ''}`}
              required
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email Address *"
              className={`form-input ${errors.email ? 'error' : ''}`}
              required
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {/* Phone Field */}
          <div className="form-group">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone Number (optional)"
              className={`form-input ${errors.phone ? 'error' : ''}`}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password * (min. 6 characters)"
              className={`form-input ${errors.password ? 'error' : ''}`}
              required
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
            <div className="password-hints">
              <small>Must be at least 6 characters with letters and numbers</small>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm Password *"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              required
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="terms-section">
            <label className="terms-checkbox">
              <input type="checkbox" required />
              <span className="checkmark"></span>
              <span className="terms-text">
                I agree to the{' '}
                <Link to="/terms" className="terms-link">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="terms-link">Privacy Policy</Link>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary sing-up-btn"
            disabled={state.isLoading}
          >
            {state.isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">
          <span className="divider-text">or</span>
        </div>

        {/* Social Login Options */}
        <div className="social-login">
          <p className="social-text">Sign up with</p>
          <div className="social-buttons">
            <button className="social-btn google-btn">
              <span className="social-icon">G</span>
              Google
            </button>
            <button className="social-btn facebook-btn">
              <span className="social-icon">f</span>
              Facebook
            </button>
          </div>
        </div>

        {/* Login Link */}
        <div className="sing-up-footer">
          <p className="login-text">
            Already have an account?{' '}
            <Link to="/login" className="login-link">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};