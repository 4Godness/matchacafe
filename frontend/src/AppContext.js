import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from './services/api';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    console.warn('useApp must be used within AppProvider. Returning default values.');

    // Return default values untuk mencegah error
    return {
      // State - SEMUA DI ROOT LEVEL
      user: null,
      loading: false,
      isLoading: false,
      products: [],
      categories: [],
      cart: [],
      favorites: [],
      orders: [],
      currentCategory: 'All',
      authToken: null,
      error: null,
      cartTotal: 0,
      cartCount: 0,
      isUpdatingProfile: false,
      paymentMethod: 'cash_on_delivery',
      checkoutData: null,
      activeOrder: null,
      isCartSyncing: false,

      // Auth functions
      login: async () => ({ success: false, error: 'Context not available' }),
      register: async () => ({ success: false, error: 'Context not available' }),
      logout: () => { },
      updateProfile: async () => ({ success: false, error: 'Context not available' }),

      // Cart functions
      addToCart: async () => ({ success: false, error: 'Context not available' }),
      removeFromCart: async () => ({ success: false, error: 'Context not available' }),
      updateQuantity: async () => ({ success: false, error: 'Context not available' }),
      clearCart: async () => ({ success: false, error: 'Context not available' }),
      getCartItemById: () => null,
      loadCartFromDatabase: async () => [],
      syncPendingUpdates: async () => { },
      saveCartToDatabase: async () => ({ success: false }),

      // Favorite functions
      addToFavorites: async () => ({ success: false, error: 'Context not available' }),
      removeFromFavorites: async () => ({ success: false, error: 'Context not available' }),
      toggleFavorite: async () => ({ success: false, error: 'Context not available' }),
      isProductInFavorites: () => false,
      loadUserFavorites: async () => { },

      // Checkout functions
      saveCheckoutData: () => ({ success: false }),
      clearCheckoutData: () => ({ success: false }),

      // Order functions
      addOrder: async () => ({ success: false, error: 'Context not available' }),
      createOrder: async () => ({ success: false, error: 'Context not available' }),
      loadUserOrders: async () => { },

      // UI functions
      setPaymentMethod: () => { },
      setCurrentCategory: () => { },

      // Utility
      updateState: () => { }
    };
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Initial state dengan semua properti yang diperlukan
  const [state, setState] = useState(() => {
    // Ambil data dari localStorage untuk initial state
    try {
      const savedCart = localStorage.getItem('cart');
      const savedFavorites = localStorage.getItem('favorites');
      const savedCheckoutData = localStorage.getItem('checkoutData');
      const savedUser = localStorage.getItem('user');

      return {
        user: savedUser ? JSON.parse(savedUser) : null,
        loading: true,
        isLoading: false,
        products: [],
        categories: [],
        cart: savedCart ? JSON.parse(savedCart) : [],
        favorites: savedFavorites ? JSON.parse(savedFavorites) : [],
        orders: [],
        currentCategory: 'All',
        authToken: localStorage.getItem('token'),
        error: null,
        isUpdatingProfile: false,
        paymentMethod: localStorage.getItem('paymentMethod') || 'cash_on_delivery',
        checkoutData: savedCheckoutData ? JSON.parse(savedCheckoutData) : null,
        activeOrder: null,
        isCartSyncing: false,
        lastCartSync: null
      };
    } catch (error) {
      console.error('Error initializing state:', error);
      return {
        user: null,
        loading: true,
        isLoading: false,
        products: [],
        categories: [],
        cart: [],
        favorites: [], // PASTIKAN favorites selalu array
        orders: [],
        currentCategory: 'All',
        authToken: null,
        error: null,
        isUpdatingProfile: false,
        paymentMethod: 'cash_on_delivery',
        checkoutData: null,
        activeOrder: null,
        isCartSyncing: false,
        lastCartSync: null
      };
    }
  });

  // Destructuring dengan default values untuk menghindari undefined
  const {
    user = null,
    loading = false,
    isLoading = false,
    products = [],
    categories = [],
    cart = [],
    favorites = [], // DEFAULT VALUE PENTING!
    orders = [],
    currentCategory = 'All',
    authToken = null,
    error = null,
    isUpdatingProfile = false,
    paymentMethod = 'cash_on_delivery',
    checkoutData = null,
    activeOrder = null,
    isCartSyncing = false,
    lastCartSync = null
  } = state || {};

  const updateState = useCallback((updates) => {
    console.log('🔄 updateState called with:', updates);
    setState(prev => {
      if (!prev) {
        console.warn('State is undefined, initializing...');
        return {
          user: null,
          loading: false,
          isLoading: false,
          products: [],
          categories: [],
          cart: [],
          favorites: [],
          orders: [],
          currentCategory: 'All',
          authToken: null,
          error: null,
          isUpdatingProfile: false,
          paymentMethod: 'cash_on_delivery',
          checkoutData: null,
          activeOrder: null,
          isCartSyncing: false,
          lastCartSync: null,
          ...updates
        };
      }
      const newState = { ...prev, ...updates };
      console.log('📝 State updated:', {
        oldCartLength: prev.cart?.length || 0,
        newCartLength: newState.cart?.length || 0,
        oldFavoritesLength: prev.favorites?.length || 0,
        newFavoritesLength: newState.favorites?.length || 0
      });

      // Update localStorage untuk cart
      if (updates.cart !== undefined) {
        localStorage.setItem('cart', JSON.stringify(newState.cart));
      }

      return newState;
    });
  }, []);

  // ======================
  // DATABASE CART SYNC FUNCTIONS
  // ======================

  const normalizeCartFromApi = useCallback((res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.cart)) return res.cart;
    if (Array.isArray(res.items)) return res.items;
    if (res.data && Array.isArray(res.data.cart)) return res.data.cart;
    if (res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
  }, []);

  const getCartItemById = useCallback((productId) => {
    const currentCart = Array.isArray(cart) ? cart : [];
    return currentCart.find(item => {
      const itemId = item.id || item.product_id || item.productId;
      return itemId == productId;
    });
  }, [cart]);

  const formatProductForCart = useCallback((product, quantity = 1) => {
    const productId = product.id || product.product_id || product.productId;

    return {
      id: productId,
      product_id: productId,
      name: product.name || product.product_name || 'Produk',
      price: product.price || 0,
      image: product.image || product.image_url || product.thumbnail || '',
      description: product.description || '',
      category: product.category || product.category_name || product.category_id || '',
      quantity: Math.max(1, parseInt(quantity) || 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, []);

  const loadCartFromDatabase = useCallback(async (force = false) => {
    if (!user?.id) return cart || [];

    if (!force && lastCartSync && (Date.now() - lastCartSync < 30000)) {
      console.log('⏭️ Skip cart sync - already synced recently');
      return cart || [];
    }

    try {
      updateState({ isCartSyncing: true });
      console.log('🔄 Loading cart from database...');

      const response = await api.getCart();
      console.log('📥 Database cart response:', response);

      if (response.success) {
        const normalizedCart = normalizeCartFromApi(response);
        const pendingUpdates = JSON.parse(localStorage.getItem('pending_cart_updates') || '[]');
        let finalCart = normalizedCart;

        if (pendingUpdates.length > 0) {
          console.log(`🔄 Found ${pendingUpdates.length} pending updates, applying...`);
          finalCart = applyPendingUpdates(normalizedCart, pendingUpdates);
        }

        updateState({
          cart: finalCart,
          lastCartSync: Date.now()
        });

        if (finalCart.length > 0) {
          localStorage.setItem('cart', JSON.stringify(finalCart));
        } else {
          localStorage.removeItem('cart');
        }

        console.log('✅ Cart loaded from database:', finalCart.length, 'items');
        return finalCart;
      } else {
        console.warn('❌ Failed to load cart from database:', response.error);
        return fallbackToLocalCart();
      }
    } catch (error) {
      console.error('❌ Error loading cart from database:', error);
      return fallbackToLocalCart();
    } finally {
      updateState({ isCartSyncing: false });
    }
  }, [user, cart, lastCartSync, updateState, normalizeCartFromApi]);

  const fallbackToLocalCart = useCallback(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          console.log('🔄 Falling back to localStorage cart');
          updateState({ cart: parsedCart });
          return parsedCart;
        }
      }
      updateState({ cart: [] });
      return [];
    } catch (error) {
      console.error('Error in fallback:', error);
      updateState({ cart: [] });
      return [];
    }
  }, [updateState]);

  const applyPendingUpdates = useCallback((cartData, pendingUpdates) => {
    let updatedCart = [...cartData];

    pendingUpdates.forEach(update => {
      const { productId, quantity, action = 'update', timestamp } = update;

      const existingIndex = updatedCart.findIndex(item => {
        const itemId = item.id || item.product_id || item.productId;
        return itemId == productId;
      });

      if (action === 'remove' || quantity <= 0) {
        updatedCart = updatedCart.filter(item => {
          const itemId = item.id || item.product_id || item.productId;
          return itemId != productId;
        });
      } else if (existingIndex >= 0) {
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: quantity,
          updated_at: new Date(timestamp).toISOString()
        };
      } else {
        updatedCart.push({
          id: productId,
          product_id: productId,
          quantity: quantity,
          updated_at: new Date(timestamp).toISOString()
        });
      }
    });

    const uniqueCart = [];
    const seenIds = new Set();

    updatedCart.forEach(item => {
      const itemId = item.id || item.product_id;
      if (!seenIds.has(itemId)) {
        seenIds.add(itemId);
        uniqueCart.push(item);
      }
    });

    return uniqueCart;
  }, []);

  const saveCartToDatabase = useCallback(async (cartItems, retryCount = 0) => {
    if (!user?.id) {
      console.log('👤 Guest user - skipping database save');
      return { success: true, message: 'Guest mode - saved locally' };
    }

    const MAX_RETRIES = 3;

    try {
      console.log('💾 Saving cart to database...', cartItems.length, 'items');

      const itemsToSync = cartItems.map(item => ({
        product_id: item.id || item.product_id,
        quantity: item.quantity || 1
      }));

      const response = await api.syncCart({ items: itemsToSync });

      if (response.success) {
        console.log('✅ Cart saved to database successfully');
        localStorage.removeItem('pending_cart_updates');
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Failed to save cart');
      }
    } catch (error) {
      console.error('❌ Error saving cart to database:', error);
      saveAsPendingUpdate(cartItems);

      if (retryCount < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, retryCount);
        console.log(`🔄 Retrying cart save (${retryCount + 1}/${MAX_RETRIES}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await saveCartToDatabase(cartItems, retryCount + 1);
      }

      console.error('❌ Max retries reached for cart save');
      return {
        success: false,
        error: error.message,
        message: 'Saved locally, will sync when online'
      };
    }
  }, [user]);

  const saveAsPendingUpdate = useCallback((cartItems) => {
    try {
      const pendingUpdates = cartItems.map(item => ({
        productId: item.id || item.product_id,
        quantity: item.quantity || 1,
        action: item.quantity <= 0 ? 'remove' : 'update',
        timestamp: Date.now(),
        userId: user?.id
      }));

      const existingUpdates = JSON.parse(localStorage.getItem('pending_cart_updates') || '[]');
      const allUpdates = [...existingUpdates, ...pendingUpdates];

      const latestUpdates = {};
      allUpdates.forEach(update => {
        latestUpdates[update.productId] = update;
      });

      const finalUpdates = Object.values(latestUpdates);
      localStorage.setItem('pending_cart_updates', JSON.stringify(finalUpdates));

      console.log('📝 Saved as pending update for later sync:', finalUpdates.length, 'updates');
    } catch (error) {
      console.error('Error saving pending update:', error);
    }
  }, [user]);

  const syncPendingUpdates = useCallback(async () => {
    try {
      const pendingUpdates = JSON.parse(localStorage.getItem('pending_cart_updates') || '[]');
      if (pendingUpdates.length === 0 || !user?.id) return;

      console.log(`🔄 Syncing ${pendingUpdates.length} pending updates...`);

      const updatesByProduct = {};
      pendingUpdates.forEach(update => {
        updatesByProduct[update.productId] = update;
      });

      const itemsToSync = Object.entries(updatesByProduct).map(([productId, update]) => ({
        product_id: parseInt(productId),
        quantity: update.quantity,
        action: update.action
      }));

      const response = await api.syncCart({ items: itemsToSync });

      if (response.success) {
        localStorage.removeItem('pending_cart_updates');
        console.log('✅ Pending updates synced successfully');
        await loadCartFromDatabase(true);
      } else {
        throw new Error(response.error || 'Sync failed');
      }

    } catch (error) {
      console.error('❌ Error syncing pending updates:', error);
    }
  }, [user, loadCartFromDatabase]);

  // ======================
  // ENHANCED CART FUNCTIONS - DIPERBAIKI UNTUK REAL-TIME
  // ======================

  const addToCart = useCallback(async (productData, quantity = 1) => {
    try {
      console.log('🛍️ addToCart called:', { productData, quantity });

      if (!productData) {
        throw new Error('Product is required');
      }

      const productId = productData.productId || productData.id || productData.product_id;
      if (!productId) {
        throw new Error('Product ID is missing');
      }

      const parsedProductId = parseInt(productId);
      const parsedQuantity = Math.max(1, parseInt(quantity) || 1);

      console.log(`Processing: Product ID ${parsedProductId}, Quantity ${parsedQuantity}`);

      // Ambil cart terkini dari state
      const currentCart = Array.isArray(cart) ? [...cart] : [];
      const existingItem = currentCart.find(item => {
        const itemId = item.id || item.product_id || item.productId;
        return itemId == parsedProductId;
      });

      let updatedCart;

      if (existingItem) {
        updatedCart = currentCart.map(item => {
          const itemId = item.id || item.product_id || item.productId;
          if (itemId == parsedProductId) {
            return {
              ...item,
              quantity: (item.quantity || 1) + parsedQuantity,
              updated_at: new Date().toISOString()
            };
          }
          return item;
        });
      } else {
        // Format product untuk cart
        const formattedProduct = {
          id: parsedProductId,
          product_id: parsedProductId,
          name: productData.name || 'Produk',
          price: productData.price || 0,
          image: productData.image || '',
          description: productData.description || '',
          category: productData.category || '',
          quantity: parsedQuantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        updatedCart = [...currentCart, formattedProduct];
      }

      console.log('📦 Updated cart:', updatedCart);

      // Update state dan localStorage secara synchronous
      updateState({ cart: updatedCart });

      // Jika user login, sync ke database
      if (user?.id) {
        try {
          const response = await api.addToCart({
            productId: parsedProductId,
            quantity: parsedQuantity
          });

          if (response.success) {
            console.log('✅ Cart updated in database');
            // Refresh dari database untuk sinkronisasi
            await loadCartFromDatabase();
          } else {
            console.warn('⚠️ Database update failed, saving locally');
          }
        } catch (dbError) {
          console.warn('⚠️ Database update failed, saving as pending:', dbError);

          // Save as pending update
          const pendingUpdate = {
            productId: parsedProductId,
            quantity: (existingItem?.quantity || 0) + parsedQuantity,
            action: 'update',
            timestamp: Date.now(),
            userId: user.id
          };

          const pendingUpdates = JSON.parse(localStorage.getItem('pending_cart_updates') || '[]');
          pendingUpdates.push(pendingUpdate);
          localStorage.setItem('pending_cart_updates', JSON.stringify(pendingUpdates));
        }
      }

      console.log('✅ Product added to cart successfully');
      return { success: true, cart: updatedCart };

    } catch (error) {
      console.error('❌ addToCart error:', error);
      return { success: false, error: error.message };
    }
  }, [cart, user, updateState, loadCartFromDatabase]);

  const updateQuantity = useCallback(async (productId, newQuantity) => {
    try {
      console.log('🔄 updateQuantity:', { productId, newQuantity });

      const parsedProductId = parseInt(productId);
      const parsedQuantity = Math.max(0, Math.floor(newQuantity || 1));

      if (isNaN(parsedProductId)) {
        throw new Error('Invalid product ID');
      }

      // Ambil cart terkini
      const currentCart = Array.isArray(cart) ? [...cart] : [];
      let updatedCart;

      if (parsedQuantity === 0) {
        updatedCart = currentCart.filter(item => {
          const itemId = item.id || item.product_id || item.productId;
          return itemId != parsedProductId;
        });
      } else {
        updatedCart = currentCart.map(item => {
          const itemId = item.id || item.product_id || item.productId;
          if (itemId == parsedProductId) {
            return {
              ...item,
              quantity: parsedQuantity,
              updated_at: new Date().toISOString()
            };
          }
          return item;
        });
      }

      console.log('📦 Updated cart after quantity change:', updatedCart);

      // Update state dan localStorage
      updateState({ cart: updatedCart });

      // Jika user login, sync ke database
      if (user?.id) {
        try {
          if (parsedQuantity === 0) {
            await api.removeFromCart(parsedProductId);
          } else {
            await api.updateCartItem(parsedProductId, parsedQuantity);
          }

          console.log('✅ Cart updated in database');
          await loadCartFromDatabase();
        } catch (dbError) {
          console.warn('⚠️ Database update failed, saving as pending:', dbError);

          const pendingUpdate = {
            productId: parsedProductId,
            quantity: parsedQuantity,
            action: parsedQuantity === 0 ? 'remove' : 'update',
            timestamp: Date.now(),
            userId: user.id
          };

          const pendingUpdates = JSON.parse(localStorage.getItem('pending_cart_updates') || '[]');
          pendingUpdates.push(pendingUpdate);
          localStorage.setItem('pending_cart_updates', JSON.stringify(pendingUpdates));
        }
      }

      return { success: true, cart: updatedCart };

    } catch (error) {
      console.error('❌ updateQuantity error:', error);
      return { success: false, error: error.message };
    }
  }, [cart, user, updateState, loadCartFromDatabase]);

  const removeFromCart = useCallback(async (productId) => {
    return await updateQuantity(productId, 0);
  }, [updateQuantity]);

  const clearCart = useCallback(async () => {
    try {
      // Update state dan localStorage
      updateState({ cart: [] });

      // Jika user login, clear di database
      if (user?.id) {
        try {
          await api.clearCart();
          console.log('✅ Cart cleared from database');
        } catch (dbError) {
          console.warn('⚠️ Database clear failed:', dbError);
          const pendingClear = {
            action: 'clear_all',
            timestamp: Date.now(),
            userId: user.id
          };
          localStorage.setItem('pending_cart_clear', JSON.stringify(pendingClear));
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ clearCart error:', error);
      return { success: false, error: error.message };
    }
  }, [user, updateState]);

  // ======================
  // FAVORITES FUNCTIONS - DIPERBAIKI UNTUK REAL-TIME
  // ======================

  const loadUserFavorites = useCallback(async () => {
    try {
      if (!user?.id) {
        updateState({ favorites: [] });
        return;
      }

      const response = await api.getFavorites();
      if (response.success) {
        const favData = response.data || response.favorites || [];
        const favoritesArray = Array.isArray(favData) ? favData : [];
        console.log('💖 Loaded favorites from API:', favoritesArray.length);
        updateState({ favorites: favoritesArray });
        localStorage.setItem('favorites', JSON.stringify(favoritesArray));
      } else {
        // Fallback to localStorage
        const savedFavs = localStorage.getItem('favorites');
        if (savedFavs) {
          try {
            const parsed = JSON.parse(savedFavs);
            if (Array.isArray(parsed)) {
              console.log('💖 Loaded favorites from localStorage:', parsed.length);
              updateState({ favorites: parsed });
            }
          } catch (e) {
            console.error('Error parsing saved favorites:', e);
            updateState({ favorites: [] });
          }
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      updateState({ favorites: [] });
    }
  }, [user, updateState]);

  // Fungsi yang aman untuk cek favorit
  const isProductInFavorites = useCallback((productId) => {
    // Ambil favorites terkini
    const currentFavorites = Array.isArray(favorites) ? favorites : [];

    return currentFavorites.some(fav => {
      if (!fav) return false;
      const favId = fav.id || fav.product_id;
      return favId == productId;
    });
  }, [favorites]);

  const addToFavorites = useCallback(async (product) => {
    try {
      if (!user) {
        return { success: false, error: 'Please login to add favorites' };
      }

      const productId = product.id || product.product_id;
      if (!productId) return { success: false, error: 'Product ID is missing' };

      // Cek apakah sudah favorit
      const isFavorite = isProductInFavorites(productId);

      if (isFavorite) {
        console.log('💖 Product already in favorites:', productId);
        return { success: true, message: 'Already in favorites' };
      }

      console.log('💖 Adding to favorites:', productId);

      const response = await api.addToFavorites({ product_id: productId });
      if (response.success) {
        // Refresh favorites dari database
        await loadUserFavorites();
        console.log('✅ Added to favorites successfully');
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to add favorite' };
    } catch (error) {
      console.error('Error adding favorite:', error);
      return { success: false, error: error.message };
    }
  }, [user, isProductInFavorites, loadUserFavorites]);

  const removeFromFavorites = useCallback(async (productId) => {
    try {
      if (!user) {
        return { success: false, error: 'Please login to remove favorites' };
      }

      // Cek apakah favorit
      const isFavorite = isProductInFavorites(productId);

      if (!isFavorite) {
        console.log('💖 Product not in favorites:', productId);
        return { success: true, message: 'Not in favorites' };
      }

      console.log('💖 Removing from favorites:', productId);

      const response = await api.removeFromFavorites(productId);
      if (response.success) {
        // Refresh favorites dari database
        await loadUserFavorites();
        console.log('✅ Removed from favorites successfully');
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to remove favorite' };
    } catch (error) {
      console.error('Error removing favorite:', error);
      return { success: false, error: error.message };
    }
  }, [user, isProductInFavorites, loadUserFavorites]);

  const toggleFavorite = useCallback(async (product) => {
    try {
      const productId = product.id || product.product_id;
      if (!productId) {
        throw new Error('Product ID is missing');
      }

      // Cek status favorit
      const isFavorite = isProductInFavorites(productId);

      console.log('💖 Toggling favorite:', { productId, isFavorite });

      if (isFavorite) {
        return await removeFromFavorites(productId);
      } else {
        return await addToFavorites(product);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return { success: false, error: error.message };
    }
  }, [isProductInFavorites, addToFavorites, removeFromFavorites]);

  // ======================
  // CHECKOUT FUNCTIONS
  // ======================

  const saveCheckoutData = useCallback((data) => {
    updateState({ checkoutData: data });
    localStorage.setItem('checkoutData', JSON.stringify(data));
    return { success: true };
  }, [updateState]);

  const clearCheckoutData = useCallback(() => {
    updateState({ checkoutData: null });
    localStorage.removeItem('checkoutData');
    return { success: true };
  }, [updateState]);

  // ======================
  // ORDER FUNCTIONS
  // ======================

  const addOrder = useCallback(async (orderData) => {
    try {
      console.log('🛒 Creating order...');

      if (!orderData || !Array.isArray(cart) || cart.length === 0) {
        throw new Error('Cart is empty');
      }

      const subtotal = cart.reduce(
        (total, item) => total + ((item.price || 0) * (item.quantity || 1)),
        0
      );
      const tax = subtotal * 0.1;
      const serviceFee = 5000;
      const total = subtotal + tax + serviceFee;

      const orderPayload = {
        ...orderData,
        subtotal,
        tax,
        service_fee: serviceFee,
        total_amount: total,
        status: 'pending',
        items: cart.map(item => ({
          product_id: item.id || item.product_id,
          product_name: item.name || 'Product',
          quantity: item.quantity || 1,
          price: item.price || 0,
          subtotal: (item.price || 0) * (item.quantity || 1)
        }))
      };

      console.log('📤 Sending order to backend:', orderPayload);

      const response = await api.createOrder(orderPayload);
      if (response.success) {
        const newOrder = response.order || response.data;

        updateState(prev => ({
          ...prev,
          orders: [newOrder, ...(Array.isArray(prev.orders) ? prev.orders : [])],
          activeOrder: newOrder
        }));

        await clearCart();
        clearCheckoutData();

        console.log('✅ Order created successfully:', newOrder);
        return { success: true, order: newOrder };
      }
      throw new Error(response.error || 'Failed to create order');
    } catch (error) {
      console.error('❌ Order creation error:', error);
      return { success: false, error: error.message };
    }
  }, [cart, clearCart, clearCheckoutData, updateState]);

  const loadUserOrders = useCallback(async () => {
    try {
      if (!user?.id) return;

      const response = await api.getOrders();
      if (response.success) {
        const ordersData = response.data || response.orders || [];
        updateState({ orders: Array.isArray(ordersData) ? ordersData : [] });
      }
    } catch (error) {
      console.error('Load orders error:', error);
    }
  }, [user, updateState]);

  // ======================
  // AUTH FUNCTIONS
  // ======================

  const login = useCallback(async (email, password) => {
    updateState({ isLoading: true, error: null });
    try {
      const response = await api.login({ email, password });

      if (response.success && response.token) {
        const userData = response.user || response.data;

        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(userData));

        updateState({
          user: userData,
          authToken: response.token,
          error: null,
          isCartSyncing: true
        });

        await Promise.all([
          loadCartFromDatabase(true),
          loadUserFavorites(),
          loadUserOrders()
        ]);

        const guestCart = localStorage.getItem('guest_cart');
        if (guestCart) {
          try {
            const guestCartItems = JSON.parse(guestCart);
            if (Array.isArray(guestCartItems) && guestCartItems.length > 0) {
              console.log('🔄 Merging guest cart with user cart...');
              for (const item of guestCartItems) {
                await addToCart(item, item.quantity);
              }
              localStorage.removeItem('guest_cart');
            }
          } catch (e) {
            console.error('Error merging guest cart:', e);
          }
        }

        updateState({ isCartSyncing: false });
        return { success: true, user: userData, token: response.token };
      }

      const errorMsg = response.message || 'Login failed';
      updateState({ error: errorMsg });
      return { success: false, error: errorMsg };

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login error';
      updateState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState, loadCartFromDatabase, loadUserFavorites, loadUserOrders, addToCart]);

  const register = useCallback(async (userData) => {
    updateState({ isLoading: true, error: null });
    try {
      if (!userData.name || !userData.email || !userData.password) {
        throw new Error('Please fill in all required fields');
      }

      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await api.register(userData);

      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        updateState({
          authToken: response.token,
          user: response.user,
          error: null
        });

        return {
          success: true,
          user: response.user,
          token: response.token,
          message: 'Registration successful!'
        };
      }

      const errorMsg = response.message || 'Registration failed';
      updateState({ error: errorMsg });
      return { success: false, error: errorMsg };

    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.message || 'Unexpected error';
      updateState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  const logout = useCallback(() => {
    if (user?.id && Array.isArray(cart) && cart.length > 0) {
      localStorage.setItem(`last_cart_${user.id}`, JSON.stringify(cart));
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    localStorage.removeItem('favorites');
    localStorage.removeItem('checkoutData');
    localStorage.removeItem('pending_cart_updates');
    localStorage.removeItem('pending_cart_clear');

    updateState({
      user: null,
      authToken: null,
      cart: [],
      favorites: [], // PASTIKAN favorites direset ke array kosong
      orders: [],
      checkoutData: null,
      activeOrder: null,
      lastCartSync: null,
      error: null
    });

    window.location.href = '/login';
  }, [user, cart, updateState]);

  // ======================
  // PROFILE FUNCTIONS
  // ======================

  const updateProfile = useCallback(async (profileData) => {
    updateState({ isUpdatingProfile: true, error: null });
    try {
      const response = await api.updateProfile(profileData);
      if (response.success) {
        updateState({ user: response.user });
        localStorage.setItem('user', JSON.stringify(response.user));
        return { success: true, user: response.user };
      }
      return { success: false, error: response.error };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      updateState({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      updateState({ isUpdatingProfile: false });
    }
  }, [updateState]);

  // ======================
  // INITIAL LOAD
  // ======================

  useEffect(() => {
    const initApp = async () => {
      updateState(prev => ({ ...prev, loading: true }));
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const savedCart = localStorage.getItem('cart');
        const savedFavorites = localStorage.getItem('favorites');

        // Load cart from localStorage
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart);
            if (Array.isArray(parsedCart)) {
              console.log('📦 Loaded cart from localStorage:', parsedCart.length, 'items');
              updateState(prev => ({ ...prev, cart: parsedCart }));
            }
          } catch (e) {
            console.error('Error parsing cart:', e);
            localStorage.removeItem('cart');
          }
        }

        // Load favorites from localStorage
        if (savedFavorites) {
          try {
            const parsedFavorites = JSON.parse(savedFavorites);
            if (Array.isArray(parsedFavorites)) {
              console.log('💖 Loaded favorites from localStorage:', parsedFavorites.length);
              updateState(prev => ({ ...prev, favorites: parsedFavorites }));
            }
          } catch (e) {
            console.error('Error parsing favorites:', e);
            localStorage.removeItem('favorites');
          }
        }

        if (token && savedUser) {
          try {
            const profileRes = await api.getProfile();
            if (profileRes.success) {
              const userData = profileRes.user || JSON.parse(savedUser);
              updateState(prev => ({
                ...prev,
                user: userData,
                authToken: token,
                error: null
              }));

              await Promise.all([
                loadCartFromDatabase(true),
                loadUserFavorites(),
                loadUserOrders()
              ]);
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              updateState(prev => ({
                ...prev,
                user: null,
                authToken: null,
                error: 'Session expired'
              }));
            }
          } catch (err) {
            console.error('Auth check error:', err);
            try {
              const userData = JSON.parse(savedUser);
              updateState(prev => ({
                ...prev,
                user: userData,
                authToken: token
              }));
            } catch {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              updateState(prev => ({
                ...prev,
                user: null,
                authToken: null
              }));
            }
          }
        }

        // Load products
        try {
          const productsRes = await api.getProducts();
          if (productsRes.success && Array.isArray(productsRes.data)) {
            console.log('📊 Loaded products from API:', productsRes.data.length);
            updateState(prev => ({ ...prev, products: productsRes.data }));
          }
        } catch (error) {
          console.error('Load products error:', error);
        }

        // Load categories
        try {
          const categoriesRes = await api.getCategories();
          if (categoriesRes.success && Array.isArray(categoriesRes.data)) {
            updateState(prev => ({ ...prev, categories: categoriesRes.data }));
          }
        } catch (error) {
          console.error('Load categories error:', error);
        }

      } catch (error) {
        console.error('Init app error:', error);
        updateState(prev => ({ ...prev, error: 'Failed to load app data' }));
      } finally {
        updateState(prev => ({ ...prev, loading: false }));
      }
    };

    initApp();
  }, [loadCartFromDatabase, loadUserFavorites, loadUserOrders, updateState]);

  // ======================
  // COMPUTED VALUES
  // ======================

  const cartTotal = Array.isArray(cart) ? cart.reduce(
    (total, item) => total + ((item.price || 0) * (item.quantity || 1)),
    0
  ) : 0;

  const cartCount = Array.isArray(cart) ? cart.reduce(
    (count, item) => count + (item.quantity || 1),
    0
  ) : 0;

  const getFilteredProducts = useCallback(() => {
    const currentProducts = Array.isArray(products) ? products : [];
    if (currentCategory === 'All') return currentProducts;
    return currentProducts.filter(product =>
      product.category_name === currentCategory ||
      product.category === currentCategory ||
      product.category_id?.toString() === currentCategory
    );
  }, [products, currentCategory]);

  // ======================
  // CONTEXT VALUE - DIPERBAIKI (SEMUA DI ROOT LEVEL)
  // ======================

  const contextValue = {
    // SEMUA STATE DI ROOT LEVEL - BUKAN DALAM OBJECT "state"
    user: user || null,
    loading: loading || false,
    isLoading: isLoading || false,
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories : [],
    cart: Array.isArray(cart) ? cart : [],
    favorites: Array.isArray(favorites) ? favorites : [],
    orders: Array.isArray(orders) ? orders : [],
    currentCategory: currentCategory || 'All',
    authToken: authToken || null,
    error: error || null,
    cartTotal: cartTotal || 0,
    cartCount: cartCount || 0,
    isUpdatingProfile: isUpdatingProfile || false,
    paymentMethod: paymentMethod || 'cash_on_delivery',
    checkoutData: checkoutData || null,
    activeOrder: activeOrder || null,
    isCartSyncing: isCartSyncing || false,

    // Computed
    filteredProducts: getFilteredProducts(),

    // Auth functions
    login,
    register,
    logout,

    // Profile functions
    updateProfile,

    // Cart functions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartItemById,
    loadCartFromDatabase,
    syncPendingUpdates,
    saveCartToDatabase,

    // Favorite functions
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isProductInFavorites,
    loadUserFavorites,

    // Checkout functions
    saveCheckoutData,
    clearCheckoutData,

    // Order functions
    addOrder,
    createOrder: addOrder,
    loadUserOrders,

    // Payment functions
    setPaymentMethod: (method) => {
      localStorage.setItem('paymentMethod', method);
      updateState({ paymentMethod: method });
    },

    // UI functions
    setCurrentCategory: (category) => {
      updateState({ currentCategory: category });
    },

    // Utility
    updateState
  };

  console.log('🎯 Context value updated:', {
    cartLength: contextValue.cart.length,
    favoritesLength: contextValue.favorites.length,
    user: contextValue.user?.name || 'No user'
  });

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};