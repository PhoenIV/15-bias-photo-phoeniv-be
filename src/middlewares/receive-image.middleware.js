import multer from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      req.imageUploadError = {
        code: 'INVALID_IMAGE_TYPE',
        message: 'JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.',
      };

      return cb(null, false);
    }

    cb(null, true);
  },
});

// multipart/form-data 파싱 및 이미지 수신
export const receiveImage = (req, res, next) => {
  multerUpload.single('image')(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (req.imageUploadError) {
      const uploadError = new Error(req.imageUploadError.message);
      uploadError.statusCode = 400;
      uploadError.code = req.imageUploadError.code;

      return next(uploadError);
    }

    next();
  });
};

// 이미지 필수 여부 검증
export const requireImage = (req, res, next) => {
  if (!req.file) {
    const error = new Error('이미지 파일은 필수입니다.');
    error.statusCode = 400;
    error.code = 'IMAGE_REQUIRED';

    return next(error);
  }

  next();
};
