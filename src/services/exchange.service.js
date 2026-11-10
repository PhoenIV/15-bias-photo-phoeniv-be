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
  #userRepository; //상대방 닉네임 조회용 (알림 메시지에 들어감)
  #notificationRepository; // 알림을 db에 저장
  #notificationService; //접속 중인 사람에게 "새 알림" 신호 보내기

  constructor({
    db,
    saleRepository,
    cardRepository,
    exchangeOfferRepository,
    userRepository,
    notificationRepository,
    notificationService,
  }) {
    this.#db = db;
    this.#saleRepository = saleRepository;
    this.#cardRepository = cardRepository;
    this.#exchangeOfferRepository = exchangeOfferRepository;
    this.#userRepository = userRepository;
    this.#notificationRepository = notificationRepository;
    this.#notificationService = notificationService;
  }

  // ───────── 1. 교환 제시하기 ─────────
  async createOffer(userId, saleId, { offeredUserCardId, description }) {
    const result = await this.#db.transaction(async (tx) => {
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

      // 7) 판매자에게 "교환 제안 받음" 알림 저장
      //    - 받는 사람: 판매자 (sale.seller.id)
      //    - 메시지 앞 닉네임: 제시한 사람(나)의 닉네임 → 유저 저장소에서 조회
      //    - [등급 | 카드이름]: 판매글에 올라간 카드 기준
      //    - tx를 넘겨서 같은 트랜잭션 안에서 저장 → 중간에 에러 나면 알림도 같이 취소됨
      const proposer = await this.#userRepository.findById(userId);
      const { grade, name: cardName } = sale.userCard.photoCard;
      await this.#notificationRepository.createByExchangeOfferReceived(
        {
          userId: sale.seller.id,
          exchangeOfferId: offer.id,
          counterpartNickname: proposer.nickname,
          grade,
          cardName,
        },
        tx,
      );

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
        sellerId: sale.seller.id, // 아래에서 신호 보낼 때 쓰려고 잠깐 담아둠
      };
    });

    // 트랜잭션이 성공적으로 끝난 뒤에만 판매자에게 "새 알림" 신호 보내기
    // sellerId는 응답에 안 나가게 따로 빼고, 나머지(response)만 돌려줌

    const { sellerId, ...response } = result;
    this.#notificationService.emitChanged(sellerId);
    return response;
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

    // 가장 최근의 매입가 구하여 반환값에 추가하기 (교환 제시받은 카드에 표시용)
    const parsed = items.map(toOfferResponse);
    await Promise.all(
      parsed.map(async (offer) => {
        const latestPurchase =
          await this.#exchangeOfferRepository.findLatestPurchasePrice(
            offer.offeredCard.id,
          );
        offer.offeredCard.latestPrice = latestPurchase?.price ?? null;
      }),
    );

    return {
      data: parsed,
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
    const result = await this.#db.transaction(async (tx) => {
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

      // 승인·거절이면 제시자에게 알림 저장 (취소는 알림 없음, 10/27 회의)
      //    - 받는 사람: 교환을 제시한 사람 (offer.proposerId)
      //    - 메시지 앞 닉네임: 승인·거절한 판매자(나)의 닉네임 → 유저 저장소에서 조회
      //    - [등급 | 카드이름]: 판매글에 올라간 카드 기준
      //    - 승인이면 "성사" 알림, 거절이면 "거절" 알림 함수를 따로 호출
      if (status !== 'CANCELLED') {
        const seller = await this.#userRepository.findById(userId);
        const { grade, name: cardName } = offer.sale.userCard.photoCard;
        const data = {
          userId: offer.proposerId,
          exchangeOfferId: offer.id,
          counterpartNickname: seller.nickname,
          grade,
          cardName,
        };
        if (status === 'APPROVED') {
          await this.#notificationRepository.createByExchangeApproved(data, tx);
        } else {
          await this.#notificationRepository.createByExchangeRejected(data, tx);
        }
      }

      return {
        id: updated.id,
        status: updated.status,
        saleId: updated.saleId,
        proposerId: offer.proposerId, // 아래에서 신호 보낼 때 쓰려고 잠깐 담아둠
      };
    });

    // 트랜잭션이 끝난 뒤 제시자에게 "새 알림" 신호 보내기 (취소는 알림이 없으니 제외)
    // proposerId는 응답에 안 나가게 따로 빼고, 나머지(response)만 돌려줌
    const { proposerId, ...response } = result;
    if (status !== 'CANCELLED') {
      this.#notificationService.emitChanged(proposerId);
    }
    return response;
  }

  // 승인: 서로 카드 1장씩 주고받기
  async #approve(offer, tx) {
    const { sale } = offer;
    if (sale.cancelledAt) throwHttp(ConflictException, 'SALE_CANCELLED');
    if (sale.remainingQuantity < 1)
      throwHttp(ConflictException, 'SALE_SOLD_OUT');

    const sellerCard = sale.userCard; // 판매자가 줄 카드 (판매글에 올린 카드)
    const offeredCard = offer.offeredUserCard; // 제시자가 줄 카드 (이미 net -1 된 상태)

    // 판매글 남은 수량 -1 (아까 본 수량 그대로일 때만, 아니면 품절 409)
    const updatedSale = await this.#saleRepository.update(
      sale.id,
      { remainingQuantity: sale.remainingQuantity - 1 },
      tx,
      { remainingQuantity: sale.remainingQuantity },
    );
    if (!updatedSale) throwHttp(ConflictException, 'SALE_SOLD_OUT');

    // 판매자: 판매글에 올려둔 카드 1장이 나감 (판매 등록 안 한 수량은 그대로)
    await this.#changeCard(sellerCard, { total: -1 }, tx);
    // 제시자: 맡겨둔 카드 1장이 나감
    await this.#changeCard(offeredCard, { total: -1 }, tx);
    // 제시자가 판매글 카드를 받음
    await this.#receiveCard(offer.proposerId, sellerCard.photoCardId, tx);
    // 판매자가 제시 카드를 받음
    await this.#receiveCard(sale.sellerId, offeredCard.photoCardId, tx);
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

    // 처음 받는 카드: 새로 만들기
    // (동시에 다른 요청이 먼저 만들었으면 unique 제약 에러 → 전체 롤백)
    if (!owned) {
      await this.#exchangeOfferRepository.createReceivedCard(
        { ownerId, photoCardId, netQuantity: 1, totalQuantity: 1 },
        tx,
      );
      return;
    }

    if (owned.totalQuantity + 1 > MAX_CARD_PER_PHOTOCARD) {
      throwHttp(ConflictException, 'CARD_LIMIT_EXCEEDED');
    }
    // 이미 있는 카드: 아까 읽은 수량 그대로일 때만 +1 (아니면 409)
    await this.#changeCard(owned, { net: +1, total: +1 }, tx);
  }
}
