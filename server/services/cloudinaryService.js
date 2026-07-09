const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (pdfBytes, filename) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary integration not configured. Skipping PDF upload.');
    return null;
  }

  try {
    const base64Content = Buffer.from(pdfBytes).toString('base64');
    const dataUri = `data:application/pdf;base64,${base64Content}`;
    
    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: 'pdfs',
      public_id: filename.replace(/\.[^/.]+$/, ""), // remove extension for public_id
      resource_type: 'raw'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Error uploading PDF to Cloudinary:', error.message);
    return null;
  }
};

const uploadImageToCloudinary = async (base64Data, filename, folder = 'images') => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary integration not configured. Skipping image upload.');
    return null;
  }

  let dataUri = base64Data;
  // Ensure it has the data URI prefix if it's missing
  if (!base64Data.startsWith('data:')) {
    dataUri = `data:image/jpeg;base64,${base64Data}`;
  }

  try {
    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      public_id: filename.replace(/\.[^/.]+$/, "") // remove extension
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error.message);
    return null;
  }
};

const uploadBackupToCloudinary = async (jsonString, filename) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary integration not configured. Skipping backup upload.');
    return null;
  }

  try {
    const base64Content = Buffer.from(jsonString).toString('base64');
    const dataUri = `data:application/json;base64,${base64Content}`;
    
    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: 'database_backups',
      public_id: filename.replace(/\.[^/.]+$/, ""),
      resource_type: 'raw'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Error uploading backup to Cloudinary:', error.message);
    return null;
  }
};

module.exports = { 
  uploadToCloudinary, 
  uploadImageToCloudinary, 
  uploadBackupToCloudinary 
};
