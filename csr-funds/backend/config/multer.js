const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/plain',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = path.join(UPLOAD_DIR, new Date().toISOString().slice(0, 7));
    if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
    cb(null, sub);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  ALLOWED_MIME.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error(`File type ${file.mimetype} not allowed`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 20) * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_DIR };
