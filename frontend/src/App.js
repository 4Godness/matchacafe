// src/App.js - VERSI DIPERBAIKI
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from './AppContext';

// Import komponen sesuai dengan cara export mereka
// Beberapa named export, beberapa default export

// NAMED EXPORTS (import dengan kurung kurawal)
import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { SingUp } from "./components/SingUp";
import { ForgotPassword } from "./components/ForgotPassword";
import { Like } from "./components/Like";
import { Loading } from "./components/Loading";

// DEFAULT EXPORTS (import tanpa kurung kurawal)
import Profil from "./components/Profil";
import Cart from "./components/cart";
import Cheakout from "./components/Cheakout"; // file namanya Cheakout.js
import PaymentMethode from "./components/PaymentMethode"; // file namanya PaymentMethode.js

// Protected Route Component - VERSI SIMPLE
const ProtectedRoute = ({ children }) => {
  console.log("🔒 ProtectedRoute checking...");

  // Cek dari localStorage
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  // Parse user jika ada
  let user = null;
  if (userString && userString !== 'null' && userString !== 'undefined') {
    try {
      user = JSON.parse(userString);
      console.log("✅ Parsed user:", user);
    } catch (error) {
      console.error("❌ Error parsing user:", error);
    }
  }

  // Cukup token ATAU user yang valid
  const isAuthenticated = (
    (token && token !== 'null' && token !== 'undefined') ||
    (user && (user.id || user.email || user.name))
  );

  console.log("🔐 isAuthenticated:", isAuthenticated);

  if (!isAuthenticated) {
    console.log("⛔ Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("✅ Authenticated, rendering children");
  return children;
};

// Debug Component untuk testing
const DebugPage = () => {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>🛠️ Debug Page</h1>
      <p>Gunakan halaman ini untuk testing localStorage</p>

      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>LocalStorage Status</h3>
        <p><strong>Token:</strong> {localStorage.getItem('token') || '❌ No token'}</p>
        <p><strong>User:</strong> {localStorage.getItem('user') || '❌ No user'}</p>
        <p><strong>Username:</strong> {localStorage.getItem('username') || '❌ No username'}</p>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '300px'
      }}>
        <button
          onClick={() => {
            // Create test user
            const testUser = {
              id: 1,
              name: "Karina",
              email: "karina@example.com",
              phone: "08123456789",
              address: "Jl. Matcha No. 123, Jakarta",
              created_at: new Date().toISOString()
            };
            localStorage.setItem('user', JSON.stringify(testUser));
            localStorage.setItem('token', 'test_token_' + Date.now());
            localStorage.setItem('username', 'Karina');
            alert('✅ Test user created!\nName: Karina\nToken: test_token_' + Date.now());
            window.location.reload();
          }}
          style={{
            padding: '15px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🧪 Set Test User (Karina)
        </button>

        <button
          onClick={() => {
            localStorage.clear();
            alert('🧹 All localStorage cleared!');
            window.location.reload();
          }}
          style={{
            padding: '15px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🗑️ Clear All LocalStorage
        </button>

        <button
          onClick={() => {
            window.location.href = '/home';
          }}
          style={{
            padding: '15px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🏠 Go to Home
        </button>

        <button
          onClick={() => {
            window.location.href = '/profile';
          }}
          style={{
            padding: '15px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          👤 Go to Profile (Test)
        </button>

        <button
          onClick={() => {
            console.log("🔄 Reloading page...");
            window.location.reload();
          }}
          style={{
            padding: '15px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 Reload Page
        </button>
      </div>

      <div style={{ marginTop: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
        <h3>🔄 Testing Routes</h3>
        <p>Test link ke berbagai halaman:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
          <a href="/login" style={{ padding: '10px', backgroundColor: '#E0E0E0', borderRadius: '5px', textDecoration: 'none', color: '#333' }}>/login</a>
          <a href="/home" style={{ padding: '10px', backgroundColor: '#E0E0E0', borderRadius: '5px', textDecoration: 'none', color: '#333' }}>/home</a>
          <a href="/profile" style={{ padding: '10px', backgroundColor: '#E0E0E0', borderRadius: '5px', textDecoration: 'none', color: '#333' }}>/profile</a>
          <a href="/cart" style={{ padding: '10px', backgroundColor: '#E0E0E0', borderRadius: '5px', textDecoration: 'none', color: '#333' }}>/cart</a>
          <a href="/like" style={{ padding: '10px', backgroundColor: '#E0E0E0', borderRadius: '5px', textDecoration: 'none', color: '#333' }}>/like</a>
          <a href="/debug" style={{ padding: '10px', backgroundColor: '#4CAF50', borderRadius: '5px', textDecoration: 'none', color: 'white' }}>/debug</a>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <div className="mobile-frame">
        <Router>
          <Routes>
            {/* Debug route - bisa diakses tanpa login */}
            <Route path="/debug" element={<DebugPage />} />

            {/* Default route redirects */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/app" element={<Navigate to="/home" />} />

            {/* Public routes - Tidak memerlukan autentikasi */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SingUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/loading" element={<Loading />} />

            {/* Untuk testing, gunakan tanpa ProtectedRoute dulu */}

            {/* Home - testing tanpa protection */}
            <Route path="/home" element={<Home />} />

            {/* Profile - testing tanpa protection */}
            <Route path="/profile" element={<Profil />} />

            {/* Cart - testing tanpa protection */}
            <Route path="/cart" element={<Cart />} />

            {/* Like - testing tanpa protection */}
            <Route path="/like" element={<Like />} />

            {/* Checkout - testing tanpa protection */}
            <Route path="/checkout" element={<Cheakout />} />

            {/* Payment Method - testing tanpa protection */}
            <Route path="/payment-method" element={<PaymentMethode />} />

            {/* VERSI DENGAN PROTECTED ROUTE (KOMENTARI SAAT INI UNTUK TESTING) */}
            {/*
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profil />
              </ProtectedRoute>
            } />

            <Route path="/cart" element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } />

            <Route path="/like" element={
              <ProtectedRoute>
                <Like />
              </ProtectedRoute>
            } />

            <Route path="/checkout" element={
              <ProtectedRoute>
                <Cheakout />
              </ProtectedRoute>
            } />

            <Route path="/payment-method" element={
              <ProtectedRoute>
                <PaymentMethode />
              </ProtectedRoute>
            } />
            */}

            {/* Redirect untuk berbagai kemungkinan penulisan */}
            <Route path="/Home" element={<Navigate to="/home" />} />
            <Route path="/Cart" element={<Navigate to="/cart" />} />
            <Route path="/Like" element={<Navigate to="/like" />} />
            <Route path="/Loading" element={<Navigate to="/loading" />} />
            <Route path="/Profil" element={<Navigate to="/profile" />} />
            <Route path="/Profile" element={<Navigate to="/profile" />} />
            <Route path="/payment" element={<Navigate to="/payment-method" />} />
            <Route path="/Payment" element={<Navigate to="/payment-method" />} />
            <Route path="/PaymentMethod" element={<Navigate to="/payment-method" />} />
            <Route path="/PaymentMethode" element={<Navigate to="/payment-method" />} />
            <Route path="/checkout" element={<Navigate to="/checkout" />} />
            <Route path="/Checkout" element={<Navigate to="/checkout" />} />
            <Route path="/Cheakout" element={<Navigate to="/checkout" />} />
            <Route path="/singup" element={<Navigate to="/signup" />} />
            <Route path="/SingUp" element={<Navigate to="/signup" />} />
            <Route path="/forgotpassword" element={<Navigate to="/forgot-password" />} />
            <Route path="/ForgotPassword" element={<Navigate to="/forgot-password" />} />

            {/* 404 fallback */}
            <Route path="*" element={
              <div style={{ padding: 20, textAlign: 'center' }}>
                <h1>404 - Page Not Found</h1>
                <p>Halaman yang Anda cari tidak ditemukan.</p>
                <button onClick={() => window.location.href = '/'}>
                  Go to Login
                </button>
                <button onClick={() => window.location.href = '/home'} style={{ marginLeft: '10px' }}>
                  Go to Home
                </button>
                <button onClick={() => window.location.href = '/debug'} style={{ marginLeft: '10px' }}>
                  Debug Page
                </button>
              </div>
            } />
          </Routes>
        </Router>
      </div>
    </AppProvider>
  );
}

export default App;