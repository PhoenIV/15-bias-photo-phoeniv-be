export class CardRepository {
  #db;

  constructor({ db }) {
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
}
