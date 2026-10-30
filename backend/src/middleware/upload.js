const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `product_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${imageTypes[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (imageTypes[file.mimetype]) return cb(null, true);
  cb(new Error('Usa una imagen JPG, PNG, GIF o WebP.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 20,
    parts: 21,
    fieldNameSize: 100,
    fieldSize: 10 * 1024,
    fieldNestingDepth: 5,
    fieldArrayIndexLimit: 20,
  },
});

module.exports = upload;
