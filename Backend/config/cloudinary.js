const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Authenticate with Cloudinary using our secret credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define where and how files get stored on Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine the folder based on file type
    // Images go to sherights/images, PDFs to sherights/documents etc.
    let folder = 'sherights/other';
    let resource_type = 'auto';

    if (file.mimetype.startsWith('image/')) {
      folder = 'sherights/images';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'sherights/documents';
    } else if (file.mimetype.startsWith('audio/')) {
      folder = 'sherights/audio';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'sherights/videos';
    }

    return {
      folder,
      resource_type,
      // Generate a unique filename using timestamp + original name
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  }
});

// File filter — only allow safe file types
// Reject anything suspicious before it even reaches Cloudinary
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'video/mp4'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    // null means no error, true means accept the file
    cb(null, true);
  } else {
    // Reject the file with a clear error message
    cb(new Error('File type not allowed. Accepted: JPG, PNG, PDF, MP3, WAV, MP4'), false);
  }
};

// Create the multer upload handler
// limits.fileSize is in bytes — 10 * 1024 * 1024 = 10MB maximum
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = { upload, cloudinary };