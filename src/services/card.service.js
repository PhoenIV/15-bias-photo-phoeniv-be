import { ForbiddenException } from '#exceptions';

export class CardService {
  #cardRepository;
  #cloudinaryProvider;
  #db;

  constructor({ cardRepository, cloudinaryProvider, db }) {
    this.#cardRepository = cardRepository;
    this.#cloudinaryProvider = cloudinaryProvider;
    this.#db = db;
  }

  // KST 기준 이번 달 1일과 다음 달 1일 계산
  #getMonthlyRange() {
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(Date.now() + KST_OFFSET);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth();

    const startOfMonth = new Date(Date.UTC(year, month, 1) - KST_OFFSET);
    const endOfMonth = new Date(Date.UTC(year, month + 1, 1) - KST_OFFSET);

    return {
      startOfMonth: startOfMonth.toISOString().replace('.000Z', 'Z'),
      endOfMonth: endOfMonth.toISOString().replace('.000Z', 'Z'),
    };
  }

  async getQuota(userId) {
    const MAX_QUOTA = 3;
    const { startOfMonth, endOfMonth } = this.#getMonthlyRange();

    const { count: usedQuota } = await this.#cardRepository.countMonthlyCreated(
      userId,
      startOfMonth,
      endOfMonth,
    );

    return {
      maxQuota: MAX_QUOTA,
      usedQuota,
      remainingQuota: Math.max(0, MAX_QUOTA - usedQuota),
    };
  }

  async createPhotoCard(userId, cardData, imageBuffer) {
    // 1. 생성 한도 확인
    const quota = await this.getQuota(userId);

    if (quota.remainingQuota <= 0) {
      throw new ForbiddenException(
        '이번 달 포토카드 생성 한도(3회)를 초과했습니다.',
        {
          code: 'QUOTA_EXCEEDED',
          fieldErrors: {},
        },
      );
    }

    // 2. Cloudinary에 이미지 업로드
    const uploadedImage =
      await this.#cloudinaryProvider.uploadImage(imageBuffer);

    try {
      // 3. DB 트랜잭션
      return await this.#db.transaction(async (tx) => {
        const photoCard = await this.#cardRepository.createPhotoCard(
          {
            creatorId: userId,
            name: cardData.name,
            grade: cardData.grade,
            genre: cardData.genre,
            minPrice: cardData.minPrice,
            totalCreated: cardData.totalCreated,
            description: cardData.description || null,
            imagePublicId: uploadedImage.publicId,
          },
          tx,
        );

        const userCard = await this.#cardRepository.upsert(
          userId,
          photoCard.id,
          {
            ownerId: userId,
            photoCardId: photoCard.id,
            totalQuantity: photoCard.totalCreated,
            netQuantity: photoCard.totalCreated,
          },
          {},
          tx,
        );

        return { photoCard, userCard };
      });
    } catch (error) {
      // 4. DB 저장 실패 시 Cloudinary 이미지 정리
      try {
        await this.#cloudinaryProvider.deleteImage(uploadedImage.publicId);
      } catch (cleanupError) {
        console.error('Cloudinary 이미지 정리 실패:', cleanupError);
      }

      throw error;
    }
  }
}
