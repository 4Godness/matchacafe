const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/auth');

// Semua route butuh authentication
router.use(authMiddleware);

router.get('/mycart', cartController.getUserCart);
router.post('/update', cartController.updateCartItem);
router.post('/sync', cartController.syncCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;