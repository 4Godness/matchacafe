import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./Cheakout.css";

const Checkout = () => {
  const navigate = useNavigate();

  // Cart dari database
  const {
    cartDB,
    user,
    loading
  } = useApp();

  const cartItems = cartDB?.items || [];
  const cartCount = cartDB?.itemCount || 0;
  const subtotal = cartDB?.subtotal || 0;
  const tax = cartDB?.tax || 0;
  const grandTotal = cartDB?.total || 0;

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const [tableNumber, setTableNumber] = useState("");

  // Ambil data user saat login
  useEffect(() => {
    if (user) {
      setCustomerInfo({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || ""
      });
    }
  }, [user]);

  // Redirect jika belum login
  useEffect(() => {
    if (!loading && !user) {
      alert('Silakan login terlebih dahulu');
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Lanjut ke pembayaran
  const handleContinueToPayment = () => {
    if (!customerInfo.name.trim()) return alert("Silakan masukkan nama lengkap");
    if (!tableNumber.trim()) return alert("Silakan masukkan nomor meja");
    if (cartItems.length === 0) return alert("Keranjang masih kosong");

    // Simpan data ke localStorage untuk PaymentMethode
    localStorage.setItem(
      "checkoutData",
      JSON.stringify({
        customerInfo,
        orderType: "dine-in",
        tableNumber: tableNumber,
        shippingAddress: `Makan di tempat - Meja ${tableNumber}`,
        timestamp: new Date().toISOString(),
      })
    );

    navigate("/payment-method");
  };

  const handleBackToCart = () => navigate("/cart");
  const handleShopNow = () => navigate("/home");

  if (loading) {
    return (
      <div className="checkout">
        <div className="loading-container">
          <div className="loading-spinner">🔄</div>
          <p>Memuat data checkout...</p>
        </div>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="checkout">
        <div className="checkout-header">
          <button className="back-btn" onClick={() => navigate('/home')}>
            ← Kembali
          </button>
          <h1 className="checkout-title">Checkout</h1>
        </div>

        <div className="empty-checkout">
          <div className="empty-cart-icon">🛒</div>
          <h2>Keranjang kosong</h2>
          <p>Tambahkan item ke keranjang terlebih dahulu</p>
          <button className="btn btn-primary" onClick={handleShopNow}>
            Belanja Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      <div className="checkout-header">
        <button className="back-btn" onClick={handleBackToCart}>
          ← Kembali ke Keranjang
        </button>
        <h1 className="checkout-title">Checkout</h1>
      </div>

      <div className="checkout-payment-content">
        {/* Order Summary */}
        <div className="order-summary-section">
          <h2 className="section-title">
            Ringkasan Pesanan ({cartCount} items)
          </h2>

          <div className="order-items-list">
            {cartItems.slice(0, 3).map((item) => (
              <div key={item.id} className="order-item-summary">
                <div className="item-info-summary">
                  <span className="item-name-summary">{item.product.name}</span>
                  <span className="item-quantity-summary">×{item.quantity}</span>
                </div>

                <span className="item-price-summary">
                  Rp {(item.product.price * item.quantity).toLocaleString("id-ID")}
                </span>
              </div>
            ))}

            {cartCount > 3 && (
              <div className="more-items-summary">
                + {cartCount - 3} item lainnya
              </div>
            )}
          </div>

          <div className="price-breakdown-summary">
            <div className="price-row-summary">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>

            <div className="price-row-summary">
              <span>Pajak (10%)</span>
              <span>Rp {tax.toLocaleString("id-ID")}</span>
            </div>

            <div className="price-divider-summary"></div>

            <div className="price-row-summary total-row">
              <span>Total</span>
              <span className="total-amount-highlight">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* Order Type */}
        <div className="section-checkout">
          <h2 className="section-title-checkout">Tipe Pemesanan</h2>
          <div className="order-type-fixed">
            <strong>🍽️ Makan di Tempat</strong>
          </div>
        </div>

        {/* Table Number */}
        <div className="section-checkout">
          <h2 className="section-title-checkout">Nomor Meja</h2>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Masukkan nomor meja"
            className="form-input-checkout table-number-input"
            required
          />
        </div>

        {/* Customer Info */}
        <div className="section-checkout">
          <h2 className="section-title-checkout">Informasi Pemesan</h2>

          <input
            type="text"
            name="name"
            value={customerInfo.name}
            onChange={handleInputChange}
            placeholder="Nama Lengkap"
            className="form-input-checkout"
          />

          <input
            type="tel"
            name="phone"
            value={customerInfo.phone}
            onChange={handleInputChange}
            placeholder="Nomor HP"
            className="form-input-checkout"
          />

          <input
            type="email"
            name="email"
            value={customerInfo.email}
            onChange={handleInputChange}
            placeholder="Email (opsional)"
            className="form-input-checkout"
          />
        </div>

        {/* Continue */}
        <div className="payment-action-checkout">
          <div className="total-section-checkout">
            <div className="total-left">
              <span className="total-label-checkout">Total Pembayaran</span>
            </div>

            <span className="total-amount-checkout">
              Rp {grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            className="pay-button-checkout"
            onClick={handleContinueToPayment}
            disabled={!customerInfo.name.trim() || !tableNumber.trim()}
          >
            Lanjut ke Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
