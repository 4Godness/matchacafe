import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./cart.css";

const Cart = () => {
  const navigate = useNavigate();
  const context = useApp();

  // State
  const [localCart, setLocalCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]); // Item yang dipilih untuk order
  const [localTotal, setLocalTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [showLoading, setShowLoading] = useState(true);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [selectAll, setSelectAll] = useState(true); // Default select all

  // Load cart data
  useEffect(() => {
    console.log("🛒 Cart load starting...");

    const loadingTimer = setTimeout(() => {
      setShowLoading(false);
    }, 300);

    try {
      loadCartFromAllSources();
      setShowLoading(false);
    } catch (error) {
      console.error("Cart load error:", error);
      setLocalCart([]);
      setSelectedItems([]);
      setLocalTotal(0);
      setShowLoading(false);
    }

    return () => clearTimeout(loadingTimer);
  }, []);

  // Load cart from all sources
  const loadCartFromAllSources = () => {
    console.log("🔍 Checking all cart sources...");

    let foundItems = [];

    // 1. Try localStorage 'cart' (new format from Home)
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log("📦 Found cart in localStorage 'cart':", parsedCart);

        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          foundItems = normalizeCartItems(parsedCart);
          console.log("✅ Using localStorage 'cart' items:", foundItems.length);
        }
      } catch (e) {
        console.log("❌ Error parsing localStorage 'cart':", e);
      }
    }

    // 2. Try localStorage 'cart_display' (old format)
    if (foundItems.length === 0) {
      const savedCartDisplay = localStorage.getItem('cart_display');
      if (savedCartDisplay) {
        try {
          const parsedDisplay = JSON.parse(savedCartDisplay);
          console.log("📦 Found cart in localStorage 'cart_display':", parsedDisplay);

          if (Array.isArray(parsedDisplay) && parsedDisplay.length > 0) {
            foundItems = normalizeCartItems(parsedDisplay);
            console.log("✅ Using localStorage 'cart_display' items:", foundItems.length);
          }
        } catch (e) {
          console.log("❌ Error parsing localStorage 'cart_display':", e);
        }
      }
    }

    // 3. Try from context
    if (foundItems.length === 0 && context?.cart && Array.isArray(context.cart)) {
      console.log("📦 Found cart in context:", context.cart);
      foundItems = normalizeCartItems(context.cart);
      console.log("✅ Using context cart items:", foundItems.length);
    }

    // 4. Try localStorage 'cart_items' (alternative format)
    if (foundItems.length === 0) {
      const savedCartItems = localStorage.getItem('cart_items');
      if (savedCartItems) {
        try {
          const parsedItems = JSON.parse(savedCartItems);
          console.log("📦 Found cart in localStorage 'cart_items':", parsedItems);

          if (Array.isArray(parsedItems)) {
            foundItems = normalizeCartItems(parsedItems);
            console.log("✅ Using localStorage 'cart_items' items:", foundItems.length);
          }
        } catch (e) {
          console.log("❌ Error parsing localStorage 'cart_items':", e);
        }
      }
    }

    // Set cart items dan auto-select semua items
    if (foundItems.length > 0) {
      setLocalCart(foundItems);
      // Auto-select semua items
      const allItemIds = foundItems.map(item => item.id);
      setSelectedItems(allItemIds);
      calculateTotal(foundItems);
      console.log("🎯 Final cart items:", foundItems);
    } else {
      setLocalCart([]);
      setSelectedItems([]);
      setLocalTotal(0);
      console.log("📭 No cart items found anywhere");
    }
  };

  // Normalize cart items from various formats
  const normalizeCartItems = (items) => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter(item => item != null)
      .map(item => {
        const normalizedItem = {
          id: item.id || item.productId || item._id || `item-${Date.now()}-${Math.random()}`,
          name: item.name || item.productName || item.product_name || 'Unknown Product',
          price: parseFloat(item.price) || parseFloat(item.productPrice) || 0,
          quantity: parseInt(item.quantity) || parseInt(item.qty) || 1,
          image: item.image || item.image_url || item.imageUrl || item.productImage || '',
          description: item.description || item.productDescription || '',
          category: item.category || item.productCategory || '',
          originalData: item
        };

        if (normalizedItem.quantity < 1) {
          normalizedItem.quantity = 1;
        }

        return normalizedItem;
      })
      .filter(item => item.price > 0);
  };

  // Calculate total berdasarkan items yang dipilih
  const calculateTotal = (items, selectedIds = selectedItems) => {
    const selectedCartItems = items.filter(item => selectedIds.includes(item.id));
    const total = selectedCartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    setLocalTotal(total);
    return total;
  };

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }

    const updatedCart = localCart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    setLocalCart(updatedCart);
    calculateTotal(updatedCart);
    saveCartToLocalStorage(updatedCart);
  };

  // Handle remove item
  const handleRemoveItem = (productId) => {
    const updatedCart = localCart.filter(item => item.id !== productId);
    setLocalCart(updatedCart);
    // Hapus dari selectedItems juga
    setSelectedItems(prev => prev.filter(id => id !== productId));
    calculateTotal(updatedCart);
    saveCartToLocalStorage(updatedCart);
  };

  // Save cart to localStorage
  const saveCartToLocalStorage = (cartItems) => {
    const saveFormat = cartItems.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      description: item.description,
      category: item.category
    }));

    localStorage.setItem('cart', JSON.stringify(saveFormat));
    localStorage.setItem('cart_display', JSON.stringify(saveFormat));

    console.log("💾 Saved cart to localStorage:", saveFormat.length, "items");
  };

  // Handle select/deselect individual item
  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      let newSelected;
      if (prev.includes(itemId)) {
        // Deselect item
        newSelected = prev.filter(id => id !== itemId);
      } else {
        // Select item
        newSelected = [...prev, itemId];
      }

      // Hitung ulang total berdasarkan selected items baru
      calculateTotal(localCart, newSelected);

      // Update selectAll status
      setSelectAll(newSelected.length === localCart.length);

      return newSelected;
    });
  };

  // Handle select/deselect all items
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedItems([]);
      setSelectAll(false);
      setLocalTotal(0);
    } else {
      // Select all
      const allItemIds = localCart.map(item => item.id);
      setSelectedItems(allItemIds);
      setSelectAll(true);
      calculateTotal(localCart, allItemIds);
    }
  };

  // Handle clear selected items
  const handleClearSelected = () => {
    const confirmClear = window.confirm("Yakin ingin menghapus item yang dipilih?");
    if (!confirmClear) return;

    // Hapus items yang dipilih dari cart
    const updatedCart = localCart.filter(item => !selectedItems.includes(item.id));
    setLocalCart(updatedCart);
    setSelectedItems([]);
    setSelectAll(false);
    calculateTotal(updatedCart, []);
    saveCartToLocalStorage(updatedCart);

    alert(`${selectedItems.length} item berhasil dihapus`);
  };

  // Handle clear all cart
  const handleClearCart = () => {
    const confirmClear = window.confirm("Yakin ingin menghapus semua item dari keranjang?");
    if (!confirmClear) return;

    setLocalCart([]);
    setSelectedItems([]);
    setSelectAll(false);
    setLocalTotal(0);
    setShowOrderSummary(false);
    setTableNumber("");
    setCustomerName("");

    localStorage.removeItem('cart');
    localStorage.removeItem('cart_display');
    localStorage.removeItem('cart_items');

    console.log("🗑️ Cart cleared");
    alert('Keranjang berhasil dikosongkan');
  };

  // Handle place order - tampilkan ringkasan pesanan
  const handlePlaceOrder = () => {
    setCheckoutError("");

    if (selectedItems.length === 0) {
      setCheckoutError('Silakan pilih minimal 1 item untuk dipesan!');
      return;
    }

    // Tampilkan form input nama dan meja
    setShowOrderSummary(true);
  };

  // Get selected cart items untuk order
  const getSelectedCartItems = () => {
    return localCart.filter(item => selectedItems.includes(item.id));
  };

  // Handle checkout setelah data lengkap
  const handleCheckout = () => {
    if (!context?.user) {
      setCheckoutError('Silakan login untuk melanjutkan pembayaran');
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    if (!tableNumber.trim()) {
      setCheckoutError('Silakan masukkan nomor meja!');
      return;
    }

    if (!customerName.trim()) {
      setCheckoutError('Silakan masukkan nama pemesan!');
      return;
    }

    const selectedCartItems = getSelectedCartItems();
    if (selectedCartItems.length === 0) {
      setCheckoutError('Tidak ada item yang dipilih untuk dipesan!');
      return;
    }

    setIsProcessing(true);

    const tax = (localTotal || 0) * 0.1;
    const serviceFee = 5000;
    const grandTotal = (localTotal || 0) + tax + serviceFee;

    const checkoutData = {
      items: selectedCartItems,
      customerInfo: {
        name: customerName.trim(),
        tableNumber: tableNumber.trim(),
        phone: context.user.phone || "",
        userId: context.user.id || context.user._id || ""
      },
      subtotal: localTotal,
      tax: tax,
      serviceFee: serviceFee,
      grandTotal: grandTotal,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Save to localStorage
    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));

    // Navigate to payment
    navigate('/payment-method', {
      state: {
        checkoutData: checkoutData,
        fromCart: true
      }
    });

    setIsProcessing(false);
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    navigate('/home');
  };

  // Handle back to home
  const handleBackToHome = () => {
    navigate('/home');
  };

  // Handle refresh cart
  const handleRefreshCart = () => {
    console.log("🔄 Manually refreshing cart...");
    setShowLoading(true);
    loadCartFromAllSources();
    setTimeout(() => setShowLoading(false), 500);
  };

  // Handle back to cart items (kembali dari ringkasan)
  const handleBackToCartItems = () => {
    setShowOrderSummary(false);
    setCheckoutError("");
  };

  // Tampilkan loading
  if (showLoading) {
    return (
      <div className="cart">
        <div className="cart-header">
          <button className="back-btn" onClick={() => navigate('/home')}>
            <span className="back-icon">←</span>
          </button>
          <h1 className="cart-title">Keranjang Belanja</h1>
        </div>

        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Memuat keranjang...</p>
        </div>
      </div>
    );
  }

  // Hitung totals untuk ringkasan
  const tax = (localTotal || 0) * 0.1;
  const serviceFee = 5000;
  const grandTotal = (localTotal || 0) + tax + serviceFee;

  // Get selected items count
  const selectedItemsCount = selectedItems.length;

  return (
    <div className="cart">
      {/* Header */}
      <div className="cart-header">
        <button className="back-btn" onClick={handleBackToHome}>
          <span className="back-icon">←</span>
        </button>
        <h1 className="cart-title">
          {showOrderSummary ? 'Ringkasan Pesanan' : 'Keranjang Belanja'}
        </h1>

        <div className="header-actions">
          {localCart.length > 0 && !showOrderSummary && (
            <button
              className="clear-btn"
              onClick={handleClearCart}
              disabled={isProcessing}
            >
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      <div className="cart-content">
        {localCart.length === 0 ? (
          // Empty cart state
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Keranjang Anda kosong</h2>
            <p>Belum ada barang yang ditambahkan ke keranjang</p>
            <button
              className="btn btn-primary"
              onClick={handleContinueShopping}
              style={{ marginTop: '20px' }}
            >
              Belanja Sekarang
            </button>
          </div>
        ) : !showOrderSummary ? (
          // Tampilan item cart dengan seleksi (sebelum order)
          <>
            {/* Header dengan kontrol seleksi */}
            <div className="selection-controls">
              <div className="select-all-control">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="selection-checkbox"
                  />
                  <label htmlFor="selectAll" className="checkbox-label">
                    Pilih Semua ({localCart.length} item)
                  </label>
                </div>
                {selectedItemsCount > 0 && (
                  <button
                    className="clear-selected-btn"
                    onClick={handleClearSelected}
                    disabled={isProcessing}
                  >
                    Hapus Terpilih ({selectedItemsCount})
                  </button>
                )}
              </div>

              <div className="selected-summary">
                <span>Terpilih: {selectedItemsCount} item</span>
                <div className="subtotal-preview">
                  <strong>Rp {localTotal.toLocaleString('id-ID')}</strong>
                </div>
              </div>
            </div>

            {/* Daftar Item dengan checkbox */}
            <div className="cart-items-list">
              {localCart.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                const isSelected = selectedItems.includes(item.id);

                return (
                  <div key={item.id || index} className={`cart-item ${isSelected ? 'selected' : ''}`}>
                    {/* Checkbox untuk seleksi */}
                    <div className="item-selection">
                      <input
                        type="checkbox"
                        id={`item-${item.id}`}
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                        className="item-checkbox"
                      />
                      <label htmlFor={`item-${item.id}`} className="checkbox-visual"></label>
                    </div>

                    {/* Item Image */}
                    <div className="item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="item-img" />
                      ) : (
                        <div className="img-fallback">
                          {item.category === 'Minuman' ? '🥤' :
                            item.category === 'Makanan' ? '🍔' :
                              item.category === 'Dessert' ? '🍰' :
                                item.category === 'Matcha' ? '🍵' : '📦'}
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-category">{item.category}</p>
                      <div className="item-price">
                        Rp {item.price.toLocaleString('id-ID')}
                      </div>

                      <div className="quantity-controls">
                        <button
                          className="quantity-btn minus"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isProcessing}
                        >
                          -
                        </button>
                        <span className="quantity-display">{item.quantity}</span>
                        <button
                          className="quantity-btn plus"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={isProcessing}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="item-total">
                      <div className="total-price">
                        Rp {itemTotal.toLocaleString('id-ID')}
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isProcessing}
                        aria-label="Hapus item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Place Order */}
            <div className="place-order-container">
              <div className="order-summary-preview">
                <div className="preview-left">
                  <span className="preview-label">Total Pesanan:</span>
                  <span className="preview-count">{selectedItemsCount} item</span>
                </div>
                <div className="preview-total">
                  <strong>Rp {localTotal.toLocaleString('id-ID')}</strong>
                </div>
              </div>

              <button
                className="btn btn-primary place-order-btn"
                onClick={handlePlaceOrder}
                disabled={isProcessing || selectedItemsCount === 0}
              >
                <span className="order-icon">📋</span>
                BUAT PESANAN ({selectedItemsCount} ITEM)
              </button>

              {selectedItemsCount === 0 && (
                <p className="order-note error">
                  ⚠️ Pilih minimal 1 item untuk membuat pesanan
                </p>
              )}

              {selectedItemsCount > 0 && (
                <p className="order-note">
                  Anda akan mengisi data pemesan pada langkah selanjutnya
                </p>
              )}
            </div>
          </>
        ) : (
          // Tampilan ringkasan pesanan (setelah klik order)
          <>
            {/* Informasi Pemesan */}
            <div className="customer-info-section">
              <h3>📝 Informasi Pemesan</h3>
              <div className="form-group">
                <label>Nama Pemesan *</label>
                <input
                  type="text"
                  placeholder="Masukkan nama Anda"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  required
                  disabled={isProcessing}
                />
              </div>
              <div className="form-group">
                <label>Nomor Meja *</label>
                <input
                  type="text"
                  placeholder="Contoh: 5"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="form-input"
                  required
                  disabled={isProcessing}
                />
              </div>
              {checkoutError && (
                <div className="error-message">
                  ⚠️ {checkoutError}
                </div>
              )}
              <p className="form-note">* Wajib diisi untuk pemesanan</p>
            </div>

            {/* Ringkasan Item Pesanan (hanya yang dipilih) */}
            <div className="order-summary-items">
              <h3>📦 Detail Pesanan ({selectedItemsCount} item)</h3>
              <div className="summary-items-list">
                {getSelectedCartItems().map((item) => {
                  const itemTotal = item.price * item.quantity;
                  return (
                    <div key={item.id} className="summary-item">
                      <div className="summary-item-left">
                        <div className="summary-item-quantity">{item.quantity}x</div>
                        <div className="summary-item-name">{item.name}</div>
                      </div>
                      <div className="summary-item-price">
                        Rp {itemTotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ringkasan Pembayaran */}
            <div className="payment-summary">
              <h3>💰 Ringkasan Pembayaran</h3>
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal ({selectedItemsCount} item)</span>
                  <span>Rp {localTotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="summary-row">
                  <span>Pajak (10%)</span>
                  <span>Rp {tax.toLocaleString('id-ID')}</span>
                </div>
                <div className="summary-row">
                  <span>Biaya Layanan</span>
                  <span>Rp {serviceFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row total">
                  <span>Total Pembayaran</span>
                  <span className="total-amount">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="summary-actions">
                <button
                  className="btn btn-secondary back-to-cart-btn"
                  onClick={handleBackToCartItems}
                  disabled={isProcessing}
                >
                  ← Kembali ke Keranjang
                </button>
                <button
                  className="btn btn-primary checkout-btn"
                  onClick={handleCheckout}
                  disabled={!tableNumber.trim() || !customerName.trim() || isProcessing || !context?.user}
                >
                  {isProcessing ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <span className="payment-icon">💳</span>
                      LANJUTKAN PEMBAYARAN
                    </>
                  )}
                </button>
              </div>

              {(!context?.user || !tableNumber.trim() || !customerName.trim()) && (
                <div className="checkout-requirements">
                  <p>⚠️ Untuk melanjutkan, pastikan:</p>
                  <ul>
                    {!context?.user && <li>• Anda sudah login</li>}
                    {!customerName.trim() && <li>• Nama pemesan diisi</li>}
                    {!tableNumber.trim() && <li>• Nomor meja diisi</li>}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="bottom-nav-container">
        <nav className="bottom-nav">
          <button className="nav-item" onClick={() => navigate('/home')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          <button className="nav-item active">
            <span className="nav-icon">🛒</span>
            <span className="nav-label">Cart</span>
            {localCart.length > 0 && (
              <span className="cart-badge">{localCart.length}</span>
            )}
          </button>
          <button className="nav-item" onClick={() => navigate('/like')}>
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
};

export default Cart;