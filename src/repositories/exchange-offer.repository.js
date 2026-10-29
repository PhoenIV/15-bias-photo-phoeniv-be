import { db } from '#prisma/db.js';

export class ExchangeOfferRepository {
  #db;

  constructor() {
    this.#db = db;
  }

  markCancelledAll(saleId, client = this.#db) {
    return client.orm.public.ExchangeOffer.where({
      saleId: saleId,
      status: 'PENDING',
    }).update({ status: 'CANCELLED' });
  }
}
