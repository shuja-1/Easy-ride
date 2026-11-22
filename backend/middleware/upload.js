import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.join(__dirname, '..', 'uploads', 'cars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `car-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPG, PNG or WEBP images are allowed'));
};

export const uploadCarImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

export const removeUploadedImage = (imagePath) => {
  if (!imagePath || !imagePath.startsWith('/uploads/cars/')) return;
  const file = path.join(uploadDir, path.basename(imagePath));
  fs.unlink(file, () => {});
};
