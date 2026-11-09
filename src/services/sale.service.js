import { ERROR_MESSAGE } from '#constants';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '#exceptions';

// 응답을 명세에 맞는 형태로 가공하는 함수
const toSaleResponse = (sale) => {
  if (!sale) return;

  const userCard = sale.userCard;
  const photoCard = sale.userCard.photoCard;

  const {
    id,
    price,
    totalQuantity,
    remainingQuantity,
    exchangeGrade,
    exchangeGenre,
    exchangeDescription,
    createdAt,
  } = sale;
  const seller = { id: sale.seller.id, nickname: sale.seller.nickname };
  const card = {
    id: userCard.id,
    name: photoCard.name,
    grade: photoCard.grade,
    genre: photoCard.genre,
    description: photoCard.description,
    imagePublicId: photoCard.imagePublicId,
  };
  const creator = {
    id: photoCard.creator.id,
    nickname: photoCard.creator.nickname,
  };

  return {
    id,
    price,
    totalQuantity,
    remainingQuantity,
    exchangeGrade,
    exchangeGenre,
    exchangeDescription,
    createdAt,
    seller,
    card: { ...card, creator },
  };
};
export class SaleService {
  #db;
  #saleRepository;
  #cardRepository;
  #exchangeOfferRepository;
  #userRepository;
  #pointHistoryRepository;
  #notificationRepository;
  #notificationService;

  constructor({
    db,
    saleRepository,
    cardRepository,
    exchangeOfferRepository,
    userRepository,
    pointHistoryRepository,
    notificationRepository,
    notificationService,
  }) {
    this.#db = db;
    this.#saleRepository = saleRepository;
    this.#cardRepository = cardRepository;
    this.#exchangeOfferRepository = exchangeOfferRepository;
    this.#userRepository = userRepository;
    this.#pointHistoryRepository = pointHistoryRepository;
    this.#notificationRepository = notificationRepository;
    this.#notificationService = notificationService;
  }

  // 1. 판매글 목록 조회 함수
  async getSales(options = {}) {
    const {
      sort = 'latest',
      cursor,
      limit = 15,
      keyword = '',
      grade,
      genre,
      excludeSoldOut = false,
    } = options;

    const { items, hasNext, nextCursor } = await this.#saleRepository.findPage({
      sort,
      cursor,
      limit,
      keyword,
      grade,
      genre,
      excludeSoldOut,
    });
    return {
      data: items.map((sale) => toSaleResponse(sale)),
      pagination: {
        limit,
        hasNext,
        nextCursor: nextCursor === null ? null : nextCursor,
      },
    };
  }

  // 2. 판매글 상세 조회 함수
  async getSaleDetail(userId, saleId) {
    const sale = await this.#saleRepository.findById(saleId);

    if (!sale) {
      throw new NotFoundException(ERROR_MESSAGE.SALE_NOT_FOUND);
    }

    const parsedSale = toSaleResponse(sale);
    const isMine = sale.seller.id === userId;

    // 수정 모달용: 판매자 본인에게만 보유 수량·최소 가격을 내려줌
    if (isMine) {
      parsedSale.card.netQuantity = sale.userCard.netQuantity;
      parsedSale.card.minPrice = sale.userCard.photoCard.minPrice;
    }

    return { data: { ...parsedSale, isMine } };
  }

  // 3. 판매글 게시 함수
  async postSale(userId, data) {
    const result = await this.#db.transaction(async (tx) => {
      const userCard = await this.#cardRepository.findById(data.userCardId, tx);
      if (!userCard) {
        throw new NotFoundException(ERROR_MESSAGE.USERCARD_NOT_FOUND);
      }
      if (userId !== userCard.ownerId) {
        throw new ForbiddenException(ERROR_MESSAGE.MUST_OWN_CARD_TO_SELL);
      }
      if (userCard.netQuantity < data.totalQuantity) {
        throw new BadRequestException(ERROR_MESSAGE.INSUFFICIENT_CARD);
      }
      if (data.price < userCard.photoCard.minPrice) {
        throw new BadRequestException(ERROR_MESSAGE.PRICE_TOO_LOW);
      }

      const newCard = await this.#cardRepository.update(
        data.userCardId,
        { netQuantity: userCard.netQuantity - data.totalQuantity },
        tx,
        { netQuantity: userCard.netQuantity },
      );
      const sale = await this.#saleRepository.create(
        {
          ...data,
          sellerId: userId,
          totalQuantity: data.totalQuantity,
          remainingQuantity: data.totalQuantity,
        },
        tx,
      );
      if (!newCard || !sale) {
        throw new ConflictException(ERROR_MESSAGE.FAILED_TO_CREATE_SALE);
      }
      return sale;
    });
    const parsedSale = toSaleResponse(result);
    return { data: parsedSale };
  }

  // 4. 판매글 수정 함수
  async updateSale(userId, saleId, data) {
    const result = await this.#db.transaction(async (tx) => {
      const sale = await this.#saleRepository.findById(saleId, tx);

      if (!sale) {
        throw new NotFoundException(ERROR_MESSAGE.SALE_NOT_FOUND);
      }

      // 로그인한 유저가 카드 소유주가 아닐 때
      if (sale.seller.id !== userId) {
        throw new ForbiddenException(ERROR_MESSAGE.UNAUTHORIZED_FOR_THIS_SALE);
      }

      // 가격을 바꿨는데 최소가격 미만일 때
      if (
        data.price !== undefined &&
        data.price < sale.userCard.photoCard.minPrice
      ) {
        throw new BadRequestException(ERROR_MESSAGE.PRICE_TOO_LOW);
      }

      let userCardData;

      // 판매 수량을 바꿨는데 잔여 순보유수량보다 많거나 0 이하일 때
      if (data.totalQuantity !== undefined) {
        const change = data.totalQuantity - sale.remainingQuantity;
        if (change > sale.userCard.netQuantity) {
          throw new BadRequestException(ERROR_MESSAGE.INSUFFICIENT_CARD);
        }
        if (data.totalQuantity <= 0) {
          throw new BadRequestException(ERROR_MESSAGE.CANNOT_SELL_ZERO_ITEM);
        }
        userCardData = {
          netQuantity: sale.userCard.netQuantity - change,
        };

        data.remainingQuantity = data.totalQuantity;
      }

      const newSale = await this.#saleRepository.update(saleId, data, tx, {
        remainingQuantity: sale.remainingQuantity,
      });
      const newUserCard = userCardData
        ? await this.#cardRepository.update(
            sale.userCard.id,
            userCardData,
            tx,
            { netQuantity: sale.userCard.netQuantity },
          )
        : undefined;
      if (!newSale || (userCardData && !newUserCard)) {
        throw new ConflictException(ERROR_MESSAGE.FAILED_TO_UPDATE_SALE);
      }
      return { newSale, newUserCard };
    });
    const parsedSale =
      result.newSale !== null ? toSaleResponse(result.newSale) : null;
    return { data: parsedSale };
  }

  // 5. 판매글 내리기 함수
  async deleteSale(userId, saleId) {
    const result = await this.#db.transaction(async (tx) => {
      const sale = await this.#saleRepository.findById(saleId, tx);

      if (!sale) {
        throw new NotFoundException(ERROR_MESSAGE.SALE_NOT_FOUND);
      }
      if (sale.seller.id !== userId) {
        throw new ForbiddenException(ERROR_MESSAGE.UNAUTHORIZED_FOR_THIS_SALE);
      }
      await this.#exchangeOfferRepository.markCancelledAll(saleId, tx);
      const newSale = await this.#saleRepository.markCancelled(saleId, tx, {
        remainingQuantity: sale.remainingQuantity,
      });
      const newCard = await this.#cardRepository.update(
        sale.userCard.id,
        { netQuantity: sale.userCard.netQuantity + sale.remainingQuantity },
        tx,
        { netQuantity: sale.userCard.netQuantity },
      );
      const restoredCards = await Promise.all(
        sale.exchangeOffers.map((offer) => {
          return this.#cardRepository.update(
            offer.offeredUserCard.id,
            {
              netQuantity: offer.offeredUserCard.netQuantity + 1,
            },
            tx,
            { netQuantity: offer.offeredUserCard.netQuantity },
          );
        }),
      );
      if (!newSale || !newCard || restoredCards.some((card) => !card)) {
        throw new ConflictException(ERROR_MESSAGE.FAILED_TO_DELETE_SALE);
      }
      return newSale;
    });
    const deletedSale = { id: result.id, cancelledAt: result.cancelledAt };
    return { data: deletedSale };
  }

  // 수지님께: 여기가 구매가 실제로 이루어지는 함수입니다! 262번째 줄에서부터 트랜잭션 콜백 함수가 있습니다.
  // 6. 구매하기 함수
  async makePurchase(userId, saleId, data) {
    const { expectedPrice, ...purchaseData } = data;
    const result = await this.#db.transaction(async (tx) => {
      // 트랜잭션 안에서 판매글과 유저(구매자) 정보를 조회합니다.
      // 유저가 판매자 본인이거나 희망하는 구매수량이 잔여수량보다 많지는 않은지, 금액 변동은 없었는지,
      // 또는 유저의 포인트가 구매액보다 적지는 않은지 확인합니다.
      const sale = await this.#saleRepository.findById(saleId, tx);
      if (!sale) {
        throw new NotFoundException(ERROR_MESSAGE.SALE_NOT_FOUND);
      }
      const user = await this.#userRepository.findByIdInTxAndLock(userId, tx);
      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGE.UNAUTHORIZED);
      }
      if (sale.seller.id === userId) {
        throw new ForbiddenException(ERROR_MESSAGE.CANNOT_BUY_OWN_SALE);
      }
      if (purchaseData.quantity > sale.remainingQuantity) {
        throw new BadRequestException(ERROR_MESSAGE.LOW_INVENTORY);
      }
      if (expectedPrice < sale.price) {
        throw new BadRequestException(ERROR_MESSAGE.PRICE_AUGMENTED);
      }
      if (user.point < purchaseData.quantity * sale.price) {
        throw new BadRequestException(ERROR_MESSAGE.INSUFFICIENT_POINT);
      }

      // upsert가 유저카드 신규 생성으로 진행될 경우 전달할 데이터입니다.
      const createData = {
        ownerId: userId,
        photoCardId: sale.userCard.photoCard.id,
        totalQuantity: data.quantity,
        netQuantity: data.quantity,
      };
      // 구매자가 이미 같은 카드를 가지고 있는지 확인합니다.
      const buyerCard = await this.#cardRepository.findByOwnerAndPhotoCard(
        userId,
        sale.userCard.photoCard.id,
        tx,
      );
      // 같은 카드가 이미 있다면 대신 사용할 updateData를 준비합니다.
      const updateData = buyerCard
        ? {
            totalQuantity: buyerCard.totalQuantity + data.quantity,
            netQuantity: buyerCard.netQuantity + data.quantity,
          }
        : createData;

      // 6-(1). 구매 기록을 생성합니다.
      const purchase = await this.#saleRepository.createPurchase(
        userId,
        saleId,
        { ...purchaseData, price: sale.price },
        tx,
      );
      // 6-(2). 판매자의 포인트를 증가시킵니다.
      const newSeller = await this.#userRepository.updateInTx(
        sale.seller.id,
        { point: sale.seller.point + sale.price * data.quantity },
        tx,
        { point: sale.seller.point },
      );
      // 6-(3). 구매자의 포인트를 감소시킵니다.
      const newUser = await this.#userRepository.updateInTx(
        user.id,
        { point: user.point - sale.price * data.quantity },
        tx,
        { point: user.point },
      );
      // 6-(4). 판매자의 카드 총 보유 수량을 감소시킵니다. (netQuantity는 판매에 내놓은 수량은 뺀 수량이라 변동이 없습니다.)
      const newSellerCard = await this.#cardRepository.update(
        sale.userCard.id,
        { totalQuantity: sale.userCard.totalQuantity - data.quantity },
        tx,
        { totalQuantity: sale.userCard.totalQuantity },
      );
      // 6-(5). 구매자의 카드 보유 수량을 증가시킵니다. 기존에 카드가 없었다면 새로 생성합니다.
      const newUserCard = await this.#cardRepository.upsert(
        userId,
        sale.userCard.photoCard.id,
        createData,
        updateData,
        tx,
      );
      // 6-(6). 판매글의 표시되는 잔여수량을 감소시킵니다.
      const newSale = await this.#saleRepository.update(
        saleId,
        { remainingQuantity: sale.remainingQuantity - data.quantity },
        tx,
        { remainingQuantity: sale.remainingQuantity },
      );

      // 포인트 히스토리 생성에 갱신값이 사용되기 때문에, 먼저 6개 함수의 실행 결과를 확인합니다.
      // 하나라도 실패시 오류를 던집니다.
      if (
        !purchase ||
        !newSeller ||
        !newUser ||
        !newSellerCard ||
        !newUserCard ||
        !newSale
      ) {
        throw new ConflictException(ERROR_MESSAGE.FAILED_TO_CREATE_PURCHASE);
      }

      // 6-(7). 구매자의 포인트 차감 기록을 생성합니다.
      const buyerPointHistory =
        await this.#pointHistoryRepository.createByPurchase(
          {
            amount: -(sale.price * data.quantity),
            balanceAfter: newUser.point,
            userId: user.id,
            purchaseId: purchase.id,
          },
          tx,
        );
      // 6-(8). 판매자의 포인트 증가 기록을 생성합니다.
      const sellerPointHistory =
        await this.#pointHistoryRepository.createByPurchase(
          {
            amount: +(sale.price * data.quantity),
            balanceAfter: newSeller.point,
            userId: sale.seller.id,
            purchaseId: purchase.id,
          },
          tx,
        );
      // 6-(9). 구매자 및 판매자에게 알림(품절 시 품절 알림 포함)
      const { grade, name: cardName } = sale.userCard.photoCard;

      const buyerPurchaseNotification =
        await this.#notificationRepository.createBuyerPurchaseNotification(
          {
            userId: user.id,
            purchaseId: purchase.id,
            grade,
            cardName,
            quantity: data.quantity,
          },
          tx,
        );

      const sellerPurchaseNotification =
        await this.#notificationRepository.createByPurchase(
          {
            userId: sale.seller.id,
            purchaseId: purchase.id,
            counterpartNickname: user.nickname,
            grade,
            cardName,
            quantity: data.quantity,
          },
          tx,
        );

      const isSoldOut = newSale.remainingQuantity === 0;
      const soldOutNotification = isSoldOut
        ? await this.#notificationRepository.createBySoldOut(
            {
              userId: sale.seller.id,
              saleId: newSale.id,
              grade,
              cardName,
            },
            tx,
          )
        : null;

      // 트랜잭션 내에 나머지 함수의 생성 결과도 확인합니다.
      if (
        !buyerPointHistory ||
        !sellerPointHistory ||
        !buyerPurchaseNotification ||
        !sellerPurchaseNotification ||
        (isSoldOut && !soldOutNotification)
      ) {
        throw new ConflictException(ERROR_MESSAGE.FAILED_TO_CREATE_PURCHASE);
      }

      // 응답으로는 구매를 성공한 유저의 화면에서 필요한 정보만을 반환합니다.
      return { sale, newUserCard, purchase };
    });

    // 트랜잭션 커밋 완료 후 구매자와 판매자에게 실시간 SSE 변경 알림 전송
    this.#notificationService.emitChanged(userId);
    this.#notificationService.emitChanged(result.sale.seller.id);

    // 명세에 맞게 나갈 수 있도록 응답을 1차 가공합니다.
    const { sale, newUserCard, purchase } = result;
    const {
      id,
      quantity,
      price,
      createdAt,
      saleIdFromResult = saleId,
    } = purchase;
    const card = {
      id: newUserCard.id,
      name: sale.userCard.photoCard.name,
      grade: sale.userCard.photoCard.grade,
      genre: sale.userCard.photoCard.genre,
      imagePublicId: sale.userCard.photoCard.imagePublicId,
    };
    return {
      data: { id, quantity, price, createdAt, saleId: saleIdFromResult, card },
    };
  }
}
