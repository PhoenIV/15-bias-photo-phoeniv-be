import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { BadRequestException } from '#exceptions';
import { ERROR_CODE, ERROR_MESSAGE } from '#constants';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 6,
    parts: 7,
    fieldSize: 1024,
  },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      req.imageUploadError = true;
      return cb(null, false);
    }

    cb(null, true);
  },
});

// Multer 오류를 HTTP 400 예외로 변환
const handleMulterError = (error) => {
  const errors = {
    LIMIT_FILE_SIZE: ERROR_MESSAGE.IMAGE_TOO_LARGE,
    LIMIT_FILE_COUNT: ERROR_MESSAGE.IMAGE_FILE_COUNT_EXCEEDED,
    LIMIT_FIELD_COUNT: ERROR_MESSAGE.IMAGE_FIELD_COUNT_EXCEEDED,
    LIMIT_PART_COUNT: ERROR_MESSAGE.IMAGE_PART_COUNT_EXCEEDED,
    LIMIT_FIELD_VALUE: ERROR_MESSAGE.IMAGE_FIELD_VALUE_TOO_LARGE,
    LIMIT_UNEXPECTED_FILE: ERROR_MESSAGE.INVALID_IMAGE_REQUEST,
  };

  const message = errors[error.code] || ERROR_MESSAGE.INVALID_IMAGE_REQUEST;

  return new BadRequestException(message, {
    code: ERROR_CODE.BAD_REQUEST,
    fieldErrors: {},
  });
};

// 이미지 형식 오류를 공통 예외로 변환
const createInvalidImageTypeError = () => {
  return new BadRequestException(ERROR_MESSAGE.INVALID_IMAGE_TYPE, {
    code: ERROR_CODE.INVALID_IMAGE_TYPE,
    fieldErrors: {},
  });
};

// multipart/form-data 파싱 및 이미지 수신
export const receiveImage = (req, res, next) => {
  multerUpload.single('image')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        return next(handleMulterError(error));
      }

      return next(error);
    }

    if (req.imageUploadError) {
      return next(createInvalidImageTypeError());
    }

    next();
  });
};

// 이미지 필수 여부 검증
export const requireImage = (req, res, next) => {
  if (!req.file) {
    return next(
      new BadRequestException(ERROR_MESSAGE.IMAGE_REQUIRED, {
        code: ERROR_CODE.IMAGE_REQUIRED,
        fieldErrors: {},
      }),
    );
  }

  next();
};

// 실제 이미지 바이너리 형식 검증
export const validateImageContent = async (req, res, next) => {
  try {
    const detectedType = await fileTypeFromBuffer(req.file.buffer);

    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      return next(createInvalidImageTypeError());
    }

    next();
  } catch (error) {
    next(error);
  }
};
