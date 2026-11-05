import { and } from '@prisma/orm-postgres/orm-client';
export class CardRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // 마이 갤러리 조회에 사용하는 공통 필터 조건 생성
  #buildMyCardsQuery({ ownerId, keyword, grade, genre }, client) {
    // 로그인한 사용자의 보유 수량이 있는 UserCard 조회
    let query = client.orm.public.UserCard.where({ ownerId }).where(
      (userCard) => userCard.totalQuantity.gt(0),
    );

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

    let orderBy;

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
      photoCard.userCards.some((userCard) =>
        and(userCard.ownerId.eq(ownerId), userCard.totalQuantity.gt(0)),
      ),
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

  // 내가 등록한 판매글과 보낸 PENDING 교환 제안을 통합 조회하기 위한 기본 행 집합
  #buildMySalesRows({ ownerId }, client) {
    const sale = client.sql.public.sale;
    const exchangeOffer = client.sql.public.exchange_offer;
    const photoCard = client.sql.public.photo_card;
    const user = client.sql.public.user;

    return client.raw.sql`
      -- 내가 등록한 판매글
      SELECT
        'SALE' AS "saleType",
        s.id AS "itemId",
        s.id AS "saleId",
        NULL AS "exchangeOfferId",
        (s.remaining_quantity = 0) AS "isSoldOut",
        pc.id AS "photoCardId",
        pc.name,
        pc.grade,
        pc.genre,
        pc.min_price AS "minPrice",
        s.price,
        s.remaining_quantity AS quantity,
        s.total_quantity AS "totalQuantity",
        pc.image_public_id AS "imagePublicId",
        creator.nickname AS "creatorNickname",
        s.created_at AS "createdAt"
      FROM sale s
      JOIN user_card uc
        ON uc.id = s.user_card_id
      JOIN photo_card pc
        ON pc.id = uc.photo_card_id
      JOIN "user" creator
        ON creator.id = pc.creator_id
      WHERE s.seller_id = ${ownerId}
        AND s.cancelled_at IS NULL

      UNION ALL

      -- 내가 보낸 대기 중인 교환 제안
      SELECT
        'EXCHANGE' AS "saleType",
        eo.id AS "itemId",
        eo.sale_id AS "saleId",
        eo.id AS "exchangeOfferId",
        false AS "isSoldOut",
        pc.id AS "photoCardId",
        pc.name,
        pc.grade,
        pc.genre,
        pc.min_price AS "minPrice",
        NULL AS price,
        1 AS quantity,
        1 AS "totalQuantity",
        pc.image_public_id AS "imagePublicId",
        creator.nickname AS "creatorNickname",
        eo.created_at AS "createdAt"
      FROM exchange_offer eo
      JOIN user_card uc
        ON uc.id = eo.offered_user_card_id
      JOIN photo_card pc
        ON pc.id = uc.photo_card_id
      JOIN "user" creator
        ON creator.id = pc.creator_id
      WHERE eo.proposer_id = ${ownerId}
        AND eo.status = 'PENDING'
    `.returnsRow({
      saleType: 'pg/text@1',
      itemId: sale.columns.id,
      saleId: exchangeOffer.columns.sale_id,
      exchangeOfferId: { codecId: 'pg/int4@1', nullable: true },
      isSoldOut: 'pg/bool@1',
      photoCardId: photoCard.columns.id,
      name: photoCard.columns.name,
      grade: photoCard.columns.grade,
      genre: photoCard.columns.genre,
      minPrice: photoCard.columns.min_price,
      price: { codecId: 'pg/int4@1', nullable: true },
      quantity: 'pg/int4@1',
      totalQuantity: sale.columns.total_quantity,
      imagePublicId: photoCard.columns.image_public_id,
      creatorNickname: user.columns.nickname,
      createdAt: sale.columns.created_at,
    });
  }

  // 목록 조회와 전체 개수 조회에서 공통으로 사용하는 필터
  #buildFilteredMySalesRows(
    { ownerId, keyword, grade, genre, saleType, isSoldOut },
    client,
  ) {
    const rows = this.#buildMySalesRows({ ownerId }, client);

    return client.raw.sql`
      SELECT
        "saleType",
        "itemId",
        "saleId",
        "exchangeOfferId",
        "isSoldOut",
        "photoCardId",
        name,
        grade,
        genre,
        "minPrice",
        price,
        quantity,
        "totalQuantity",
        "imagePublicId",
        "creatorNickname",
        "createdAt"
      FROM (${rows}) AS my_sales
      WHERE
        (${saleType === undefined}::boolean OR "saleType" = ${saleType ?? ''})
        AND (${grade === undefined}::boolean OR grade = ${grade ?? ''})
        AND (${genre === undefined}::boolean OR genre = ${genre ?? ''})
        AND (${isSoldOut === undefined}::boolean OR "isSoldOut" = ${isSoldOut ?? false})
        AND (
          ${keyword === undefined}::boolean
          OR POSITION(LOWER(${keyword ?? ''}) IN LOWER(name)) > 0
        )
    `.returnsRow({ ...rows.returns });
  }

  // 나의 판매·교환 목록 조회
  findMySales(
    { ownerId, page, limit, keyword, grade, genre, saleType, isSoldOut },
    client = this.#db,
  ) {
    const offset = (page - 1) * limit;

    const filtered = this.#buildFilteredMySalesRows(
      { ownerId, keyword, grade, genre, saleType, isSoldOut },
      client,
    );

    const query = client.raw.sql`
      SELECT
        "saleType",
        "itemId",
        "saleId",
        "exchangeOfferId",
        "isSoldOut",
        "photoCardId",
        name,
        grade,
        genre,
        "minPrice",
        price,
        quantity,
        "totalQuantity",
        "imagePublicId",
        "creatorNickname",
        "createdAt"
      FROM (${filtered}) AS filtered_sales
      ORDER BY
        "createdAt" DESC,
        CASE "saleType"
          WHEN 'SALE' THEN 0
          WHEN 'EXCHANGE' THEN 1
        END ASC,
        "itemId" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
      .returnsRow({ ...filtered.returns })
      .build();

    return client.query(query);
  }

  // 나의 판매·교환 목록 전체 개수 조회
  countMySales(
    { ownerId, keyword, grade, genre, saleType, isSoldOut },
    client = this.#db,
  ) {
    const filtered = this.#buildFilteredMySalesRows(
      { ownerId, keyword, grade, genre, saleType, isSoldOut },
      client,
    );

    const query = client.raw.sql`
      SELECT COUNT(*) AS "totalCount"
      FROM (${filtered}) AS filtered_sales
    `
      .returnsRow({
        totalCount: 'pg/int8@1',
      })
      .build();

    return client.query(query);
  }
}
