export class NotificationRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  createByPurchase({ userId, purchaseId }, client = this.#db) {
    return client.orm.public.Notification.create({
      userId,
      purchaseId,
      message: '포토카드가 판매되었습니다!',
      type: 'PURCHASE',
    });
  }

  createBySoldOut({ userId, saleId }, client = this.#db) {
    return client.orm.public.Notification.create({
      userId,
      saleId,
      message: '판매중인 포토카드가 매진되었습니다!',
      type: 'SOLDOUT',
    });
  }
}
