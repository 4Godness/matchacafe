import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext'; // GANTI: useAppContext -> useApp
import "./Profil.css";

const Profile = () => {
  const navigate = useNavigate();
  const context = useApp(); // Tetap gunakan useApp() karena di AppContext.js export useApp

  console.log('🔍 Profile context:', {
    user: context?.user,
    isLoading: context?.isLoading
  });

  // State untuk mencegah redirect
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Ambil user dari context atau localStorage
  const [localUser, setLocalUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Gunakan user dari context jika ada, fallback ke localUser
  const currentUser = context?.user || localUser;

  // Hanya redirect ke login jika BENAR-BENAR tidak ada user
  useEffect(() => {
    console.log('🔄 Checking user for redirect:', {
      contextUser: context?.user,
      localUser: localUser,
      currentUser: currentUser,
      isSaving: isSavingProfile
    });

    if (!currentUser && !isSavingProfile) {
      console.log('⚠️ No user found, redirecting to login');
      navigate('/login');
    } else if (currentUser) {
      console.log('✅ User found:', currentUser.name);
    }
  }, [currentUser, navigate, isSavingProfile]);

  const [activeTab, setActiveTab] = useState('profile');
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    specialOffers: false
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'english';
  });
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);

  // Update editData when user changes
  useEffect(() => {
    console.log('🔄 Updating profile data from user:', currentUser);

    if (currentUser && (currentUser.name || currentUser.email)) {
      setEditData({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        address: currentUser.address || ''
      });

      const photoSource =
        currentUser.profilePhoto ||
        currentUser.profile_image ||
        localStorage.getItem('profilePhoto') ||
        null;

      setProfilePhoto(photoSource);
      setProfileLoading(false);

      console.log('✅ Profile data loaded:', {
        name: currentUser.name,
        phone: currentUser.phone,
        address: currentUser.address
      });
    } else {
      setTimeout(() => {
        setProfileLoading(false);
      }, 2000);
    }
  }, [currentUser]);

  // Auto-hide messages
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Panggil logout dengan parameter false agar tidak langsung redirect
      if (context?.logout) {
        context.logout(false);
        // Kemudian manual navigate ke login
        setTimeout(() => {
          navigate('/login');
        }, 100);
      } else {
        navigate('/login');
      }
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleTogglePreference = (preference) => {
    setPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference]
    }));
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLanguageRegion = () => {
    setShowLanguageModal(true);
  };

  // HANDLE SUBMIT PROFILE
  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsSavingProfile(true);
    setErrorMessage('');
    setSuccessMessage('');

    console.log('🔄 Starting profile update...');

    if (!editData.name.trim()) {
      setErrorMessage('Full Name is required');
      setLoading(false);
      setIsSavingProfile(false);
      return;
    }

    try {
      // Gunakan updateProfile dari context jika ada
      if (context?.updateProfile && typeof context.updateProfile === 'function') {
        console.log('📤 Using updateProfile from context...');

        const result = await context.updateProfile({
          name: editData.name.trim(),
          phone: editData.phone.trim(),
          address: editData.address.trim()
        });

        console.log('📥 Update result:', result);

        if (result.success) {
          setSuccessMessage('✅ Profile updated successfully!');

          // Update local user
          if (result.user) {
            setLocalUser(result.user);
          }

          // Close modal after success
          setTimeout(() => {
            setShowEditProfile(false);
            setIsSavingProfile(false);
            setLoading(false);
          }, 1500);
        } else {
          throw new Error(result.error || 'Failed to update profile');
        }
      } else {
        // Fallback ke localStorage
        console.log('🔄 Using localStorage fallback...');

        const updatedUser = {
          ...currentUser,
          name: editData.name.trim(),
          phone: editData.phone.trim(),
          address: editData.address.trim(),
          updated_at: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        setLocalUser(updatedUser);

        setSuccessMessage('✅ Profile updated successfully! (Local storage)');

        setTimeout(() => {
          setShowEditProfile(false);
          setIsSavingProfile(false);
          setLoading(false);
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Profile update error:', error);
      setErrorMessage(`❌ ${error.message || 'Failed to update profile'}`);
      setIsSavingProfile(false);
      setLoading(false);
    }
  };

  // Handle password change
  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    if (!passwordData.currentPassword) {
      setErrorMessage('Current password is required');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New password and confirmation do not match');
      setLoading(false);
      return;
    }

    try {
      // Simulasi perubahan password untuk demo
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccessMessage('✅ Password changed successfully! (Demo mode)');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => {
        setShowChangePassword(false);
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('❌ Password change error:', error);
      setErrorMessage('❌ Error changing password');
      setLoading(false);
    }
  };

  // Handle language change
  const handleSubmitLanguage = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      localStorage.setItem('appLanguage', language);

      // Update local user jika ada
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUserData = JSON.parse(userStr);
        const updatedUser = {
          ...currentUserData,
          language: language,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setLoading(false);
      setSuccessMessage(`✅ Language changed to: ${getLanguageName(language)}`);

      setTimeout(() => {
        setShowLanguageModal(false);
      }, 1500);
    } catch (error) {
      console.error('❌ Language change error:', error);
      setErrorMessage('❌ Failed to change language');
      setLoading(false);
    }
  };

  const getLanguageName = (code) => {
    const languages = {
      english: 'English',
      indonesian: 'Indonesian',
      spanish: 'Spanish',
      french: 'French'
    };
    return languages[code] || code;
  };

  // Simple photo upload
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setErrorMessage('Please select an image file (JPEG, PNG, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      setProfilePhoto(imageUrl);

      // Save to localStorage
      localStorage.setItem('profilePhoto', imageUrl);

      // Update user data
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUserData = JSON.parse(userStr);
        const updatedUser = {
          ...currentUserData,
          profilePhoto: imageUrl,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setLocalUser(updatedUser);
      }

      setSuccessMessage('✅ Profile photo updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (window.confirm('Are you sure you want to remove your profile photo?')) {
      setProfilePhoto(null);
      localStorage.removeItem('profilePhoto');

      // Update user data
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUserData = JSON.parse(userStr);
        delete currentUserData.profilePhoto;
        localStorage.setItem('user', JSON.stringify(currentUserData));
        setLocalUser(currentUserData);
      }

      setSuccessMessage('✅ Profile photo removed');
    }
  };

  const handleViewAllOrders = () => {
    // Navigate to orders page or show all orders
    alert('View all orders feature would go here');
  };

  // Get orders and favorites from context
  const orders = Array.isArray(context?.orders) ? context.orders : [];
  const favorites = Array.isArray(context?.favorites) ? context.favorites : [];
  const cart = Array.isArray(context?.cart) ? context.cart : [];

  const recentOrders = orders.slice(0, 3);

  // Show loading
  if (profileLoading) {
    return (
      <div className="profil">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!currentUser) {
    return (
      <div className="profil">
        <div className="no-user-container">
          <div className="no-user-icon">👤</div>
          <h2>No User Found</h2>
          <p>Please login to view your profile</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profil">
      {/* Modal Edit Profile */}
      {showEditProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditProfile(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="alert alert-error">{errorMessage}</div>
            )}
            {successMessage && (
              <div className="alert alert-success">{successMessage}</div>
            )}

            <form onSubmit={handleSubmitProfile}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleProfileChange}
                  placeholder="Enter your name"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="disabled-input"
                />
                <small className="form-text">Email cannot be changed</small>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter your phone number"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={editData.address}
                  onChange={handleProfileChange}
                  placeholder="Enter your address"
                  rows="3"
                  disabled={loading}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditProfile(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Change Password */}
      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button
                className="modal-close"
                onClick={() => setShowChangePassword(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="alert alert-error">{errorMessage}</div>
            )}
            {successMessage && (
              <div className="alert alert-success">{successMessage}</div>
            )}

            <form onSubmit={handleSubmitPasswordChange}>
              <div className="form-group">
                <label>Current Password *</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowChangePassword(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Profile Content */}
      <div className="profil-header">
        <button className="back-btn" onClick={handleBackToHome}>
          ← Back to Home
        </button>
        <h1 className="profil-title">My Profile</h1>
        <div className="header-spacer"></div>
      </div>

      <div className="profil-content">
        {/* User Profile Card */}
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar-container" onClick={handlePhotoClick}>
              <div className="avatar">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={currentUser?.name || 'User'}
                    className="avatar-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.querySelector('.avatar-text').style.display = 'flex';
                    }}
                  />
                ) : null}
                <span className="avatar-text" style={{ display: profilePhoto ? 'none' : 'flex' }}>
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <div className="avatar-overlay">
                  <span className="edit-photo-icon">📷</span>
                  <span className="edit-photo-text">Edit</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
            <div className="profile-info">
              <h2 className="user-name">{currentUser?.name || 'No Name'}</h2>
              <p className="user-email">
                <span className="label">Email:</span> {currentUser?.email || 'No email'}
              </p>
              <p className="user-phone">
                <span className="label">Phone:</span> {currentUser?.phone || 'Not set'}
              </p>
              <p className="user-address">
                <span className="label">Address:</span> {currentUser?.address || 'Not set'}
              </p>
              <p className="user-language">
                <span className="label">Language:</span> {getLanguageName(language)}
              </p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-number">{orders.length}</div>
              <div className="stat-label">Orders</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{favorites.length}</div>
              <div className="stat-label">Favorites</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{cart.length}</div>
              <div className="stat-label">Cart Items</div>
            </div>
          </div>

          {profilePhoto && (
            <button
              className="btn-remove-photo"
              onClick={handleRemovePhoto}
              title="Remove profile photo"
            >
              Remove Photo
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-navigation">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile & Settings
          </button>
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'profile' && (
            <div className="tab-panel">
              {/* Personal Information */}
              <div className="info-section">
                <div className="section-header">
                  <h3 className="section-title">Personal Information</h3>
                  <button
                    className="btn-edit-section"
                    onClick={handleEditProfile}
                  >
                    Edit
                  </button>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">{currentUser?.name || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value">{currentUser?.email || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{currentUser?.phone || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Address</span>
                    <span className="info-value">
                      {currentUser?.address || 'Not set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="settings-section">
                <h3 className="section-title">Account Settings</h3>

                <div className="settings-list">
                  <button
                    className="setting-item"
                    onClick={handlePhotoClick}
                  >
                    <span className="setting-icon">📷</span>
                    <div className="setting-details">
                      <span className="setting-text">Profile Photo</span>
                      <span className="setting-description">Update your profile picture</span>
                    </div>
                    <span className="setting-arrow">›</span>
                  </button>

                  <button
                    className="setting-item"
                    onClick={handleEditProfile}
                  >
                    <span className="setting-icon">👤</span>
                    <div className="setting-details">
                      <span className="setting-text">Edit Profile</span>
                      <span className="setting-description">Update your personal information</span>
                    </div>
                    <span className="setting-arrow">›</span>
                  </button>

                  <button
                    className="setting-item"
                    onClick={handleChangePassword}
                  >
                    <span className="setting-icon">🔒</span>
                    <div className="setting-details">
                      <span className="setting-text">Change Password</span>
                      <span className="setting-description">Update your password for security</span>
                    </div>
                    <span className="setting-arrow">›</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone">
                <h3 className="section-title">Danger Zone</h3>
                <div className="danger-actions">
                  <button
                    className="btn-danger btn-logout"
                    onClick={handleLogout}
                  >
                    <span className="danger-icon">🚪</span>
                    <span className="danger-text">Logout Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="tab-panel">
              <div className="orders-section">
                <div className="section-header">
                  <h3 className="section-title">Recent Orders</h3>
                  {orders.length > 0 && (
                    <button
                      className="btn-view-all"
                      onClick={handleViewAllOrders}
                    >
                      View All Orders
                    </button>
                  )}
                </div>

                {recentOrders.length > 0 ? (
                  <div className="orders-list">
                    {recentOrders.map((order, index) => (
                      <div key={index} className="order-card">
                        <div className="order-header">
                          <div className="order-info">
                            <span className="order-id">Order #{order.id || index + 1}</span>
                            <span className="order-date">
                              {order.date
                                ? new Date(order.date).toLocaleDateString()
                                : new Date().toLocaleDateString()}
                            </span>
                          </div>
                          <span className={`order-status ${order.status || 'pending'}`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                        <div className="order-footer">
                          <span className="order-total">
                            Total: ${order.total || order.amount || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-orders">
                    <div className="no-orders-icon">📦</div>
                    <h4>No Orders Yet</h4>
                    <p>You haven't placed any orders yet</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/home')}
                    >
                      Start Shopping
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Messages */}
      {(errorMessage || successMessage) && !showEditProfile && !showChangePassword && (
        <div className={`global-message ${errorMessage ? 'error' : 'success'}`}>
          {errorMessage || successMessage}
        </div>
      )}

      {/* BOTTOM NAVIGATION */}
      <div className="bottom-nav-container">
        <nav className="bottom-nav">
          <button className="nav-item" onClick={() => navigate('/home')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          <button className="nav-item" onClick={() => navigate('/cart')}>
            <span className="nav-icon">🛒</span>
            <span className="nav-label">Cart</span>
            {cart.length > 0 && (
              <span className="cart-badge">{cart.length}</span>
            )}
          </button>
          <button className="nav-item" onClick={() => navigate('/like')}>
            <span className="nav-icon">❤️</span>
            <span className="nav-label">Favorites</span>
            {favorites.length > 0 && (
              <span className="favorite-badge">{favorites.length}</span>
            )}
          </button>
          <button className="nav-item active">
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Profile;