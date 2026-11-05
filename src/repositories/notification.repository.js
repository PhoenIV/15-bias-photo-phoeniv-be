export class NotificationRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  // 알림 목록 및 개수 조회에서 공통으로 사용하는 필터 조건 생성
  #buildUserNotificationsQuery({ userId, since, unreadOnly }, client) {
    let query = client.orm.public.Notification.where({ userId }).where(
      (notification) => notification.createdAt.gte(since),
    );

    if (unreadOnly) {
      query = query.where({ readAt: null });
    }

    return query;
  }

  // 로그인한 사용자의 최근 알림 목록을 페이지 단위로 조회
  findPageByUser(
    { userId, since, unreadOnly, page, limit },
    client = this.#db,
  ) {
    const offset = (page - 1) * limit;
    const filtered = this.#buildUserNotificationsQuery(
      { userId, since, unreadOnly },
      client,
    );

    return filtered
      .select('id', 'message', 'saleId', 'createdAt', 'readAt')
      .include('purchase', (purchase) => purchase.select('saleId'))
      .include('exchangeOffer', (offer) => offer.select('saleId'))
      .orderBy([
        (notification) => notification.createdAt.desc(),
        (notification) => notification.id.desc(),
      ])
      .offset(offset)
      .limit(limit)
      .all();
  }

  // 조회 조건에 맞는 알림 개수 조회
  countByUser({ userId, since, unreadOnly }, client = this.#db) {
    const filtered = this.#buildUserNotificationsQuery(
      { userId, since, unreadOnly },
      client,
    );

    return filtered.aggregate((agg) => ({
      totalCount: agg.count(),
    }));
  }

  // 사용자의 안 읽은 알림 전체를 읽음 처리 (기간 제한 없음, 이미 읽은 알림의 readAt 유지)
  async markAllReadByUser(
    userId,
    readAt = new Date().toISOString(),
    client = this.#db,
  ) {
    const updatedRows = await client.orm.public.Notification.where({
      userId,
      readAt: null,
    }).updateAll({ readAt });

    return updatedRows.length;
  }

  create(data, client = this.#db) {
    return client.orm.public.Notification.create(data);
  }

  // 구매 성공 알림 (구매자에게)
  createBuyerPurchaseNotification(
    { userId, purchaseId, grade, cardName, quantity },
    client = this.#db,
  ) {
    return client.orm.public.Notification.create({
      userId,
      purchaseId,
      message: `[${grade} | ${cardName}] ${quantity}장을 성공적으로 구매했습니다.`,
      type: 'PURCHASE',
    });
  }

  // 교환 성공 알림 (교환 제시자에게)
  createByExchangeApproved(
    { userId, exchangeOfferId, counterpartNickname, grade, cardName },
    client = this.#db,
  ) {
    return client.orm.public.Notification.create({
      userId,
      exchangeOfferId,
      message: `${counterpartNickname}님과의 [${grade} | ${cardName}]의 포토카드 교환이 성사되었습니다.`,
      type: 'EXCHANGE_APPROVED',
    });
  }

  // 교환 거절 알림 (교환 제시자에게)
  createByExchangeRejected(
    { userId, exchangeOfferId, counterpartNickname, grade, cardName },
    client = this.#db,
  ) {
    return client.orm.public.Notification.create({
      userId,
      exchangeOfferId,
      message: `${counterpartNickname}님과의 [${grade} | ${cardName}]의 포토카드 교환이 거절되었습니다.`,
      type: 'EXCHANGE_REJECTED',
    });
  }

  // 품절 알림 (판매자에게)
  createBySoldOut({ userId, saleId, grade, cardName }, client = this.#db) {
    return client.orm.public.Notification.create({
      userId,
      saleId,
      message: `[${grade} | ${cardName}]이 품절되었습니다.`,
      type: 'SOLDOUT',
    });
  }

  // 포토카드 교환 제안 알림 (판매자에게)
  createByExchangeOfferReceived(
    { userId, exchangeOfferId, counterpartNickname, grade, cardName },
    client = this.#db,
  ) {
    return client.orm.public.Notification.create({
      userId,
      exchangeOfferId,
      message: `${counterpartNickname}님이 [${grade} | ${cardName}]의 포토카드 교환을 제안했습니다.`,
      type: 'EXCHANGE_OFFER_RECEIVED',
    });
  }

  // 판매(구매 발생) 알림 (판매자에게)
  createByPurchase(
    { userId, purchaseId, counterpartNickname, grade, cardName, quantity },
    client = this.#db,
  ) {
    return client.orm.public.Notification.create({
      userId,
      purchaseId,
      message: `${counterpartNickname}님이 [${grade} | ${cardName}]을 ${quantity}장 구매했습니다.`,
      type: 'PURCHASE',
    });
  }
}
