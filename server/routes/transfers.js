const express = require('express');
const router = express.Router();
const { createTransfer, getTransfers } = require('../controllers/transferController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.post('/', createTransfer);
router.get('/', getTransfers);

module.exports = router;
