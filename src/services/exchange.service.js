import { ERROR_MESSAGE, ERROR_CODE } from '#constants';
import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '#exceptions';

const MAX_CARD_PER_PHOTOCARD = 10;

// 목록 한 줄을 명세 모양으로 바꾸기
const toOfferResponse = (offer) => {
  const photoCard = offer.offeredUserCard.photoCard;
  return {
    id: offer.id,
    status: offer.status,
    description: offer.description,
    createdAt: offer.createdAt,
    proposer: { id: offer.proposer.id, nickname: offer.proposer.nickname },
    offeredCard: {
      id: offer.offeredUserCard.id,
      name: photoCard.name,
      grade: photoCard.grade,
      genre: photoCard.genre,
      imagePublicId: photoCard.imagePublicId,
      price: photoCard.minPrice,
    },
  };
};

const toPagination = ({ page, limit, totalCount }) => {
  const totalPages = Math.ceil(totalCount / limit);
  return { page, limit, totalCount, totalPages, hasNext: page < totalPages };
};

const throwHttp = (Exception, key) => {
  throw new Exception(ERROR_MESSAGE[key], { code: ERROR_CODE[key] });
};

export class ExchangeService {
  #db;
  #saleRepository;
  #cardRepository;
  #exchangeOfferRepository;

  constructor({ db, saleRepository, cardRepository, exchangeOfferRepository }) {
    this.#db = db;
    this.#saleRepository = saleRepository;
    this.#cardRepository = cardRepository;
    this.#exchangeOfferRepository = exchangeOfferRepository;
  }

  // ───────── 1. 교환 제시하기 ─────────
  async createOffer(userId, saleId, { offeredUserCardId, description }) {
    return this.#db.transaction(async (tx) => {
      // 1) 판매글 확인
      const sale = await this.#saleRepository.findById(saleId, tx);
      if (!sale) throwHttp(NotFoundException, 'SALE_NOT_FOUND');
      if (sale.seller.id === userId) {
        throwHttp(ForbiddenException, 'EXCHANGE_OWN_SALE');
      }
      if (sale.remainingQuantity === 0) {
        throwHttp(ConflictException, 'SALE_SOLD_OUT');
      }

      // 2) 제시할 카드 확인
      const card = await this.#cardRepository.findById(offeredUserCardId, tx);
      if (!card) {
        throw new NotFoundException(ERROR_MESSAGE.USERCARD_NOT_FOUND, {
          code: ERROR_CODE.USER_CARD_NOT_FOUND,
        });
      }
      if (card.ownerId !== userId) {
        throwHttp(ForbiddenException, 'USER_CARD_FORBIDDEN');
      }
      if (card.netQuantity < 1) {
        throwHttp(ConflictException, 'CARD_QUANTITY_NOT_ENOUGH');
      }

      // 3) 판매자가 원하는 등급·장르인지 (null이면 통과)
      const { exchangeGrade, exchangeGenre } = sale;
      if (
        (exchangeGrade && exchangeGrade !== card.photoCard.grade) ||
        (exchangeGenre && exchangeGenre !== card.photoCard.genre)
      ) {
        throwHttp(BadRequestException, 'EXCHANGE_CONDITION_MISMATCH');
      }

      // 4) 같은 카드로 이미 제시했는지
      const duplicated = await this.#exchangeOfferRepository.findBySaleAndCard(
        saleId,
        offeredUserCardId,
        tx,
      );
      if (duplicated) throwHttp(ConflictException, 'EXCHANGE_DUPLICATED');

      // 5) 제시 카드 수량 -1 (맡겨두기)
      await this.#changeCard(card, { net: -1 }, tx);

      // 6) 교환 제시 저장
      const offer = await this.#exchangeOfferRepository.create(
        { saleId, proposerId: userId, offeredUserCardId, description },
        tx,
      );

      // TODO(알림): 판매자에게 "교환 제안 받음" 알림 생성 (같은 tx 안에서)
      // - userId: sale.seller.id (판매자)
      // - type: 'EXCHANGE_OFFER_RECEIVED'
      // - message 예: `[${card.photoCard.grade} | ${card.photoCard.name}] 포토카드로 교환 제안이 들어왔습니다.`
      // - exchangeOfferId: offer.id (saleId, purchaseId는 비움: 원인은 하나만)

      return {
        id: offer.id,
        status: offer.status,
        saleId: offer.saleId,
        offeredCard: {
          id: card.id,
          name: card.photoCard.name,
          grade: card.photoCard.grade,
        },
        createdAt: offer.createdAt,
      };
    });
  }

  // ───────── 2. 판매글의 교환 제시 목록 ─────────
  async getOffersBySale(userId, saleId, { status, page, limit }) {
    const sale = await this.#saleRepository.findById(saleId);
    if (!sale) throwHttp(NotFoundException, 'SALE_NOT_FOUND');

    // 판매자는 전체, 그 외에는 내가 보낸 제시만
    const proposerId = sale.seller.id === userId ? undefined : userId;
    const { items, totalCount } =
      await this.#exchangeOfferRepository.findPageBySale({
        saleId,
        proposerId,
        status,
        page,
        limit,
      });

    return {
      data: items.map(toOfferResponse),
      pagination: toPagination({ page, limit, totalCount }),
    };
  }

  // ───────── 3. 나에게 들어온 교환 제시 전체 ─────────
  async getMyReceivedOffers(userId, { status, page, limit }) {
    const { items, totalCount } =
      await this.#exchangeOfferRepository.findPageBySeller({
        sellerId: userId,
        status,
        page,
        limit,
      });

    return {
      data: items.map((offer) => ({
        ...toOfferResponse(offer),
        sale: { id: offer.sale.id, photoCard: offer.sale.userCard.photoCard },
      })),
      pagination: toPagination({ page, limit, totalCount }),
    };
  }

  // ───────── 4. 승인 / 거절 / 취소 ─────────
  async updateStatus(userId, exchangeId, status) {
    return this.#db.transaction(async (tx) => {
      const offer = await this.#exchangeOfferRepository.findById(
        exchangeId,
        tx,
      );
      if (!offer) throwHttp(NotFoundException, 'EXCHANGE_NOT_FOUND');

      // 권한: 승인·거절은 판매자, 취소는 제시자
      const isSeller = offer.sale.sellerId === userId;
      const isProposer = offer.proposerId === userId;
      const allowed = status === 'CANCELLED' ? isProposer : isSeller;
      if (!allowed) throwHttp(ForbiddenException, 'EXCHANGE_FORBIDDEN');

      // PENDING일 때만 바뀜 (동시 요청 방지)
      const updated = await this.#exchangeOfferRepository.updateStatusIfPending(
        exchangeId,
        status,
        tx,
      );
      if (!updated) throwHttp(ConflictException, 'EXCHANGE_NOT_PENDING');

      if (status === 'APPROVED') {
        await this.#approve(offer, tx);
      } else {
        // 거절·취소: 맡겨둔 카드 돌려주기
        await this.#changeCard(offer.offeredUserCard, { net: +1 }, tx);
      }

      // TODO(알림): 승인·거절이면 제시자에게 알림 생성 (같은 tx 안에서)
      // - 취소(CANCELLED)는 알림 없음 (10/27 회의)
      // - userId: offer.proposerId (제시자)
      // - type: 승인 'EXCHANGE_APPROVED' / 거절 'EXCHANGE_REJECTED'
      // - message 예: `[${grade} | ${name}] 포토카드 교환이 성사되었습니다.` / `...거절되었습니다.`
      //   (grade, name은 offer.sale.userCard.photoCard에 있음)
      // - exchangeOfferId: offer.id

      return { id: updated.id, status: updated.status, saleId: updated.saleId };
    });
  }

  // 승인: 서로 카드 1장씩 주고받기
  async #approve(offer, tx) {
    if (offer.sale.cancelledAt) throwHttp(ConflictException, 'SALE_CANCELLED');

    const sellerCard = offer.sale.userCard; // 판매자가 줄 카드
    const offeredCard = offer.offeredUserCard; // 제시자가 줄 카드 (이미 net -1 된 상태)

    if (sellerCard.netQuantity < 1) {
      throwHttp(ConflictException, 'CARD_QUANTITY_NOT_ENOUGH');
    }

    // 판매자: 판매글 카드 1장 내보냄
    await this.#changeCard(sellerCard, { net: -1, total: -1 }, tx);
    // 제시자: 맡겨둔 카드 1장 내보냄
    await this.#changeCard(offeredCard, { total: -1 }, tx);
    // 제시자가 판매글 카드를 받음
    await this.#receiveCard(offer.proposerId, sellerCard.photoCardId, tx);
    // 판매자가 제시 카드를 받음
    await this.#receiveCard(offer.sale.sellerId, offeredCard.photoCardId, tx);
  }

  // 보유 카드 수량 바꾸기 (그 사이 다른 요청이 바꿨으면 409)
  async #changeCard(card, { net = 0, total = 0 }, tx) {
    const updated = await this.#cardRepository.update(
      card.id,
      {
        netQuantity: card.netQuantity + net,
        totalQuantity: card.totalQuantity + total,
      },
      tx,
      { netQuantity: card.netQuantity, totalQuantity: card.totalQuantity },
    );
    if (!updated) throwHttp(ConflictException, 'CARD_QUANTITY_NOT_ENOUGH');
  }

  // 카드 1장 받기 (없으면 새로 만들고, 있으면 +1 / 10장 제한)
  async #receiveCard(ownerId, photoCardId, tx) {
    const owned = await this.#cardRepository.findByOwnerAndPhotoCard(
      ownerId,
      photoCardId,
      tx,
    );
    if (owned && owned.totalQuantity + 1 > MAX_CARD_PER_PHOTOCARD) {
      throwHttp(ConflictException, 'CARD_LIMIT_EXCEEDED');
    }
    await this.#cardRepository.upsert(
      ownerId,
      photoCardId,
      { ownerId, photoCardId, netQuantity: 1, totalQuantity: 1 },
      owned
        ? {
            netQuantity: owned.netQuantity + 1,
            totalQuantity: owned.totalQuantity + 1,
          }
        : { netQuantity: 1, totalQuantity: 1 },
      tx,
    );
  }
}
