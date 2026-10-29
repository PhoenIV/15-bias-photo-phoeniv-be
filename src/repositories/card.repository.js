import { db } from '#prisma/db.js';

export class CardRepository {
  #db;

  constructor() {
    this.#db = db;
  }

  findById(userCardId, client = this.#db) {
    return client.orm.public.UserCard.where({ id: userCardId })
      .include('photoCard', (photoCard) =>
        photoCard.include('creator', (creator) => creator.select('nickname')),
      )
      .first();
  }

  update(userCardId, data, client = this.#db, expected = {}) {
    return client.orm.public.UserCard.where({
      id: userCardId,
      ...expected,
    }).update(data);
  }
}
