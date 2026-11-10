// frontend/src/services/api.js
// Versi lengkap + diperbaiki 100% sesuai server.js yang kamu kirim
// Base URL disesuaikan: http://localhost:5001/api

export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

// Helper function untuk mendapatkan token dari localStorage
const getAuthToken = () => {
    return localStorage.getItem('token');
};

// Helper function untuk request dengan auth header
const fetchWithAuth = async (url, options = {}) => {
    const token = getAuthToken();

    // Default headers (untuk JSON requests)
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`🌐 Fetching: ${url}`, { method: options.method || 'GET' });

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        });

        console.log(`📥 Response status: ${response.status} for ${url}`);

        // Handle 401 Unauthorized (token absent/expired)
        if (response.status === 401) {
            console.warn('⚠️ Unauthorized access - token might be invalid or expired');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            throw new Error('Unauthorized - Please login again');
        }

        return response;
    } catch (error) {
        console.error(`❌ Fetch error for ${url}:`, error);
        throw error;
    }
};

// Fungsi khusus untuk upload file (tanpa Content-Type header)
const fetchWithAuthFormData = async (url, formData, method = 'POST') => {
    const token = getAuthToken();

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`🌐 Uploading file to: ${url}`);

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: formData,
            credentials: 'include'
        });

        console.log(`📥 Upload response status: ${response.status}`);

        if (response.status === 401) {
            console.warn('⚠️ Unauthorized access during upload');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            throw new Error('Unauthorized - Please login again');
        }

        return response;
    } catch (error) {
        console.error(`❌ Upload error for ${url}:`, error);
        throw error;
    }
};

const api = {
    // Health check
    health: async () => {
        try {
            const response = await fetch(`${API_URL}/health`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Health check error:', error);
            return { success: false, status: 'ERROR', message: 'Backend server is not responding' };
        }
    },

    // ======================
    // PRODUCTS ENDPOINTS
    // ======================
    getProducts: async () => {
        try {
            const response = await fetch(`${API_URL}/products`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get products error:', error);
            return { success: false, error: 'Failed to fetch products' };
        }
    },

    getProductById: async (id) => {
        try {
            const response = await fetch(`${API_URL}/products/${id}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get product by id error:', error);
            return { success: false, error: 'Failed to fetch product' };
        }
    },

    // ======================
    // CATEGORIES ENDPOINTS
    // ======================
    getCategories: async () => {
        try {
            const response = await fetch(`${API_URL}/categories`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get categories error:', error);
            return { success: false, error: 'Failed to fetch categories' };
        }
    },

    // ======================
    // DATABASE CART ENDPOINTS - SESUAI AppContext.js
    // ======================

    // Get cart dari database (user must be authenticated)
    getCart: async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cart`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('🛒 Cart data from DB:', data);
            return data;
        } catch (error) {
            console.error('❌ Get cart from DB error:', error);
            return { success: false, error: 'Failed to fetch cart from database', data: [] };
        }
    },

    // Add item to cart di database - SESUAI AppContext.js
    // AppContext memanggil: addToCart({ productId, quantity })
    addToCart: async (data) => {
        try {
            const { productId, quantity = 1 } = data;
            console.log('📤 API addToCart called', { productId, quantity });

            const response = await fetchWithAuth(`${API_URL}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ productId, quantity })
            });

            const result = await response.json();
            console.log('📥 Add to cart DB response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Add to cart DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to add item to cart in database'
            };
        }
    },

    // Update quantity in cart - SESUAI AppContext.js
    // AppContext memanggil: updateCartItem(productId, quantity)
    updateCartItem: async (productId, quantity) => {
        try {
            console.log('📤 API updateCartItem called', { productId, quantity });

            const response = await fetchWithAuth(`${API_URL}/cart/update/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity })
            });

            const result = await response.json();
            console.log('📥 Update cart item DB response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Update cart item DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to update cart item in database'
            };
        }
    },

    // Remove item from cart - SESUAI AppContext.js
    // AppContext memanggil: removeFromCart(productId)
    removeFromCart: async (productId) => {
        try {
            console.log('📤 API removeFromCart called', { productId });

            const response = await fetchWithAuth(`${API_URL}/cart/remove/${productId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log('📥 Remove from cart DB response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Remove from cart DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to remove item from cart in database'
            };
        }
    },

    // Clear cart
    clearCart: async () => {
        try {
            console.log('📤 API clearCart called');
            const response = await fetchWithAuth(`${API_URL}/cart/clear`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log('📥 Clear cart DB response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Clear cart DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to clear cart in database'
            };
        }
    },

    // Sync entire cart (untuk bulk update) - REQUIRED oleh AppContext.js
    syncCart: async (data) => {
        try {
            const { items } = data;
            console.log('📤 API syncCart called', { items });

            const response = await fetchWithAuth(`${API_URL}/cart/sync`, {
                method: 'POST',
                body: JSON.stringify({ items })
            });

            const result = await response.json();
            console.log('📥 Sync cart DB response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Sync cart DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to sync cart in database'
            };
        }
    },

    // ======================
    // FAVORITES ENDPOINTS
    // ======================

    getFavorites: async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/favorites`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get favorites error:', error);
            return { success: false, error: 'Failed to fetch favorites' };
        }
    },

    addToFavorites: async (data) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/favorites/add`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Add favorite error:', error);
            return { success: false, error: 'Failed to add favorite' };
        }
    },

    removeFromFavorites: async (productId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/favorites/remove/${productId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Remove favorite error:', error);
            return { success: false, error: 'Failed to remove favorite' };
        }
    },

    // ======================
    // ORDERS ENDPOINTS
    // ======================

    createOrder: async (orderData) => {
        try {
            console.log('📦 API: Creating order in DB with data:', orderData);

            const response = await fetchWithAuth(`${API_URL}/orders/create`, {
                method: 'POST',
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            console.log('📥 Create order DB response:', result);

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Create order DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create order in database'
            };
        }
    },

    getOrders: async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/orders`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get orders DB error:', error);
            return { success: false, error: 'Failed to fetch orders from database' };
        }
    },

    getOrderById: async (orderId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/orders/${orderId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get order by id DB error:', error);
            return { success: false, error: 'Failed to fetch order details from database' };
        }
    },

    getUserOrders: async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/orders/my-orders`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Get user orders DB error:', error);
            return { success: false, error: 'Failed to fetch user orders from database' };
        }
    },

    updateOrderStatus: async (orderId, status) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });

            const result = await response.json();
            console.log('📥 Update order status DB response:', result);

            if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);
            return result;
        } catch (error) {
            console.error('❌ Update order status DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to update order status in database'
            };
        }
    },

    cancelOrder: async (orderId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/cancel`, {
                method: 'PUT'
            });

            const result = await response.json();
            console.log('📥 Cancel order DB response:', result);

            if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);
            return result;
        } catch (error) {
            console.error('❌ Cancel order DB error:', error);
            return {
                success: false,
                error: error.message || 'Failed to cancel order in database'
            };
        }
    },

    updatePaymentStatus: async (orderId, paymentStatus) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/orders/${orderId}/payment`, {
                method: 'PUT',
                body: JSON.stringify({ payment_status: paymentStatus })
            });

            const result = await response.json();
            console.log('📥 Update payment status response:', result);

            if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);
            return result;
        } catch (error) {
            console.error('❌ Update payment status error:', error);
            return {
                success: false,
                error: error.message || 'Failed to update payment status'
            };
        }
    },

    // ======================
    // AUTH & PROFILE FUNCTIONS
    // ======================

    login: async (credentials) => {
        console.log('🔐 API: Login attempt for:', credentials.email);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();
            console.log('📥 API login response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    token: result.token,
                    user: result.user || result.data,
                    message: result.message || 'Login successful'
                };
            } else {
                console.warn('⚠️ Login failed via API:', result.error || result);
                return {
                    success: false,
                    error: result.error || result.message || 'Login failed'
                };
            }
        } catch (error) {
            console.error('❌ API login error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    },

    register: async (userData) => {
        console.log('📝 API: Register attempt for:', userData.email);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            console.log('📥 API register response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    token: result.token,
                    user: result.user,
                    message: result.message || 'Registration successful'
                };
            } else {
                console.warn('⚠️ Registration failed via API:', result.error || result);
                return {
                    success: false,
                    error: result.error || result.message || 'Registration failed'
                };
            }
        } catch (error) {
            console.error('❌ API register error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    },

    getProfile: async () => {
        console.log('👤 API: Getting profile...');

        try {
            const response = await fetchWithAuth(`${API_URL}/auth/profile`);
            const result = await response.json();
            console.log('📥 API getProfile response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    user: result.user || result.data
                };
            } else {
                console.warn('⚠️ Get profile failed via API:', result.error || result);
                return getProfileLocalFallback(result.error || 'API error');
            }
        } catch (error) {
            console.error('❌ API getProfile error:', error);
            return getProfileLocalFallback('Network error');
        }
    },

    updateProfile: async (profileData) => {
        console.log('🔄 API: updateProfile called with:', profileData);

        try {
            const response = await fetchWithAuth(`${API_URL}/auth/update-profile`, {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            const result = await response.json();
            console.log('📥 API updateProfile response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    user: result.user || result.data,
                    message: result.message || 'Profile updated successfully'
                };
            } else {
                console.warn('⚠️ API updateProfile failed:', result.error || result);
                return updateProfileLocalFallback(profileData, result.error || 'API error');
            }
        } catch (error) {
            console.error('❌ API updateProfile error:', error);
            return updateProfileLocalFallback(profileData, 'Network error');
        }
    },

    changePassword: async (passwordData) => {
        console.log('🔐 API: changePassword called');

        try {
            const response = await fetchWithAuth(`${API_URL}/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify(passwordData)
            });

            const result = await response.json();
            console.log('📥 API changePassword response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    message: result.message || 'Password changed successfully'
                };
            } else {
                return {
                    success: false,
                    error: result.error || result.message || 'Failed to change password'
                };
            }
        } catch (error) {
            console.error('❌ API changePassword error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    },

    uploadProfilePhoto: async (formData) => {
        console.log('📤 API: uploadProfilePhoto called');

        try {
            const response = await fetchWithAuthFormData(`${API_URL}/auth/upload-profile-photo`, formData);
            const result = await response.json();
            console.log('📥 API uploadProfilePhoto response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    photoUrl: result.photoUrl || result.user?.profile_image,
                    user: result.user || result.data,
                    message: result.message || 'Profile photo uploaded successfully'
                };
            } else {
                return {
                    success: false,
                    error: result.error || result.message || 'Failed to upload photo'
                };
            }
        } catch (error) {
            console.error('❌ API uploadProfilePhoto error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    },

    deleteProfilePhoto: async () => {
        console.log('🗑️ API: deleteProfilePhoto called');

        try {
            const response = await fetchWithAuth(`${API_URL}/auth/delete-profile-photo`, {
                method: 'DELETE'
            });
            const result = await response.json();
            console.log('📥 API deleteProfilePhoto response:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    user: result.user || result.data,
                    message: result.message || 'Profile photo deleted successfully'
                };
            } else {
                return {
                    success: false,
                    error: result.error || result.message || 'Failed to delete photo'
                };
            }
        } catch (error) {
            console.error('❌ API deleteProfilePhoto error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    },

    // ======================
    // TESTING ENDPOINTS
    // ======================

    testDB: async () => {
        try {
            const response = await fetch(`${API_URL}/test-db`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Test DB error:', error);
            return { success: false, error: 'Failed to test database connection' };
        }
    },

    testUploads: async () => {
        try {
            const response = await fetch(`${API_URL}/test-uploads`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Test uploads error:', error);
            return { success: false, error: 'Failed to test uploads directory' };
        }
    }
};

// ======================
// HELPER FUNCTIONS (Local fallback untuk profile/update)
// ======================

const getProfileLocalFallback = (originalError = '') => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            return { success: false, error: 'User data not found in localStorage' };
        }
        const user = JSON.parse(userStr);
        console.log('✅ Using localStorage fallback for profile');
        return {
            success: true,
            user,
            message: originalError ? `Profile loaded from local storage (${originalError})` : 'Profile loaded from local storage'
        };
    } catch (error) {
        console.error('❌ LocalStorage fallback error:', error);
        return { success: false, error: 'Failed to load profile from localStorage' };
    }
};

const updateProfileLocalFallback = (profileData, originalError = '') => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            return { success: false, message: 'User data not found in localStorage' };
        }
        const user = JSON.parse(userStr);
        const updatedUser = {
            ...user,
            name: profileData.name?.trim() || user.name,
            phone: profileData.phone?.trim() || user.phone || '',
            address: profileData.address?.trim() || user.address || '',
            updated_at: new Date().toISOString()
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ LocalStorage fallback successful:', updatedUser);
        return {
            success: true,
            user: updatedUser,
            message: originalError ? `Profile saved locally (${originalError})` : 'Profile updated successfully (local storage)'
        };
    } catch (error) {
        console.error('❌ LocalStorage fallback error:', error);
        return { success: false, message: 'Failed to update profile locally' };
    }
};

export { api };
