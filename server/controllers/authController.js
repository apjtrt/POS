const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');


const { uploadImageToCloudinary } = require('../services/cloudinaryService');

exports.login = async (req, res, next) => {
  try {
    const { username, password, photoBase64, latitude, longitude } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Save login log with photo and GPS
    let sessionId = null;
    if (photoBase64 || latitude || longitude) {
      let finalPhotoUrl = '';
      if (photoBase64) {
        // Upload base64 to GitHub
        const filename = `login-${user.username}-${Date.now()}.jpg`;
        const cloudinaryUrl = await uploadImageToCloudinary(photoBase64, filename, 'login-images');
        finalPhotoUrl = cloudinaryUrl || photoBase64; // fallback to base64 if upload fails
      }

      const log = await prisma.loginLog.create({
        data: {
          userId: user.id,
          photoBase64: finalPhotoUrl,
          loginLatitude: latitude ? parseFloat(latitude) : null,
          loginLongitude: longitude ? parseFloat(longitude) : null
        }
      });
      sessionId = log.id;
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.json({
      success: true,
      token,
      sessionId,
      user: { id: user.id, username: user.username, role: user.role, name: user.name, upiId: user.upiId }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { sessionId, latitude, longitude } = req.body;

    if (sessionId) {
      await prisma.loginLog.update({
        where: { id: parseInt(sessionId) },
        data: {
          logoutTime: new Date(),
          logoutLatitude: latitude ? parseFloat(latitude) : null,
          logoutLongitude: longitude ? parseFloat(longitude) : null
        }
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, role: true, name: true, upiId: true }
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
