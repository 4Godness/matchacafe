// src/components/PaymentMethod.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./PaymentMethode.css";

const PaymentMethod = () => {
  const navigate = useNavigate();
  const { user, clearCart } = useApp();

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [countdown, setCountdown] = useState(300);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouMethod, setThankYouMethod] = useState('');

  const paymentMethods = [
    { id: 1, name: "QRIS", type: "qris", icon: "📱", description: "Scan QR untuk bayar" },
    { id: 2, name: "Bayar di Kasir", type: "cash", icon: "💵", description: "Bayar langsung di kasir" },
    { id: 3, name: "Transfer Bank", type: "transfer", icon: "🏦", description: "Transfer ke rekening bank" }
  ];

  // 🔹 FUNGSI UTAMA: SIMPAN KE DATABASE
  const saveOrderToDatabase = async (orderData) => {
    try {
      console.log("💾 Saving order to database...", orderData);

      // 1. Transform ke format SQL
      const transformedOrder = {
        order_number: orderData.orderNumber || `ORD${Date.now()}`,
        user_id: orderData.customer?.id || user?.id || null,
        total_amount: orderData.totals?.subtotal || 0,
        shipping_fee: 10000.00,
        final_amount: orderData.totals?.grandTotal || 0,
        status: 'processing', // Langsung ke processing setelah bayar
        payment_method: orderData.payment?.method || 'cash',
        payment_status: 'paid', // Langsung paid karena user konfirmasi
        customer_name: orderData.customer?.name || 'Guest',
        customer_phone: orderData.customer?.phone || '',
        customer_email: orderData.customer?.email || '',
        table_number: orderData.customer?.tableNumber || '',
        notes: orderData.notes || '',
        created_at: new Date().toISOString(),
      };

      // 2. Simpan ke localStorage (backup)
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.push({
        ...transformedOrder,
        items: orderData.items,
        savedAt: new Date().toISOString()
      });
      localStorage.setItem('orders', JSON.stringify(existingOrders));
      localStorage.setItem('lastOrder', JSON.stringify(transformedOrder));

      // 3. Kirim ke server (jika API tersedia)
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');

      if (token && apiUrl) {
        console.log("🌐 Sending to server...");

        // Siapkan items untuk order_items table
        const orderItems = orderData.items.map(item => ({
          product_id: item.id || 0,
          quantity: item.quantity || 1,
          price: item.price || 0,
          subtotal: (item.price || 0) * (item.quantity || 1)
        }));

        const payload = {
          order: transformedOrder,
          items: orderItems
        };

        const response = await fetch(`${apiUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Order saved to server:", result);
          return { ...result, savedToServer: true };
        } else {
          console.warn("⚠️ Server response not OK, using localStorage");
        }
      }

      return {
        success: true,
        message: 'Order saved successfully',
        orderId: transformedOrder.order_number,
        savedToServer: false,
        savedLocally: true
      };

    } catch (error) {
      console.error("❌ Error saving order:", error);
      // Tetap return success karena sudah disimpan di localStorage
      return {
        success: true,
        message: 'Order saved to local storage',
        savedLocally: true,
        error: error.message
      };
    }
  };

  // 🔹 LOAD DATA AWAL
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);

        // Cek login
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token || !userStr) {
          alert('Silakan login kembali');
          navigate('/login');
          return;
        }

        // Load cart
        const savedCart = localStorage.getItem('cart');
        const cartItems = savedCart ? JSON.parse(savedCart) : [];
        if (cartItems.length === 0) {
          alert('Keranjang kosong');
          navigate('/cart');
          return;
        }

        // Load checkout data
        const savedCheckout = localStorage.getItem('checkoutData');
        const checkoutInfo = savedCheckout ? JSON.parse(savedCheckout) : {};

        // Hitung total
        const subtotal = cartItems.reduce((sum, item) =>
          sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
        const tax = subtotal * 0.1;
        const serviceFee = 5000;
        const grandTotal = subtotal + tax + serviceFee;

        // Buat order data
        const preparedOrderData = {
          orderNumber: `ORD${Date.now().toString().slice(-8)}`,
          customer: {
            id: user?.id,
            name: checkoutInfo.customerInfo?.name || JSON.parse(userStr).name || "Guest",
            tableNumber: checkoutInfo.customerInfo?.tableNumber || "1",
            phone: checkoutInfo.customerInfo?.phone || "",
            email: JSON.parse(userStr).email || ""
          },
          items: cartItems.map(item => ({
            id: item.id || item.product_id || item._id,
            name: item.name || item.product_name || "Produk",
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 1
          })),
          totals: { subtotal, tax, serviceFee, grandTotal },
          payment: { method: null, status: 'pending' },
          status: 'pending',
          notes: checkoutInfo.customerInfo?.notes || "",
          createdAt: new Date().toISOString()
        };

        setOrderData(preparedOrderData);
        setIsLoading(false);

      } catch (error) {
        console.error('Error initializing:', error);
        setIsLoading(false);
        navigate('/cart');
      }
    };

    initializeData();
  }, []);

  // 🔹 HANDLE KONFIRMASI PEMBAYARAN
  const handleConfirmPayment = async () => {
    try {
      setIsProcessing(true);

      const finalOrderData = {
        ...orderData,
        payment: {
          method: selectedPayment.type,
          status: 'paid',
          paidAt: new Date().toISOString()
        },
        status: 'processing',
        updatedAt: new Date().toISOString()
      };

      // ⭐⭐⭐ SIMPAN KE DATABASE ⭐⭐⭐
      const saveResult = await saveOrderToDatabase(finalOrderData);
      console.log('💾 Save result:', saveResult);

      // Clear data
      if (clearCart) clearCart();
      localStorage.removeItem('cart');
      localStorage.removeItem('checkoutData');

      setPaymentCompleted(true);

      // Redirect setelah 3 detik
      setTimeout(() => {
        alert(`✅ Pesanan berhasil!\nNo: ${finalOrderData.orderNumber}\nTotal: Rp ${finalOrderData.totals.grandTotal.toLocaleString('id-ID')}`);
        navigate('/home');
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      alert('Gagal memproses pembayaran');
      setIsProcessing(false);
    }
  };

  // 🔹 HANDLE KLIK "SUDAH BAYAR/TRANSFER"
  const handlePaymentComplete = (methodType) => {
    console.log(`🎉 Konfirmasi ${methodType}`);
    setThankYouMethod(methodType);
    setShowThankYou(true);

    // Tunggu 2 detik lalu simpan ke DB
    setTimeout(() => {
      handleConfirmPayment();
    }, 2000);
  };

  // 🔹 FORMAT WAKTU
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== RENDER SCREEN ==========

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner">🔄</div>
        <p>Memuat...</p>
      </div>
    );
  }

  // 1. QRIS SCREEN
  if (showPaymentScreen && selectedPayment?.type === "qris") {
    return (
      <div className="payment-screen">
        <div className="screen-header">
          <button className="back-btn" onClick={() => setShowPaymentScreen(false)}>← Kembali</button>
          <h1>QRIS Payment</h1>
        </div>

        <div className="screen-content">
          {/* Timer */}
          {countdown > 0 && (
            <div className="timer">
              <span>Batas waktu: </span>
              <strong className={countdown < 60 ? 'warning' : ''}>
                {formatTime(countdown)}
              </strong>
            </div>
          )}

          {/* QR Code */}
          <div className="qr-container">
            <div className="qr-placeholder">
              <div className="qr-box">
                <div className="qr-pattern"></div>
                <div className="qr-text">QRIS</div>
              </div>
              <div className="qr-amount">
                Rp {orderData?.totals?.grandTotal?.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="order-info-card">
            <h3>Detail Pesanan</h3>
            <div className="info-row">
              <span>Order ID:</span>
              <strong>{orderData?.orderNumber}</strong>
            </div>
            <div className="info-row">
              <span>Nama:</span>
              <strong>{orderData?.customer?.name}</strong>
            </div>
            <div className="info-row">
              <span>Meja:</span>
              <strong>{orderData?.customer?.tableNumber}</strong>
            </div>
            <div className="info-row total">
              <span>Total:</span>
              <strong>Rp {orderData?.totals?.grandTotal?.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          {/* Thank You Message */}
          {showThankYou && thankYouMethod === 'qris' ? (
            <div className="thank-you-card">
              <div className="thank-you-icon">🎉</div>
              <h3>Terima Kasih Sudah Berbelanja!</h3>
              <div className="processing">
                <div className="small-spinner"></div>
                <p>Menyelesaikan pesanan...</p>
              </div>
            </div>
          ) : paymentCompleted ? (
            <div className="success-card">
              <div className="success-icon">✅</div>
              <h3>Pesanan Berhasil!</h3>
              <p>Mengarahkan ke halaman utama...</p>
            </div>
          ) : (
            <button
              className="confirm-btn"
              onClick={() => handlePaymentComplete('qris')}
              disabled={isProcessing || countdown === 0}
            >
              {isProcessing ? 'Memproses...' : '✅ Saya Sudah Bayar'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. CASH SCREEN
  if (showPaymentScreen && selectedPayment?.type === "cash") {
    return (
      <div className="payment-screen">
        <div className="screen-header">
          <button className="back-btn" onClick={() => setShowPaymentScreen(false)}>← Kembali</button>
          <h1>Bayar di Kasir</h1>
        </div>

        <div className="screen-content">
          <div className="method-icon-large">💵</div>
          <h2>Silakan bayar di kasir</h2>

          <div className="order-code">
            <div className="code-label">KODE PESANAN</div>
            <div className="code-value">{orderData?.orderNumber}</div>
          </div>

          <div className="instruction-card">
            <h3>Panduan:</h3>
            <ol>
              <li>Tunjukkan <strong>Kode Pesanan</strong> di atas ke kasir</li>
              <li>Bayar sesuai total</li>
              <li>Tunggu konfirmasi kasir</li>
              <li>Pesanan akan diproses dapur</li>
            </ol>
          </div>

          {/* Thank You Message - SAMA SEPERTI QRIS */}
          {showThankYou && thankYouMethod === 'cash' ? (
            <div className="thank-you-card">
              <div className="thank-you-icon">🎉</div>
              <h3>Terima Kasih Sudah Berbelanja!</h3>
              <div className="processing">
                <div className="small-spinner"></div>
                <p>Menyimpan pesanan...</p>
              </div>
            </div>
          ) : paymentCompleted ? (
            <div className="success-card">
              <div className="success-icon">✅</div>
              <h3>Pesanan Tercatat!</h3>
              <p>Silakan lanjutkan pembayaran di kasir</p>
            </div>
          ) : (
            <button
              className="confirm-btn"
              onClick={() => handlePaymentComplete('cash')}
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : '✅ Lanjutkan ke Kasir'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. TRANSFER SCREEN
  if (showPaymentScreen && selectedPayment?.type === "transfer") {
    const bankAccounts = [
      { bank: "BCA", number: "1234-5678-9012", name: "RESTORAN KITA", code: "014" },
      { bank: "Mandiri", number: "9876-5432-1098", name: "RESTORAN KITA", code: "008" },
      { bank: "BNI", number: "8765-4321-0987", name: "RESTORAN KITA", code: "009" }
    ];

    return (
      <div className="payment-screen">
        <div className="screen-header">
          <button className="back-btn" onClick={() => setShowPaymentScreen(false)}>← Kembali</button>
          <h1>Transfer Bank</h1>
        </div>

        <div className="screen-content">
          <div className="method-icon-large">🏦</div>
          <h2>Transfer Bank</h2>

          <div className="bank-list">
            <h3>Rekening Tujuan:</h3>
            {bankAccounts.map((acc, idx) => (
              <div key={idx} className="bank-card">
                <div className="bank-name">{acc.bank}</div>
                <div className="account-number">{acc.number}</div>
                <div className="account-name">a/n {acc.name}</div>
                <div className="bank-code">Kode: {acc.code}</div>
              </div>
            ))}
          </div>

          <div className="instruction-card">
            <h3>Panduan Transfer:</h3>
            <ol>
              <li>Transfer ke salah satu rekening di atas</li>
              <li>Jumlah: <strong>Rp {orderData?.totals?.grandTotal?.toLocaleString('id-ID')}</strong></li>
              <li>Keterangan: <strong>{orderData?.orderNumber}</strong></li>
              <li>Simpan bukti transfer</li>
            </ol>
          </div>

          {/* Thank You Message - SAMA SEPERTI METODE LAIN */}
          {showThankYou && thankYouMethod === 'transfer' ? (
            <div className="thank-you-card">
              <div className="thank-you-icon">🎉</div>
              <h3>Terima Kasih Sudah Berbelanja!</h3>
              <div className="processing">
                <div className="small-spinner"></div>
                <p>Menyimpan data transfer...</p>
              </div>
            </div>
          ) : paymentCompleted ? (
            <div className="success-card">
              <div className="success-icon">✅</div>
              <h3>Konfirmasi Diterima!</h3>
              <p>Pesanan akan diproses setelah pembayaran diverifikasi</p>
            </div>
          ) : (
            <button
              className="confirm-btn"
              onClick={() => handlePaymentComplete('transfer')}
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses...' : '✅ Saya Sudah Transfer'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========== MAIN SELECTION SCREEN ==========
  return (
    <div className="payment-method">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/cart')}>← Keranjang</button>
        <h1>Pilih Pembayaran</h1>
      </div>

      <div className="content">
        {/* Order Summary */}
        <div className="summary-section">
          <h2>Ringkasan Pesanan</h2>
          <div className="summary-card">
            <div className="order-id">Order: {orderData?.orderNumber}</div>
            <div className="customer">Meja: {orderData?.customer?.tableNumber} | {orderData?.customer?.name}</div>
            <div className="items-preview">
              {orderData?.items?.slice(0, 2).map((item, idx) => (
                <div key={idx} className="item">
                  <span>{item.name}</span>
                  <span>×{item.quantity}</span>
                  <span>Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                </div>
              ))}
              {orderData?.items?.length > 2 && (
                <div className="more">+{orderData.items.length - 2} item lainnya</div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="methods-section">
          <h2>Metode Pembayaran</h2>
          <div className="methods-grid">
            {paymentMethods.map(method => (
              <div
                key={method.id}
                className={`method-card ${selectedPayment?.id === method.id ? 'selected' : ''}`}
                onClick={() => setSelectedPayment(method)}
              >
                <div className="card-icon">{method.icon}</div>
                <div className="card-content">
                  <h3>{method.name}</h3>
                  <p>{method.description}</p>
                </div>
                <div className="card-check">
                  {selectedPayment?.id === method.id ? '✓' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="terms-section">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={e => setAgreeToTerms(e.target.checked)}
            />
            <span>Saya setuju dengan Syarat & Ketentuan</span>
          </label>
        </div>

        {/* Total */}
        <div className="total-section">
          <h2>Total Pembayaran</h2>
          <div className="total-card">
            <div className="row">
              <span>Subtotal</span>
              <span>Rp {orderData?.totals?.subtotal?.toLocaleString('id-ID')}</span>
            </div>
            <div className="row">
              <span>Pajak (10%)</span>
              <span>Rp {orderData?.totals?.tax?.toLocaleString('id-ID')}</span>
            </div>
            <div className="row">
              <span>Biaya Layanan</span>
              <span>Rp {orderData?.totals?.serviceFee?.toLocaleString('id-ID')}</span>
            </div>
            <div className="divider"></div>
            <div className="row total">
              <span>Total</span>
              <strong>Rp {orderData?.totals?.grandTotal?.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>

        {/* Proceed Button */}
        <div className="proceed-section">
          <button
            className="proceed-btn"
            onClick={() => setShowPaymentScreen(true)}
            disabled={!selectedPayment || !agreeToTerms}
            style={{
              backgroundColor: !selectedPayment || !agreeToTerms ? '#ccc' : '#4CAF50',
              cursor: !selectedPayment || !agreeToTerms ? 'not-allowed' : 'pointer'
            }}
          >
            {!selectedPayment && 'Pilih metode pembayaran'}
            {selectedPayment && !agreeToTerms && 'Setujui syarat & ketentuan'}
            {selectedPayment && agreeToTerms && 'LANJUTKAN KE PEMBAYARAN →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;