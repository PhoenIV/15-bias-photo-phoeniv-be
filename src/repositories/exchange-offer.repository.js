// 교환 제시 기본 칸
const OFFER_FIELDS = ['id', 'status', 'description', 'createdAt', 'saleId'];

// 카드 수량 계산에 필요한 보유 카드 칸
const USER_CARD_FIELDS = [
  'id',
  'ownerId',
  'photoCardId',
  'netQuantity',
  'totalQuantity',
];
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

  // 1) 교환 제시 생성
  create(data, client = this.#db) {
    return client.orm.public.ExchangeOffer.select(...OFFER_FIELDS).create(data);
  }

  // 1-1) 같은 판매글에 같은 카드로 낸 제시 찾기 (중복 확인용)
  findBySaleAndCard(saleId, offeredUserCardId, client = this.#db) {
    return client.orm.public.ExchangeOffer.where({ saleId, offeredUserCardId })
      .select('id')
      .first();
  }

  // 2) 교환 제시 하나 조회 (승인,거절,취소에 필요한 판매글,카드 정보)
  findById(id, client = this.#db) {
    return client.orm.public.ExchangeOffer.where({ id })
      .include('sale', (sale) =>
        sale
          .select('id', 'sellerId', 'cancelledAt')
          .include('userCard', (userCard) =>
            userCard
              .select(...USER_CARD_FIELDS)
              .include('photoCard', (photoCard) =>
                photoCard.select('id', 'name', 'grade'),
              ),
          ),
      )
      .include('offeredUserCard', (userCard) =>
        userCard
          .select(...USER_CARD_FIELDS)
          .include('photoCard', (photoCard) =>
            photoCard.select('id', 'name', 'grade'),
          ),
      )
      .first();
  }

  // 3) PENDING일 떄만 상태 변경 (이미 처리 됐으면 null)
  updateStatusIfPending(id, status, client = this.#db) {
    return client.orm.public.ExchangeOffer.where({ id, status: 'PENDING' })
      .select(...OFFER_FIELDS)
      .update({ status });
  }

  // 4) 판매글 하나에 들어온 제시 목록 (proposerId가 있으면 그 사람 것만)
  findPageBySale(
    { saleId, proposerId, status, page, limit },
    client = this.#db,
  ) {
    const bySale = client.orm.public.ExchangeOffer.where({ saleId });
    const query = proposerId ? bySale.where({ proposerId }) : bySale;
    return this.#findPage(query, { status, page, limit });
  }

  // 5) 내 판매글들에 들어온 제시 전체
  async findPageBySeller({ sellerId, status, page, limit }, client = this.#db) {
    const sales = await client.orm.public.Sale.where({ sellerId })
      .select('id')
      .all();
    const saleIds = sales.map((sale) => sale.id);

    if (saleIds.length === 0) {
      return { items: [], totalCount: 0 };
    }

    const query = client.orm.public.ExchangeOffer.where((offer) =>
      offer.saleId.in(saleIds),
    );
    return this.#findPage(query, { status, page, limit });
  }

  // 4), 5)가 같이 쓰는 페이지 나누기 + 전체 개수
  async #findPage(query, { status, page, limit }) {
    const filtered = status ? query.where({ status }) : query;

    const [items, { totalCount }] = await Promise.all([
      filtered
        .select(...OFFER_FIELDS)
        .include('proposer', (user) => user.select('id', 'nickname'))
        .include('offeredUserCard', (userCard) =>
          userCard
            .select('id')
            .include('photoCard', (photoCard) =>
              photoCard.select(
                'id',
                'name',
                'grade',
                'genre',
                'imagePublicId',
                'minPrice',
              ),
            ),
        )
        .include('sale', (sale) =>
          sale
            .select('id')
            .include('userCard', (userCard) =>
              userCard
                .select('id')
                .include('photoCard', (photoCard) =>
                  photoCard.select('id', 'name', 'grade'),
                ),
            ),
        )
        .orderBy([
          (offer) => offer.createdAt.desc(),
          (offer) => offer.id.desc(),
        ])
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      filtered.aggregate((agg) => ({ totalCount: agg.count() })),
    ]);

    return { items, totalCount };
  }
}
