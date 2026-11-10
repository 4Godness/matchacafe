import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import "./Home.css";

export const Home = () => {
  const navigate = useNavigate();
  const {
    products = [],
    currentCategory = 'All',
    favorites = [],
    user = {},
    cart = [],
    addToCart,
    setCurrentCategory,
    toggleFavorite,
    isProductInFavorites
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [cartNotice, setCartNotice] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const categoryRailRef = useRef(null);
  const categoryDragRef = useRef(null);

  const [displayProducts, setDisplayProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // State untuk user login check
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // PERBAIKAN: Sinkronisasi user data dari berbagai sumber
  useEffect(() => {
    const syncUserData = () => {
      console.log("🔄 Syncing user data...");

      // 1. Cek dari context user (prioritas tertinggi)
      if (user && (user.id || user.email || user.name)) {
        console.log("✅ User from context:", user);
        setUserData(user);
        setIsUserLoggedIn(true);
        return;
      }

      // 2. Cek localStorage untuk user data
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && (parsedUser.id || parsedUser.email || parsedUser.name)) {
            console.log("✅ User from localStorage:", parsedUser);
            setUserData(parsedUser);
            setIsUserLoggedIn(true);
            return;
          }
        } catch (error) {
          console.error("❌ Error parsing stored user:", error);
        }
      }

      // 3. Cek token
      const token = localStorage.getItem('token');
      if (token && token !== 'null' && token !== 'undefined') {
        console.log("✅ Token exists");
        setIsUserLoggedIn(true);
        if (!userData) {
          setUserData({
            id: 'guest-' + Date.now(),
            name: 'Guest User',
            email: 'guest@example.com'
          });
        }
        return;
      }

      // 4. Tidak ada user data ditemukan
      console.log("❌ No user data found");
      setUserData(null);
      setIsUserLoggedIn(false);
    };

    syncUserData();
  }, [user]); // Dependency pada user context

  // PERBAIKAN: Handle profile navigation - FIXED!
  const handleProfileNavigation = () => {
    console.log("👤 Profile button clicked");
    console.log("isUserLoggedIn:", isUserLoggedIn);
    console.log("userData:", userData);
    console.log("context user:", user);

    // PERBAIKAN: Fungsi untuk mengecek status login secara komprehensif
    const checkLoginStatus = () => {
      // Cek dari state isUserLoggedIn
      if (isUserLoggedIn) {
        console.log("✅ Status: Logged in (from state)");
        return true;
      }

      // Cek dari userData state
      if (userData && (userData.id || userData.email || userData.name)) {
        console.log("✅ Status: Logged in (from userData)");
        return true;
      }

      // Cek dari context user
      if (user && (user.id || user.email || user.name)) {
        console.log("✅ Status: Logged in (from context)");
        return true;
      }

      // Cek localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && (parsedUser.id || parsedUser.email || parsedUser.name)) {
            console.log("✅ Status: Logged in (from localStorage)");
            return true;
          }
        } catch (e) {
          console.error("Error parsing user:", e);
        }
      }

      // Cek token
      const token = localStorage.getItem('token');
      if (token && token !== 'null' && token !== 'undefined') {
        console.log("✅ Status: Logged in (has token)");
        return true;
      }

      console.log("❌ Status: Not logged in");
      return false;
    };

    const isLoggedIn = checkLoginStatus();

    if (isLoggedIn) {
      console.log("✅ Navigating to /profile");
      // Navigasi langsung ke profile
      navigate('/profile');
    } else {
      console.log("❌ Redirecting to /login");
      alert('Silakan login terlebih dahulu');
      navigate('/login');
    }
  };

  // Fungsi untuk force login (testing)
  const handleForceLogin = () => {
    console.log("🔧 Force login for testing");

    // Create test user (sesuai dengan gambar: "Halo, Karina!")
    const testUser = {
      id: 1,
      name: "Karina",
      email: "karina@example.com",
      phone: "08123456789",
      address: "Jl. Matcha No. 123",
      created_at: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(testUser));
    localStorage.setItem('token', 'test_token_' + Date.now());

    // Update state
    setUserData(testUser);
    setIsUserLoggedIn(true);

    console.log("✅ Created test user:", testUser);

    // Beri pesan dan navigasi ke profile
    setTimeout(() => {
      alert('Login berhasil sebagai Karina! Klik Profile lagi.');
      console.log("✅ Ready to navigate to profile");
    }, 300);
  };

  // Click outside untuk tutup notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mapping gambar untuk setiap produk
  const productImages = {
    // Matcha Specials
    'strawberry matcha latte': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&h=700&fit=crop',
    'matcha tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=700&fit=crop',
    'strawberry cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&h=700&fit=crop',
    'brown sugar boba': 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800&h=700&fit=crop',
    'peach jasmine tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=700&fit=crop',
    'iced vanilla latte': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=700&fit=crop',
    'chicken katsu curry': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=700&fit=crop',
    'chicken pesto sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=700&fit=crop',
    'nasi goreng kampung': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=700&fit=crop',
    'matcha': 'https://images.unsplash.com/photo-1564894809616-9ee244c19460?w=400&h=400&fit=crop',
    'matcha latte': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&h=400&fit=crop',
    'matcha ice cream': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop',
    'matcha cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
    'matcha tiramisu': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
    'matcha cheesecake': 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400&h=400&fit=crop',
    'matcha brownies': 'https://images.unsplash.com/photo-1606313564200-75f2d4fa383b?w=400&h=400&fit=crop',
    'matcha cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop',
    'matcha pudding': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
    'matcha smoothie': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=400&fit=crop',
    'matcha frappe': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&h=400&fit=crop',
    'matcha macaron': 'https://images.unsplash.com/photo-1509474520651-22964b6d0354?w=400&h=400&fit=crop',
    'matcha mochi': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'matcha donut': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
    'matcha waffle': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&h=400&fit=crop',
    'matcha pancake': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop',
    'strawberry matcha': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&h=400&fit=crop',
    'matcha parfait': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop',
    'matcha tart': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
    'matcha roll cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',

    // Minuman - Coffee
    'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop',
    'latte': 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&h=400&fit=crop',
    'americano': 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=400&h=400&fit=crop',
    'espresso': 'https://images.unsplash.com/photo-1510707577719-ae7c9b788690?w=400&h=400&fit=crop',
    'coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    'mocha': 'https://images.unsplash.com/photo-1471201188680-b5c0e7573276?w=400&h=400&fit=crop',

    // Minuman - Tea & Others
    'green tea': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400&h=400&fit=crop',
    'tea': 'https://images.unsplash.com/photo-1564894809616-9ee244c19460?w=400&h=400&fit=crop',
    'black tea': 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=400&h=400&fit=crop',
    'chai': 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=400&h=400&fit=crop',
    'milk tea': 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=400&h=400&fit=crop',
    'bubble tea': 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=400&h=400&fit=crop',
    'juice': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop',
    'smoothie': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=400&fit=crop',
    'milkshake': 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&h=400&fit=crop',
    'soda': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop',
    'lemonade': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop',

    // Makanan - Western
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
    'steak': 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=400&fit=crop',
    'pasta': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop',
    'sandwich': 'https://images.unsplash.com/photo-1485451456034-3f9391c6f769?w=400&h=400&fit=crop',
    'french fries': 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=400&fit=crop',

    // Makanan - Asian
    'nasi goreng': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    'mie goreng': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=400&fit=crop',
    'ayam goreng': 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=400&h=400&fit=crop',
    'sushi': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=400&fit=crop',
    'ramen': 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&h=400&fit=crop',

    // Dessert & Snack
    'chocolate cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
    'cheesecake': 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400&h=400&fit=crop',
    'croissant': 'https://images.unsplash.com/photo-1555507036-ab794f27d2e9?w=400&h=400&fit=crop',
    'donut': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
    'ice cream': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop',
    'cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop',
    'brownies': 'https://images.unsplash.com/photo-1606313564200-75f2d4fa383b?w=400&h=400&fit=crop',
    'tiramisu': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
    'waffle': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&h=400&fit=crop',
    'pancake': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop',

    // Other Category Items
    'salad': 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=400&h=400&fit=crop',
    'soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop',
    'bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'egg': 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=400&fit=crop',

    // Default images for categories
    'minuman_default': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop',
    'makanan_default': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop',
    'dessert_default': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
    'other_default': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop'
  };

  // NORMALISASI KATEGORI
  const normalizeCategory = (category) => {
    if (!category) return 'Other';

    const c = category.toLowerCase().trim();

    if (['makanan', 'food', 'foods', 'main course', 'main dish', 'meal'].includes(c)) return 'Makanan';
    if (['minuman', 'drink', 'drinks', 'beverage', 'beverages', 'juice', 'coffee', 'tea'].includes(c)) return 'Minuman';
    if (['dessert', 'snack', 'snacks', 'desserts', 'pastry', 'cake', 'cakes', 'bakery', 'sweet'].includes(c))
      return 'Dessert';

    return 'Other';
  };

  // Mendapatkan URL gambar untuk produk
  const getProductImage = (product) => {
    if (product.image && product.image.startsWith('http')) return product.image;

    const productName = (product.name || '').toLowerCase();

    for (const [key, url] of Object.entries(productImages).sort((a, b) => b[0].length - a[0].length)) {
      if (productName.includes(key)) {
        return url;
      }
    }

    const category = normalizeCategory(product.category);
    switch (category) {
      case 'Makanan': return productImages.makanan_default;
      case 'Minuman': return productImages.minuman_default;
      case 'Dessert': return productImages.dessert_default;
      default: return productImages.other_default;
    }
  };

  // KATEGORI DISPLAY
  const displayCategories = [
    { id: 1, name: 'All', icon: '🍽️', color: '#4CAF50' },
    { id: 2, name: 'Makanan', icon: '🍔', color: '#FF5722' },
    { id: 3, name: 'Minuman', icon: '🥤', color: '#2196F3' },
    { id: 4, name: 'Dessert', icon: '🍰', color: '#E91E63' },
    { id: 5, name: 'Matcha Special', icon: '🍵', color: '#4CAF50' },
    { id: 6, name: 'Other', icon: '📦', color: '#9C27B0' },
  ];

  // Load produk
  useEffect(() => {
    console.log("🏠 Home mounted - Products from context:", products?.length || 0);
    setIsLoading(true);

    const timer = setTimeout(() => {
      let productsToShow = [];

      if (Array.isArray(products) && products.length > 0) {
        console.log("✅ Using products from context");
        productsToShow = products.map(p => ({
          ...p,
          image: getProductImage(p),
          category: normalizeCategory(p.category)
        }));
      }
      else {
        const cachedProducts = localStorage.getItem('cached_products');
        if (cachedProducts) {
          try {
            const parsed = JSON.parse(cachedProducts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log("✅ Using products from cache");
              productsToShow = parsed.map(p => ({
                ...p,
                image: getProductImage(p),
                category: normalizeCategory(p.category)
              }));
            }
          } catch (e) {
            console.error("Cache error:", e);
          }
        }

        if (productsToShow.length === 0) {
          console.log("📋 Using sample products");
          productsToShow = getSampleProducts();
        }
      }

      // Sort untuk highlight matcha products
      productsToShow.sort((a, b) => {
        const aIsMatcha = a.name.toLowerCase().includes('matcha');
        const bIsMatcha = b.name.toLowerCase().includes('matcha');
        if (aIsMatcha && !bIsMatcha) return -1;
        if (!aIsMatcha && bIsMatcha) return 1;
        return 0;
      });

      setDisplayProducts(productsToShow);

      const uniqueCats = ['All'];
      productsToShow.forEach(p => {
        if (p.category && !uniqueCats.includes(p.category)) {
          uniqueCats.push(p.category);
        }
      });
      setCategories(uniqueCats);
      setIsLoading(false);

    }, 300);

    return () => clearTimeout(timer);
  }, [products]);

  // Sample produk fallback
  const getSampleProducts = () => {
    const samples = [
      // ========== MATCHA SPECIALS (20 PRODUK) ==========
      { id: 1, name: 'Matcha Latte', description: 'Creamy matcha green tea with steamed milk', price: 32000, category: 'Minuman', isMatcha: true },
      { id: 2, name: 'Strawberry Matcha', description: 'Matcha layered with strawberry puree', price: 35000, category: 'Minuman', isMatcha: true },
      { id: 3, name: 'Matcha Ice Cream', description: 'Premium matcha flavored ice cream', price: 25000, category: 'Dessert', isMatcha: true },
      { id: 4, name: 'Matcha Cheesecake', description: 'Creamy cheesecake with matcha flavor', price: 38000, category: 'Dessert', isMatcha: true },
      { id: 5, name: 'Matcha Brownies', description: 'Fudgy brownies with matcha swirl', price: 28000, category: 'Dessert', isMatcha: true },
      { id: 6, name: 'Matcha Frappe', description: 'Iced matcha blended with ice cream', price: 35000, category: 'Minuman', isMatcha: true },
      { id: 7, name: 'Matcha Macaron', description: 'French macarons with matcha filling', price: 20000, category: 'Dessert', isMatcha: true },
      { id: 8, name: 'Matcha Mochi', description: 'Soft rice cakes filled with matcha paste', price: 22000, category: 'Dessert', isMatcha: true },
      { id: 9, name: 'Matcha Donut', description: 'Glazed donut with matcha icing', price: 18000, category: 'Dessert', isMatcha: true },
      { id: 10, name: 'Matcha Waffle', description: 'Crispy waffle with matcha batter', price: 32000, category: 'Dessert', isMatcha: true },
      { id: 11, name: 'Matcha Pancake', description: 'Fluffy pancakes with matcha syrup', price: 35000, category: 'Dessert', isMatcha: true },
      { id: 12, name: 'Matcha Smoothie', description: 'Refreshing matcha banana smoothie', price: 30000, category: 'Minuman', isMatcha: true },
      { id: 13, name: 'Matcha Tiramisu', description: 'Italian dessert with matcha twist', price: 38000, category: 'Dessert', isMatcha: true },
      { id: 14, name: 'Matcha Cookies', description: 'Crispy cookies with matcha chips', price: 20000, category: 'Dessert', isMatcha: true },
      { id: 15, name: 'Matcha Pudding', description: 'Silky smooth matcha pudding', price: 22000, category: 'Dessert', isMatcha: true },
      { id: 16, name: 'Matcha Parfait', description: 'Layered dessert with matcha cream', price: 35000, category: 'Dessert', isMatcha: true },
      { id: 17, name: 'Matcha Tart', description: 'Buttery tart with matcha custard', price: 32000, category: 'Dessert', isMatcha: true },
      { id: 18, name: 'Matcha Roll Cake', description: 'Swiss roll with matcha cream', price: 30000, category: 'Dessert', isMatcha: true },
      { id: 19, name: 'Iced Matcha', description: 'Pure matcha served over ice', price: 28000, category: 'Minuman', isMatcha: true },
      { id: 20, name: 'Matcha Affogato', description: 'Matcha ice cream with espresso shot', price: 35000, category: 'Dessert', isMatcha: true },

      // ========== MINUMAN LAINNYA ==========
      { id: 21, name: 'Cappuccino', description: 'Coffee with milk foam', price: 25000, category: 'Minuman' },
      { id: 22, name: 'Americano', description: 'Strong black coffee', price: 20000, category: 'Minuman' },
      { id: 23, name: 'Espresso', description: 'Concentrated coffee', price: 18000, category: 'Minuman' },
      { id: 24, name: 'Mocha', description: 'Chocolate coffee', price: 28000, category: 'Minuman' },
      { id: 25, name: 'Orange Juice', description: 'Fresh orange juice', price: 20000, category: 'Minuman' },
      { id: 26, name: 'Green Tea', description: 'Refreshing green tea', price: 15000, category: 'Minuman' },
      { id: 27, name: 'Chai Tea', description: 'Spiced Indian tea', price: 22000, category: 'Minuman' },
      { id: 28, name: 'Bubble Tea', description: 'Taiwanese milk tea with pearls', price: 28000, category: 'Minuman' },
      { id: 29, name: 'Lemonade', description: 'Fresh lemon drink', price: 18000, category: 'Minuman' },

      // ========== MAKANAN ==========
      { id: 30, name: 'Beef Burger', description: 'Classic beef burger with cheese', price: 45000, category: 'Makanan' },
      { id: 31, name: 'Chicken Pizza', description: 'Pizza with chicken toppings', price: 55000, category: 'Makanan' },
      { id: 32, name: 'Nasi Goreng', description: 'Indonesian fried rice', price: 30000, category: 'Makanan' },
      { id: 33, name: 'Beef Steak', description: 'Grilled beef steak', price: 75000, category: 'Makanan' },
      { id: 34, name: 'Spaghetti Carbonara', description: 'Creamy pasta with bacon', price: 40000, category: 'Makanan' },
      { id: 35, name: 'Fried Chicken', description: 'Crispy fried chicken', price: 35000, category: 'Makanan' },
      { id: 36, name: 'Sushi Platter', description: 'Assorted sushi selection', price: 60000, category: 'Makanan' },
      { id: 37, name: 'Ramen', description: 'Japanese noodle soup', price: 38000, category: 'Makanan' },
      { id: 38, name: 'Dimsum Basket', description: 'Steamed dumplings', price: 32000, category: 'Makanan' },
      { id: 39, name: 'Satay', description: 'Grilled meat skewers with peanut sauce', price: 28000, category: 'Makanan' },

      // ========== DESSERT LAINNYA ==========
      { id: 40, name: 'Chocolate Cake', description: 'Rich chocolate cake', price: 35000, category: 'Dessert' },
      { id: 41, name: 'Croissant', description: 'Buttery French pastry', price: 20000, category: 'Dessert' },
      { id: 42, name: 'Cheesecake', description: 'Creamy cheesecake', price: 38000, category: 'Dessert' },
      { id: 43, name: 'Donut', description: 'Sweet glazed donut', price: 12000, category: 'Dessert' },
      { id: 44, name: 'Ice Cream Sundae', description: 'Vanilla ice cream with toppings', price: 25000, category: 'Dessert' },
      { id: 45, name: 'Brownies', description: 'Chocolate brownies', price: 18000, category: 'Dessert' },
      { id: 46, name: 'Tiramisu', description: 'Italian coffee-flavored dessert', price: 32000, category: 'Dessert' },
      { id: 47, name: 'Waffle', description: 'Belgian waffle with syrup', price: 28000, category: 'Dessert' },
      { id: 48, name: 'Pancake', description: 'Stack of fluffy pancakes', price: 22000, category: 'Dessert' },
      { id: 49, name: 'Chocolate Chip Cookies', description: 'Fresh baked cookies', price: 15000, category: 'Dessert' },

      // ========== OTHER CATEGORY ==========
      { id: 50, name: 'Caesar Salad', description: 'Fresh salad with caesar dressing', price: 28000, category: 'Other' },
      { id: 51, name: 'Tomato Soup', description: 'Creamy tomato soup', price: 22000, category: 'Other' },
      { id: 52, name: 'Garlic Bread', description: 'Bread with garlic butter', price: 18000, category: 'Other' },
      { id: 53, name: 'French Toast', description: 'Egg dipped toast', price: 25000, category: 'Other' },
      { id: 54, name: 'Omelette', description: 'Egg omelette with vegetables', price: 20000, category: 'Other' },
      { id: 55, name: 'Fruit Salad', description: 'Mixed fresh fruits', price: 22000, category: 'Other' },
      { id: 56, name: 'Yogurt Bowl', description: 'Greek yogurt with granola', price: 24000, category: 'Other' },
      { id: 57, name: 'Club Sandwich', description: 'Triple decker sandwich', price: 32000, category: 'Other' },
      { id: 58, name: 'Spring Rolls', description: 'Crispy vegetable rolls', price: 18000, category: 'Other' },
      { id: 59, name: 'Nachos', description: 'Tortilla chips with cheese', price: 28000, category: 'Other' },
      { id: 60, name: 'Matcha Salt', description: 'Premium matcha cooking salt', price: 15000, category: 'Other', isMatcha: true },
    ];

    return samples.map(p => ({
      ...p,
      image: getProductImage(p)
    }));
  };

  // FILTER PRODUK berdasarkan kategori dan search
  const filteredProducts = displayProducts.filter(product => {
    // Filter untuk kategori Matcha Special
    if (currentCategory === 'Matcha Special') {
      const productName = (product.name || '').toLowerCase();
      return productName.includes('matcha');
    }

    // Filter kategori lainnya
    if (currentCategory !== 'All' && product.category !== currentCategory) {
      return false;
    }

    // Filter search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = (product.name || '').toLowerCase().includes(term);
      const descMatch = (product.description || '').toLowerCase().includes(term);
      return nameMatch || descMatch;
    }

    return true;
  });

  // HITUNG PRODUK PER KATEGORI
  const getCategoryProductsCount = (categoryName) => {
    if (categoryName === 'All') return displayProducts.length;

    if (categoryName === 'Matcha Special') {
      return displayProducts.filter(product =>
        (product.name || '').toLowerCase().includes('matcha')
      ).length;
    }

    return displayProducts.filter(product => product.category === categoryName).length;
  };

  // Cek apakah produk favorit
  const isFavorite = (productId) => {
    if (isProductInFavorites) {
      return isProductInFavorites(productId);
    }
    return Array.isArray(favorites) && favorites.some(fav => {
      return (typeof fav === 'object' ? fav.id : fav) === productId;
    });
  };

  // Handle toggle favorite
  const handleToggleFavorite = (product) => {
    if (!isUserLoggedIn) {
      alert('Silakan login untuk menambah favorit');
      navigate('/login');
      return;
    }

    const currentFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const isAlreadyFavorite = currentFavorites.some(fav =>
      (typeof fav === 'object' ? fav.id : fav) === product.id
    );

    let newFavorites;
    if (isAlreadyFavorite) {
      newFavorites = currentFavorites.filter(fav =>
        (typeof fav === 'object' ? fav.id : fav) !== product.id
      );
      console.log("❌ Removed from favorites:", product.name);
    } else {
      const favProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        addedAt: new Date().toISOString()
      };
      newFavorites = [...currentFavorites, favProduct];
      console.log("❤️ Added to favorites:", product.name);
    }

    localStorage.setItem('favorites', JSON.stringify(newFavorites));

    if (toggleFavorite) {
      toggleFavorite(product);
    }

    setCartNotice({ title: isAlreadyFavorite ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit', message: product.name, image: product.image, kind: 'favorite' });
    window.setTimeout(() => setCartNotice(null), 2600);
  };

  // Handle add to cart
  const handleAddToCart = (product) => {
    if (!isUserLoggedIn) {
      alert('Silakan login untuk menambah ke keranjang');
      navigate('/login');
      return;
    }

    const productData = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      description: product.description,
      category: product.category,
      quantity: 1
    };

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = currentCart.findIndex(item =>
      item.id === product.id ||
      item.productId === product.id
    );

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += 1;
      console.log(`➕ Increased quantity for ${product.name}`);
    } else {
      currentCart.push({
        ...productData,
        addedAt: new Date().toISOString()
      });
      console.log(`🛒 Added to cart: ${product.name}`);
    }

    localStorage.setItem('cart', JSON.stringify(currentCart));
    localStorage.setItem('cart_display', JSON.stringify(currentCart));

    console.log(`💾 Cart saved: ${currentCart.length} items`);

    if (addToCart) {
      addToCart(productData);
    }

    setCartNotice({ title: 'Berhasil ditambahkan', message: product.name, image: product.image, kind: 'cart' });
    window.setTimeout(() => setCartNotice(null), 3200);
  };

  // Fetch notifications
  useEffect(() => {
    if (isUserLoggedIn) {
      const sampleNotifications = [
        {
          id: 1,
          title: 'Selamat Datang!',
          message: 'Selamat berbelanja di aplikasi kami',
          time: 'Baru saja',
          read: false
        },
        {
          id: 2,
          title: 'Promo Matcha!',
          message: 'Diskon 15% untuk semua produk matcha',
          time: '1 jam yang lalu',
          read: false
        },
        {
          id: 3,
          title: 'Matcha Festival',
          message: 'Event spesial matcha bulan ini!',
          time: 'Hari ini',
          read: true
        }
      ];
      setNotifications(sampleNotifications);
      setUnreadCount(sampleNotifications.filter(n => !n.read).length);
    }
  }, [isUserLoggedIn]);

  // Refresh data manual
  const handleRefresh = () => {
    localStorage.removeItem('cached_products');
    window.location.reload();
  };

  // Fallback timer
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (displayProducts.length === 0) {
        console.log("⏰ Fallback: Loading sample products");
        setDisplayProducts(getSampleProducts());
      }
    }, 1000);

    return () => clearTimeout(fallbackTimer);
  }, [displayProducts.length]);

  if (isLoading) {
    return (
      <div className="home">
        <header className="home-header">
          <div className="header-content">
            <div className="user-greeting">
              <h1 className="greeting">Halo, {user?.name || 'Guest'}!</h1>

              {/* Debug button */}
              <button
                onClick={handleForceLogin}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginTop: '10px'
                }}
              >
                🔧 Test Login
              </button>
            </div>
          </div>
        </header>

        <div className="search-section">
          <div className="search-container">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search for drinks, food..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="loading-minimal">
          <div className="loading-spinner-small"></div>
          <p>Loading menu...</p>

          <button
            onClick={handleRefresh}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ⚡ Load Faster
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-main">

        {/* HEADER */}
        <header className="home-header">
          <div className="header-content">
            <div className="user-greeting">
              <h1 className="greeting">Halo, {userData?.name || user?.name || 'Guest'}!</h1>
              <p className="sub-greeting">What would you like to order today?</p>

              {/* Debug status indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '5px',
                fontSize: '12px'
              }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: isUserLoggedIn ? '#4CAF50' : '#f44336',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {isUserLoggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN'}
                </span>
                {userData && (
                  <span style={{
                    color: '#666',
                    fontSize: '11px'
                  }}>
                    ({userData.name || userData.email})
                  </span>
                )}
              </div>
            </div>

            {/* NOTIFICATIONS */}
            <div className="notification-bell" ref={notificationRef}>
              <button className="bell-btn" onClick={() => setShowNotifications(!showNotifications)}>
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <div><span className="notification-eyebrow">MATCHA MOMENT</span><h3>Notifikasi</h3></div>
                    <button
                      className="mark-all-read"
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setUnreadCount(0);
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="notifications-list">
                    {notifications.map(n => (
                      <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                        <div className="notification-icon">📢</div>
                        <div className="notification-content">
                          <h4>{n.title}</h4>
                          <p>{n.message}</p>
                          <span className="notification-time">{n.time}</span>
                        </div>
                        {!n.read && <span className="unread-dot"></span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SEARCH */}
        <div className="search-section">
          <div className="search-container">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search for matcha, drinks, food..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="categories-section">
          <div
            className="categories-container"
            ref={categoryRailRef}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse' && event.button === 0) {
                categoryDragRef.current = { startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
              }
            }}
            onPointerMove={(event) => {
              if (categoryDragRef.current && categoryRailRef.current) {
                event.preventDefault();
                categoryRailRef.current.scrollLeft = categoryDragRef.current.scrollLeft - (event.clientX - categoryDragRef.current.startX);
              }
            }}
            onPointerUp={() => { categoryDragRef.current = null; }}
            onPointerLeave={() => { categoryDragRef.current = null; }}
          >
            {displayCategories.map(cat => {
              const count = getCategoryProductsCount(cat.name);
              const isActive = currentCategory === cat.name;

              return (
                <button
                  key={cat.id}
                  className={`category-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentCategory(cat.name)}
                  style={{
                    backgroundColor: isActive ? cat.color : 'white',
                    borderColor: isActive ? cat.color : '#e0e0e0'
                  }}
                >
                  <span className="category-icon">
                    {cat.icon}
                  </span>
                  <div className="category-info">
                    <span className="category-name">
                      {cat.name}
                    </span>
                    <span className="product-count">
                      ({count})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Matcha Special Banner */}
        {currentCategory === 'Matcha Special' && (
          <div className="matcha-banner">
            <div className="matcha-banner-content">
              <span className="matcha-icon">🍵</span>
              <div className="matcha-banner-text">
                <h3>Matcha Specials!</h3>
                <p>Discover our premium matcha collection</p>
              </div>
            </div>
          </div>
        )}

        {/* Refresh button */}
        <div className="refresh-section">
          <button
            onClick={handleRefresh}
            className="refresh-products-btn"
          >
            🔄 Refresh Menu
          </button>
        </div>

        {/* PRODUCTS */}
        <div className="products-section">
          <div className="products-header">
            <h2 className="section-title">
              {currentCategory === 'All' ? 'All Products' : currentCategory}
              <span className="category-display-icon">
                {displayCategories.find(c => c.name === currentCategory)?.icon || '📦'}
              </span>
            </h2>
            <span className="products-count">{filteredProducts.length} items</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <div className="no-products-icon">😔</div>
              <h3>No products found</h3>
              <p>Try a different search or category</p>
              <button
                className="btn-reset-category"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentCategory('All');
                }}
              >
                Show All Products
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map(product => {
                const isFav = isFavorite(product.id);
                const isMatchaProduct = (product.name || '').toLowerCase().includes('matcha');

                return (
                  <div key={product.id} className={`product-card ${isMatchaProduct ? 'matcha-product' : ''}`}>
                    {isMatchaProduct && (
                      <div className="matcha-badge">🍵 Matcha</div>
                    )}
                    <div className="product-image-container">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = productImages.other_default;
                        }}
                      />
                      <button
                        className={`favorite-btn ${isFav ? 'active' : ''}`}
                        onClick={() => handleToggleFavorite(product)}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        <span className="heart-icon">{isFav ? '❤️' : '🤍'}</span>
                      </button>
                      <div className="product-category-tag">
                        {product.category}
                      </div>
                    </div>

                    <div className="product-info">
                      <h3 className="product-title">
                        {product.name}
                        {isMatchaProduct && <span className="matcha-leaf"> 🍃</span>}
                      </h3>
                      <p className="product-description">{product.description}</p>

                      <div className="product-footer">
                        <div className="price-section">
                          <span className="product-price">
                            Rp {product.price?.toLocaleString('id-ID')}
                          </span>
                          {product.rating && (
                            <span className="product-rating">⭐ {product.rating}</span>
                          )}
                        </div>
                        <button
                          className="add-to-cart-btn"
                          onClick={() => handleAddToCart(product)}
                          title="Add to cart"
                        >
                          <span className="cart-icon">🛒</span>
                          <span className="cart-text">Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {cartNotice && (
        <div className={`store-toast ${cartNotice.kind === 'favorite' ? 'favorite-toast' : ''}`} role="status" aria-live="polite">
          <span className="toast-check">✓</span>
          {cartNotice.image && <img src={cartNotice.image} alt="" />}
          <span className="toast-copy"><strong>{cartNotice.title}</strong><small>{cartNotice.message}</small></span>
          {cartNotice.kind === 'cart' && <button onClick={() => navigate('/cart')}>Lihat keranjang <span>→</span></button>}
          <button className="toast-close" onClick={() => setCartNotice(null)} aria-label="Tutup">×</button>
        </div>
      )}

      {/* NAV BAR */}
      <div className="bottom-nav-container">
        <nav className="bottom-nav">
          <button className="nav-item active">
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
          <button
            className="nav-item"
            onClick={handleProfileNavigation}
            title={isUserLoggedIn ? "Go to Profile" : "Login Required"}
            style={{ position: 'relative' }}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
            {!isUserLoggedIn && (
              <span className="login-required-badge" title="Login required">!</span>
            )}

            {/* Debug indicator */}
            {process.env.NODE_ENV === 'development' && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                fontSize: '8px',
                background: isUserLoggedIn ? '#4CAF50' : '#f44336',
                color: 'white',
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isUserLoggedIn ? '✓' : '✗'}
              </span>
            )}
          </button>
        </nav>
      </div>
    </div>
  );
};
