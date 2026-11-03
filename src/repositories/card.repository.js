export class CardRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // 공통으로 사용하는 필터 조건 생성(같은 조건 사용을 위한 메소드)
  #buildMyCardsQuery({ ownerId, keyword, grade, genre }, client) {
    // 로그인한 사용자의 UserCard 조회
    let query = client.orm.public.UserCard.where({ ownerId });

    // 카드 이름 검색
    if (keyword) {
      const escapedKeyword = keyword.replace(/[\\%_]/g, '\\$&');
      const searchPattern = `%${escapedKeyword}%`;

      query = query.where((userCard) =>
        userCard.photoCard.some((photoCard) =>
          photoCard.name.ilike(searchPattern),
        ),
      );
    }

    // 포토카드 등급 필터
    if (grade) {
      query = query.where((userCard) =>
        userCard.photoCard.some((photoCard) => photoCard.grade.eq(grade)),
      );
    }

    // 포토카드 장르 필터
    if (genre) {
      query = query.where((userCard) =>
        userCard.photoCard.some((photoCard) => photoCard.genre.eq(genre)),
      );
    }

    return query;
  }

  findById(userCardId, client = this.#db) {
    return client.orm.public.UserCard.where({ id: userCardId })
      .include('photoCard', (photoCard) =>
        photoCard.include('creator', (creator) => creator.select('nickname')),
      )
      .first();
  }

  findByOwnerAndPhotoCard(ownerId, photoCardId, client = this.#db) {
    return client.orm.public.UserCard.where({ ownerId, photoCardId })
      .select('id', 'netQuantity', 'totalQuantity')
      .first();
  }

  async update(userCardId, data, client = this.#db, expected = {}) {
    const [updated] = await client.orm.public.UserCard.where({
      id: userCardId,
      ...expected,
    }).updateAll(data);
    return updated ?? null;
  }

  upsert(buyerId, photoCardId, createData, updateData, client = this.#db) {
    return client.orm.public.UserCard.upsert({
      create: createData,
      update: updateData,
      conflictOn: { ownerId: buyerId, photoCardId: photoCardId },
    });
  }

  // 이번 달 포토카드 생성 횟수 조회
  countMonthlyCreated(creatorId, startOfMonth, endOfMonth, client = this.#db) {
    return client.orm.public.PhotoCard.where((card) =>
      card.creatorId.eq(creatorId),
    )
      .where((card) => card.createdAt.gte(startOfMonth))
      .where((card) => card.createdAt.lt(endOfMonth))
      .aggregate((agg) => ({
        count: agg.count(),
      }));
  }

  // 포토카드 원본 생성
  createPhotoCard(data, client = this.#db) {
    return client.orm.public.PhotoCard.create(data); // 또는 insert(data)
  }

  // 마이 갤러리 카드 목록을 페이지 단위로 조회
  findMyCardsPage(
    { ownerId, page, limit, keyword, grade, genre, sort },
    client = this.#db,
  ) {
    const filtered = this.#buildMyCardsQuery(
      { ownerId, keyword, grade, genre },
      client,
    );

    let orderBy; // 정렬조건

    switch (sort) {
      case 'price_asc':
        orderBy = [
          (userCard) => userCard.photoCard.minPrice.asc(),
          (userCard) => userCard.id.desc(),
        ];
        break;

      case 'price_desc':
        orderBy = [
          (userCard) => userCard.photoCard.minPrice.desc(),
          (userCard) => userCard.id.desc(),
        ];
        break;

      case 'latest':
      default:
        orderBy = [
          (userCard) => userCard.updatedAt.desc(),
          (userCard) => userCard.id.desc(),
        ];
        break;
    }

    const offset = (page - 1) * limit;

    return filtered
      .select('id', 'photoCardId', 'netQuantity', 'totalQuantity', 'updatedAt')
      .include('photoCard', (photoCard) =>
        photoCard
          .select('id', 'name', 'grade', 'genre', 'minPrice', 'imagePublicId')
          .include('creator', (creator) => creator.select('nickname')),
      )
      .orderBy(orderBy)
      .offset(offset)
      .limit(limit)
      .all();
  }

  countMyCards({ ownerId, keyword, grade, genre }, client = this.#db) {
    const filtered = this.#buildMyCardsQuery(
      { ownerId, keyword, grade, genre },
      client,
    );

    // aggregate의 count()는 조건에 해당하는 행의 개수를 반환합니다.
    return filtered.aggregate((agg) => ({
      totalCount: agg.count(),
    }));
  }

  findMyCardGrades({ ownerId, keyword, grade, genre }, client = this.#db) {
    let query = client.orm.public.PhotoCard.where((photoCard) =>
      photoCard.userCards.some((userCard) => userCard.ownerId.eq(ownerId)),
    );

    // 카드 이름 검색
    if (keyword) {
      const escapedKeyword = keyword.replace(/[\\%_]/g, '\\$&');
      const searchPattern = `%${escapedKeyword}%`;

      query = query.where((photoCard) => photoCard.name.ilike(searchPattern));
    }

    // 등급 필터
    if (grade) {
      query = query.where((photoCard) => photoCard.grade.eq(grade));
    }

    // 장르 필터
    if (genre) {
      query = query.where((photoCard) => photoCard.genre.eq(genre));
    }

    return query.groupBy('grade').aggregate((agg) => ({
      cardCount: agg.count(),
    }));
  }
}
