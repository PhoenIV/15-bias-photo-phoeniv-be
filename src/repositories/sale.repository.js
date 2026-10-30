import { db } from '#prisma/db.js';
import { or } from '@prisma/orm-postgres/orm-client';

const SORTS = {
  latest: {
    orderBy: [(sale) => sale.createdAt.desc(), (sale) => sale.id.desc()],
    cursorKeys: ['createdAt', 'id'],
  },
  oldest: {
    orderBy: [(sale) => sale.createdAt.asc(), (sale) => sale.id.asc()],
    cursorKeys: ['createdAt', 'id'],
  },
  priceAsc: {
    orderBy: [(sale) => sale.price.asc(), (sale) => sale.id.desc()],
    cursorKeys: ['price', 'id'],
  },
  priceDesc: {
    orderBy: [(sale) => sale.price.desc(), (sale) => sale.id.desc()],
    cursorKeys: ['price', 'id'],
  },
};

const SALE_FIELDS = [
  'id',
  'price',
  'totalQuantity',
  'remainingQuantity',
  'exchangeGrade',
  'exchangeGenre',
  'exchangeDescription',
  'createdAt',
  'updatedAt',
  'cancelledAt',
];
export class SaleRepository {
  #db;
  #fields;

  constructor() {
    this.#db = db;
    this.#fields = SALE_FIELDS;
  }

  async findPage(
    { sort, cursor, limit, keyword, grade, genre, excludeSoldOut } = {},
    client = this.#db,
  ) {
    const { orderBy, cursorKeys } = SORTS[sort];

    const searchPattern = keyword.trim() ? `%${keyword.trim()}%` : null;

    let filtered = client.orm.public.Sale.where({ cancelledAt: null });

    if (searchPattern !== null) {
      filtered = filtered.where((sale) =>
        or(
          sale.exchangeDescription.ilike(searchPattern),
          sale.userCard.some((userCard) =>
            userCard.photoCard.some((photoCard) =>
              or(
                photoCard.name.ilike(searchPattern),
                photoCard.description.ilike(searchPattern),
              ),
            ),
          ),
        ),
      );
    }

    if (grade) {
      filtered = filtered.where((sale) =>
        sale.userCard.some((userCard) =>
          userCard.photoCard.some((photoCard) => photoCard.grade.eq(grade)),
        ),
      );
    }

    if (genre) {
      filtered = filtered.where((sale) =>
        sale.userCard.some((userCard) =>
          userCard.photoCard.some((photoCard) => photoCard.genre.eq(genre)),
        ),
      );
    }

    if (excludeSoldOut) {
      filtered = filtered.where((sale) => sale.remainingQuantity.gt(0));
    }

    const ordered = filtered
      .select(...this.#fields)
      .include('seller', (seller) => seller.select('id', 'nickname'))
      .include('userCard', (userCard) =>
        userCard
          .select('id')
          .include('photoCard', (photoCard) =>
            photoCard
              .select('name', 'grade', 'genre', 'description', 'imageUrl')
              .include('creator', (creator) =>
                creator.select('id', 'nickname'),
              ),
          ),
      )
      .orderBy(orderBy);

    const paged = cursor ? ordered.cursor(cursor) : ordered;
    const rows = await paged.limit(limit + 1).all();
    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    return {
      items,
      hasNext,
      nextCursor: hasNext
        ? Object.fromEntries(cursorKeys.map((key) => [key, last[key]]))
        : null,
    };
  }

  // api 명세서에서 totalCount를 돌려주기 때문에 수량을 세는 별도의 리포지토리가 필요함(아래).
  // 단, totalCount가 불필요해서 없애는 방향으로 명세서를 수정하고 아래함수는 쓰지 않게 될 것 같음.
  // async countActive(client = this.#db) {
  //   const { total } = await client.orm.public.Sale.where({
  //     cancelledAt: null,
  //   }).aggregate((agg) => ({ total: agg.count() }));
  //   return total;
  // }

  findById(saleId, client = this.#db) {
    return client.orm.public.Sale.where({ id: saleId, cancelledAt: null })
      .select(...this.#fields)
      .include('seller', (seller) => seller.select('id', 'nickname', 'point'))
      .include('userCard', (userCard) =>
        userCard
          .select('id', 'netQuantity', 'totalQuantity')
          .include('photoCard', (photoCard) =>
            photoCard
              .select(
                'id',
                'name',
                'grade',
                'genre',
                'description',
                'imageUrl',
                'minPrice',
              )
              .include('creator', (creator) =>
                creator.select('id', 'nickname'),
              ),
          ),
      )
      .include('exchangeOffers', (offer) =>
        offer
          .where({ status: 'PENDING' })
          .select('id')
          .include('offeredUserCard', (card) =>
            card.select('id', 'netQuantity'),
          ),
      )
      .first();
  }

  create(data, client = this.#db) {
    return client.orm.public.Sale.select(...this.#fields)
      .include('seller', (seller) => seller.select('id', 'nickname'))
      .include('userCard', (userCard) =>
        userCard
          .select('id')
          .include('photoCard', (photoCard) =>
            photoCard
              .select('name', 'grade', 'genre', 'description', 'imageUrl')
              .include('creator', (creator) =>
                creator.select('id', 'nickname'),
              ),
          ),
      )
      .create(data);
  }

  update(saleId, data, client = this.#db, expected = {}) {
    return client.orm.public.Sale.where({
      id: saleId,
      cancelledAt: null,
      ...expected,
    })
      .select(...this.#fields)
      .include('seller', (seller) => seller.select('id', 'nickname'))
      .include('userCard', (userCard) =>
        userCard
          .select('id')
          .include('photoCard', (photoCard) =>
            photoCard
              .select('name', 'grade', 'genre', 'description', 'imageUrl')
              .include('creator', (creator) =>
                creator.select('id', 'nickname'),
              ),
          ),
      )
      .update(data);
  }

  markCancelled(saleId, client = this.#db) {
    return client.orm.public.Sale.where({
      id: saleId,
      cancelledAt: null,
    }).update({ cancelledAt: new Date().toISOString() });
  }

  createPurchase(userId, saleId, data, client = this.#db, expected = {}) {
    return client.orm.public.Purchase.select(
      'id',
      'quantity',
      'price',
      'createdAt',
    )
      .include('sale', (sale) =>
        sale
          .select('id')
          .include('userCard', (card) =>
            card
              .select('id')
              .include('photoCard', (card) =>
                card.select('name', 'grade', 'genre', 'imageUrl'),
              ),
          ),
      )
      .create({ buyerId: userId, saleId, ...data });
  }
}
