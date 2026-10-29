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

  findByOwnerAndPhotoCard(ownerId, photoCardId, client = this.#db) {
    return client.orm.public.UserCard.where({ ownerId, photoCardId })
      .select('id', 'netQuantity', 'totalQuantity')
      .first();
  }

  update(userCardId, data, client = this.#db, expected = {}) {
    return client.orm.public.UserCard.where({
      id: userCardId,
      ...expected,
    }).update(data);
  }

  upsert(buyerId, photoCardId, createData, updateData, client = this.#db) {
    return client.orm.public.UserCard.upsert({
      create: createData,
      update: updateData,
      conflictOn: { ownerId: buyerId, photoCardId: photoCardId },
    });
  }
}
