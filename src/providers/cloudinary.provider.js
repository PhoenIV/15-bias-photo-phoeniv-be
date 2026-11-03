import { v2 as cloudinary } from 'cloudinary';

export class CloudinaryProvider {
  constructor({ config }) {
    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'photocard-market',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);

          if (!result?.public_id) {
            return reject(
              new Error('Cloudinary 이미지 업로드 결과가 올바르지 않습니다.'),
            );
          }

          resolve({
            publicId: result.public_id,
          });
        },
      );

      stream.end(buffer);
    });
  }

  async deleteImage(publicId) {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
  }
}
