export class ExchangeOfferRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  markCancelledAll(saleId, client = this.#db) {
    return client.orm.public.ExchangeOffer.where({
      saleId: saleId,
      status: 'PENDING',
    }).updateCount({ status: 'CANCELLED' });
  }
}
