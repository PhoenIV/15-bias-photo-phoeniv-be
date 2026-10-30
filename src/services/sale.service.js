import { ERROR_MESSAGE } from '#constants';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '#exceptions';
import {
  SaleRepository,
  CardRepository,
  ExchangeOfferRepository,
  UserRepository,
} from '#repositories';

import { db } from '#prisma/db.js';

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
    imageUrl: photoCard.imageUrl,
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

  constructor() {
    this.#db = db;
    this.#saleRepository = new SaleRepository();
    this.#cardRepository = new CardRepository();
    this.#exchangeOfferRepository = new ExchangeOfferRepository();
    this.#userRepository = new UserRepository({ db });
  }

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

  async getSaleDetail(userId, saleId) {
    const sale = await this.#saleRepository.findById(saleId);

    if (!sale) {
      throw new NotFoundException(ERROR_MESSAGE.SALE_NOT_FOUND);
    }

    const parsedSale = toSaleResponse(sale);
    const isMine = sale.seller.id === userId;

    return { data: { ...parsedSale, isMine } };
  }

  async postSale(userId, userCardId, data) {
    const result = await this.#db.transaction(async (tx) => {
      const userCard = await this.#cardRepository.findById(userCardId, tx);
      if (Number(userId) !== userCard.ownerId) {
        throw new ForbiddenException(ERROR_MESSAGE.MUST_OWN_CARD_TO_SELL);
      }
      if (userCard.netQuantity < data.totalQuantity) {
        throw new BadRequestException(ERROR_MESSAGE.INSUFFICIENT_CARD);
      }
      if (data.price < userCard.photoCard.minPrice) {
        throw new BadRequestException(ERROR_MESSAGE.PRICE_TOO_LOW);
      }

      await this.#cardRepository.update(
        userCardId,
        { netQuantity: userCard.netQuantity - data.totalQuantity },
        tx,
        { netQuantity: userCard.netQuantity },
      );
      return await this.#saleRepository.create(
        {
          ...data,
          userCardId,
          sellerId: userId,
          totalQuantity: data.totalQuantity,
          remainingQuantity: data.totalQuantity,
        },
        tx,
      );
    });
    const parsedSale = toSaleResponse(result);
    return { data: parsedSale };
  }

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
      return { newSale, newUserCard };
    });
    const parsedSale =
      result.newSale !== null ? toSaleResponse(result.newSale) : null;
    return { data: parsedSale };
  }

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
      const newSale = await this.#saleRepository.markCancelled(saleId, tx);
      await this.#cardRepository.update(
        sale.userCard.id,
        { netQuantity: sale.userCard.netQuantity + sale.remainingQuantity },
        tx,
      );
      await Promise.all(
        sale.exchangeOffers.map((offer) => {
          return this.#cardRepository.update(
            offer.offeredUserCard.id,
            {
              netQuantity: offer.offeredUserCard.netQuantity + 1,
            },
            tx,
          );
        }),
      );
      return newSale;
    });
    const deletedSale = { id: result.id, cancelledAt: result.cancelledAt };
    return { data: deletedSale };
  }

  async makePurchase(userId, saleId, data) {
    const result = await this.#db.transaction(async (tx) => {
      const sale = await this.#saleRepository.findById(saleId, tx);
      const user = await this.#userRepository.findById(userId);
      const createData = {
        ownerId: userId,
        photoCardId: sale.userCard.photoCard.id,
        totalQuantity: data.quantity,
        netQuantity: data.quantity,
      };
      const buyerCard = await this.#cardRepository.findByOwnerAndPhotoCard(
        userId,
        sale.userCard.photoCard.id,
        tx,
      );
      const updateData = buyerCard
        ? {
            totalQuantity: buyerCard.totalQuantity + data.quantity,
            netQuantity: buyerCard.netQuantity + data.quantity,
          }
        : createData;

      const purchase = await this.#saleRepository.createPurchase(
        userId,
        saleId,
        { ...data, price: sale.price, saleId },
        tx,
        { price: sale.price },
      );
      await this.#userRepository.updateInTx(
        sale.seller.id,
        { point: sale.seller.point + sale.price * data.quantity },
        tx,
      );
      await this.#userRepository.updateInTx(
        user.id,
        { point: user.point - sale.price * data.quantity },
        tx,
        { point: user.point },
      );
      await this.#cardRepository.update(
        sale.userCard.id,
        { totalQuantity: sale.userCard.totalQuantity - data.quantity },
        tx,
        { totalQuantity: sale.userCard.totalQuantity },
      );
      const newUserCard = await this.#cardRepository.upsert(
        userId,
        sale.userCard.photoCard.id,
        createData,
        updateData,
        tx,
      );
      await this.#saleRepository.update(
        saleId,
        { remainingQuantity: sale.remainingQuantity - data.quantity },
        tx,
        { remainingQuantity: sale.remainingQuantity },
      );
      return { sale, newUserCard, purchase };
    });

    // 트랙잭션이 끝난 후 반환되는 객체에 담긴 카드 아이디는 구매자(새 주인)쪽의 userCardId
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
      imageUrl: sale.userCard.photoCard.imageUrl,
    };
    return {
      data: { id, quantity, price, createdAt, saleId: saleIdFromResult, card },
    };
  }
}
