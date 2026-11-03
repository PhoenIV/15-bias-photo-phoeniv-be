export class PointHistoryRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  createByPurchase(data, client = this.#db) {
    return client.orm.public.PointHistory.create({
      ...data,
      type: 'PURCHASE',
    });
  }
}
