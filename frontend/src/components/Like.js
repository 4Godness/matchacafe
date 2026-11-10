import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./Like.css";

export const Like = () => {
  const navigate = useNavigate();
  const context = useApp();

  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartToast, setCartToast] = useState('');

  // Safe extraction dari context
  const {
    state = {},
    addToCart = () => console.log('addToCart not available'),
    removeFromFavorite = () => console.log('removeFromFavorite not available')
  } = context || {};

  // Load data favorit dari localStorage
  useEffect(() => {
    console.log("🔄 Loading favorites from localStorage...");
    setIsLoading(true);

    try {
      const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      console.log("📦 Raw localStorage favorites:", storedFavorites);

      if (Array.isArray(storedFavorites) && storedFavorites.length > 0) {
        console.log("✅ Found favorites in localStorage:", storedFavorites.length);

        // Format data menjadi struktur yang konsisten
        const formattedProducts = storedFavorites.map(item => {
          // Handle berbagai format data
          return {
            id: item.id || item.productId || item._id,
            name: item.name || item.productName || "Unknown Product",
            description: item.description || "No description available",
            price: parseFloat(item.price) || 0,
            category: item.category_name || item.category || item.categoryName || "Uncategorized",
            image: item.image_url || item.image || item.imageUrl || null,
            rating: parseFloat(item.rating) || 0,
            stock: item.stock || 0,
            is_active: item.is_active !== undefined ? item.is_active : true,
            favoritedAt: item.favorited_at || item.createdAt || new Date().toISOString()
          };
        }).filter(product => product.id); // Hapus item tanpa ID

        console.log("📋 Formatted favorite products:", formattedProducts);
        setFavoriteProducts(formattedProducts);
      } else {
        console.log("📭 No favorites found in localStorage");
        setFavoriteProducts([]);
      }
    } catch (error) {
      console.error("❌ Error loading favorites:", error);
      setFavoriteProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle add to cart
  const handleAddToCart = (product) => {
    if (!product || !product.id) {
      alert("Product data is invalid");
      return;
    }

    try {
      // Get current cart from localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');

      // Check if product already exists in cart
      const existingIndex = cart.findIndex(item =>
        item.productId === product.id ||
        item.id === product.id
      );

      if (existingIndex > -1) {
        // Increment quantity if product exists
        cart[existingIndex].quantity += 1;
        setCartToast(`${product.name} ditambah lagi ke keranjang`);
      } else {
        // Add new product to cart
        const cartItem = {
          productId: product.id,
          id: product.id, // Untuk kompatibilitas
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          quantity: 1,
          addedAt: new Date().toISOString()
        };

        cart.push(cartItem);
        setCartToast(`${product.name} ditambahkan ke keranjang`);
      }

      // Save back to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));

      // Also try to add to context if available
      if (typeof addToCart === 'function') {
        addToCart({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          quantity: 1
        });
      }
      window.setTimeout(() => setCartToast(''), 3000);

    } catch (error) {
      console.error("❌ Error adding to cart:", error);
      alert("Failed to add to cart");
    }
  };

  // Handle remove favorite
  const handleRemoveFavorite = (productId) => {
    if (!productId) {
      alert("Product ID is required");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this item from favorites?")) {
      return;
    }

    try {
      // Get current favorites from localStorage
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

      // Remove the product (handle both object and ID formats)
      const updatedFavorites = favorites.filter(item => {
        if (typeof item === 'object') {
          return item.id !== productId && item.productId !== productId;
        }
        return item !== productId;
      });

      // Save back to localStorage
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));

      // Update state
      setFavoriteProducts(prev => prev.filter(p => p.id !== productId));

      // Also try to remove from context if available
      if (typeof removeFromFavorite === 'function') {
        removeFromFavorite(productId);
      }

      alert("Product removed from favorites");

    } catch (error) {
      console.error("❌ Error removing favorite:", error);
      alert("Failed to remove from favorites");
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  // Refresh favorites data
  const handleRefresh = () => {
    setIsLoading(true);

    setTimeout(() => {
      const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');

      if (Array.isArray(storedFavorites) && storedFavorites.length > 0) {
        const formattedProducts = storedFavorites.map(item => ({
          id: item.id || item.productId,
          name: item.name || item.productName,
          description: item.description || "No description",
          price: parseFloat(item.price) || 0,
          category: item.category_name || item.category,
          image: item.image_url || item.image,
          rating: parseFloat(item.rating) || 0
        }));

        setFavoriteProducts(formattedProducts);
      } else {
        setFavoriteProducts([]);
      }

      setIsLoading(false);
      alert("Favorites refreshed!");
    }, 500);
  };

  // Get cart count for badge
  const getCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      return cart.length;
    } catch {
      return 0;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="like">
        <div className="like-header">
          <button className="back-btn" onClick={handleBackToHome}>
            ← Back
          </button>
          <h1 className="like-title">My Favorites</h1>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} disabled>
              🔄
            </button>
          </div>
        </div>

        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your favorites...</p>
        </div>

        {/* Navigation Bar */}
        <div className="bottom-nav-container">
          <nav className="bottom-nav">
            <button className="nav-item" onClick={() => navigate('/home')}>
              <span className="nav-icon">🏠</span>
              <span className="nav-label">Home</span>
            </button>
            <button className="nav-item" onClick={() => navigate('/cart')}>
              <span className="nav-icon">🛒</span>
              <span className="nav-label">Cart</span>
              {getCartCount() > 0 && (
                <span className="cart-badge">{getCartCount()}</span>
              )}
            </button>
            <button className="nav-item active">
              <span className="nav-icon">❤️</span>
              <span className="nav-label">Favorites</span>
            </button>
            <button className="nav-item" onClick={() => navigate('/profile')}>
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </button>
          </nav>
        </div>
      </div>
    );
  }

  // Empty state
  if (favoriteProducts.length === 0) {
    return (
      <div className="like">
        <div className="like-header">
          <button className="back-btn" onClick={handleBackToHome}>
            ← Back
          </button>
          <h1 className="like-title">My Favorites</h1>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh}>
              🔄
            </button>
          </div>
        </div>

        <div className="empty-favorites">
          <div className="empty-heart">💔</div>
          <h2>No favorites yet</h2>
          <p>Items you like will appear here</p>

          <div className="empty-actions">
            <button
              className="btn btn-primary"
              onClick={handleBackToHome}
            >
              Explore Products
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
            >
              Refresh Favorites
            </button>
          </div>

          {/* Debug Info - hanya tampil di development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-info">
              <h4>Debug Information:</h4>
              <p><strong>LocalStorage has favorites key:</strong> {localStorage.getItem('favorites') ? 'Yes' : 'No'}</p>
              <p><strong>Check console for more details</strong></p>
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <div className="bottom-nav-container">
          <nav className="bottom-nav">
            <button className="nav-item" onClick={() => navigate('/home')}>
              <span className="nav-icon">🏠</span>
              <span className="nav-label">Home</span>
            </button>
            <button className="nav-item" onClick={() => navigate('/cart')}>
              <span className="nav-icon">🛒</span>
              <span className="nav-label">Cart</span>
              {getCartCount() > 0 && (
                <span className="cart-badge">{getCartCount()}</span>
              )}
            </button>
            <button className="nav-item active">
              <span className="nav-icon">❤️</span>
              <span className="nav-label">Favorites</span>
            </button>
            <button className="nav-item" onClick={() => navigate('/profile')}>
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </button>
          </nav>
        </div>
      </div>
    );
  }

  // Main view with favorites
  return (
    <div className="like">
      <div className="like-header">
        <button className="back-btn" onClick={handleBackToHome}>
          ← Back
        </button>
        <h1 className="like-title">My Favorites ({favoriteProducts.length})</h1>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh} title="Refresh favorites">
            🔄
          </button>
        </div>
      </div>

      <div className="like-content">
        <div className="favorites-grid">
          {favoriteProducts.map(product => (
            <div key={product.id} className="favorite-card">
              <div className="product-image-container">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="image-placeholder">
                    {product.category === 'Minuman' ? '🥤' :
                      product.category === 'Makanan' ? '🍔' :
                        product.category === 'Dessert' ? '🍰' :
                          product.category === 'Coffee' ? '☕' :
                            product.category === 'Cake' ? '🍰' : '📦'}
                  </div>
                )}

                <button
                  className="remove-favorite-btn"
                  onClick={() => handleRemoveFavorite(product.id)}
                  title="Remove from favorites"
                >
                  ❤️
                </button>

                {product.rating > 0 && (
                  <div className="product-rating">
                    ⭐ {product.rating.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">
                  {product.description}
                </p>

                {product.category && (
                  <div className="product-category">
                    {product.category}
                  </div>
                )}

                {product.stock !== undefined && (
                  <div className="product-stock">
                    Stock: {product.stock} {product.stock < 10 && <span className="low-stock">(Low)</span>}
                  </div>
                )}

                <div className="product-footer">
                  <span className="product-price">
                    Rp {product.price.toLocaleString('id-ID')}
                  </span>

                  <div className="action-buttons">
                    <button
                      className="add-to-cart-btn"
                      onClick={() => handleAddToCart(product)}
                      title="Add to cart"
                      disabled={product.stock !== undefined && product.stock <= 0}
                    >
                      {product.stock !== undefined && product.stock <= 0 ? 'Out of Stock' : '🛒 Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cartToast && <div className="favorite-cart-toast" role="status"><span>✓</span><strong>{cartToast}</strong><button onClick={() => navigate('/cart')}>Lihat keranjang →</button><button className="dismiss-toast" onClick={() => setCartToast('')} aria-label="Tutup">×</button></div>}

      {/* Navigation Bar */}
      <div className="bottom-nav-container">
        <nav className="bottom-nav">
          <button className="nav-item" onClick={() => navigate('/home')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          <button className="nav-item" onClick={() => navigate('/cart')}>
            <span className="nav-icon">🛒</span>
            <span className="nav-label">Cart</span>
            {getCartCount() > 0 && (
              <span className="cart-badge">{getCartCount()}</span>
            )}
          </button>
          <button className="nav-item active">
            <span className="nav-icon">❤️</span>
            <span className="nav-label">Favorites</span>
            {favoriteProducts.length > 0 && (
              <span className="favorite-badge">{favoriteProducts.length}</span>
            )}
          </button>
          <button className="nav-item" onClick={() => navigate('/profile')}>
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
