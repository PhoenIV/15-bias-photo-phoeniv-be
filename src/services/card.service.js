import { ForbiddenException } from '#exceptions';
import { ERROR_CODE } from '#constants';

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

  // 마이 갤러리 조회
  async getMyCards(userId, query) {
    const { page, limit, keyword, grade, genre, sort } = query;

    const filters = {
      ownerId: userId,
      keyword,
      grade,
      genre,
    };

    // 서로 독립적인 조회이므로 병렬 조회
    const [cards, countResult, gradeCountRows] = await Promise.all([
      this.#cardRepository.findMyCardsPage({ ...filters, page, limit, sort }),
      this.#cardRepository.countMyCards(filters),
      this.#cardRepository.findMyCardGrades(filters),
    ]);

    const { totalCount } = countResult;

    const gradeCounts = {
      COMMON: 0,
      RARE: 0,
      SUPER_RARE: 0,
      LEGENDARY: 0,
    };

    for (const { grade, cardCount } of gradeCountRows) {
      gradeCounts[grade] = cardCount;
    }

    // API 응답 명세에 맞게 변환
    const data = cards.map((userCard) => ({
      userCardId: userCard.id,
      photoCardId: userCard.photoCardId,
      name: userCard.photoCard.name,
      grade: userCard.photoCard.grade,
      genre: userCard.photoCard.genre,
      minPrice: userCard.photoCard.minPrice,
      netQuantity: userCard.netQuantity,
      totalQuantity: userCard.totalQuantity,
      imagePublicId: userCard.photoCard.imagePublicId,
      creatorNickname: userCard.photoCard.creator.nickname,
      updatedAt: userCard.updatedAt,
    }));

    // 전체 페이지 수 계산
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
      },
      gradeCounts,
    };
  }

  async createPhotoCard(userId, cardData, imageBuffer) {
    // 1. 생성 한도 확인
    const quota = await this.getQuota(userId);

    if (quota.remainingQuota <= 0) {
      throw new ForbiddenException(
        '이번 달 포토카드 생성 한도(3회)를 초과했습니다.',
        {
          code: ERROR_CODE.CARD_QUOTA_EXCEEDED,
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
      // DB 저장 실패 시 Cloudinary 이미지 정리
      try {
        await this.#cloudinaryProvider.deleteImage(uploadedImage.publicId);
      } catch (cleanupError) {
        console.error('Cloudinary 이미지 정리 실패:', cleanupError);
      }

      throw error;
    }
  }

  // 나의 판매·교환 포토카드 목록 조회
  async getMySales(userId, query) {
    const { page, limit, keyword, grade, genre, saleType, isSoldOut } = query;

    const filters = {
      ownerId: userId,
      keyword,
      grade,
      genre,
      saleType,
      isSoldOut,
    };

    // 목록, 전체 개수, 등급별 집계를 병렬 조회
    const [sales, countResult, gradeCountRows] = await Promise.all([
      this.#cardRepository.findMySales({
        ...filters,
        page,
        limit,
      }),
      this.#cardRepository.countMySales(filters),
      this.#cardRepository.findMySalesGrades(filters),
    ]);

    const totalCount = Number(countResult[0]?.totalCount ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const gradeCounts = {
      COMMON: 0,
      RARE: 0,
      SUPER_RARE: 0,
      LEGENDARY: 0,
    };

    for (const { grade, cardCount } of gradeCountRows) {
      if (gradeCounts[grade] !== undefined) {
        gradeCounts[grade] = Number(cardCount);
      }
    }

    // API 응답 명세에 맞게 변환
    const data = sales.map((item) => ({
      saleType: item.saleType,
      itemId: item.itemId,
      saleId: item.saleId,
      exchangeOfferId: item.exchangeOfferId,
      isSoldOut: item.isSoldOut,

      photoCard: {
        id: item.photoCardId,
        name: item.name,
        grade: item.grade,
        genre: item.genre,
        minPrice: item.minPrice,
        imagePublicId: item.imagePublicId,
        creatorNickname: item.creatorNickname,
      },

      // 교환 제안은 거래 가격이 없으므로 null
      price: item.price,
      quantity: item.quantity,
      totalQuantity: item.totalQuantity,
      createdAt: item.createdAt,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
      },
      gradeCounts,
    };
  }
}
