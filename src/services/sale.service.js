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
} from '#repositories';

import { db } from '#prisma/db.js';

export class SaleService {
  #saleRepository;
  #cardRepository;
  #exchangeOfferRepository;

  constructor() {
    this.#saleRepository = new SaleRepository();
    this.#cardRepository = new CardRepository();
    this.#exchangeOfferRepository = new ExchangeOfferRepository();
  }

  async getSales({ sort, cursor, limit }) {
    const { items, hasNext, nextCursor } = await this.#saleRepository.findPage({
      sort,
      cursor,
      limit,
    });
    return {
      data: items,
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
    const isMine = sale.seller.id === userId;
    return { ...sale, isMine };
  }

  async postSale(userId, userCardId, data) {
    const result = await db.transaction(async (tx) => {
      const userCard = await this.#cardRepository.findById(userCardId, tx);
      if (Number(userId) !== userCard.ownerId) {
        throw new ForbiddenException(ERROR_MESSAGE.MUST_OWN_CARD_TO_SELL);
      }
      if (userCard.netQuantity < data.quantity) {
        throw new BadRequestException(ERROR_MESSAGE.INSUFFICIENT_CARD);
      }
      if (data.price < userCard.photoCard.minPrice) {
        throw new BadRequestException(ERROR_MESSAGE.PRICE_TOO_LOW);
      }

      await this.#cardRepository.update(
        userCardId,
        { netQuantity: userCard.netQuantity - data.quantity },
        tx,
        { netQuantity: userCard.netQuantity },
      );
      await this.#saleRepository.create(
        {
          ...data,
          userCardId,
          sellerId: userId,
          remainingQuantity: data.quantity,
        },
        tx,
      );
    });
    return result;
  }

  async updateSale(userId, saleId, data) {
    const result = await db.transaction(async (tx) => {
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
      if (data.quantity !== undefined) {
        const change = data.quantity - sale.remainingQuantity;
        if (change > sale.userCard.netQuantity) {
          throw new BadRequestException(ERROR_MESSAGE.INSUFFICIENT_CARD);
        }
        if (data.quantity <= 0) {
          throw new BadRequestException(ERROR_MESSAGE.CANNOT_SELL_ZERO_ITEM);
        }
        userCardData = {
          netQuantity: sale.userCard.netQuantity - change,
        };

        data.totalQuantity = data.quantity;
        data.remainingQuantity = data.quantity;
      }

      const { quantity, ...saleData } = data;

      const newSale = await this.#saleRepository.update(saleId, saleData, tx, {
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
    return result; // 명세에 맞게 평평하게 다듬어야 함.
  }

  async deleteSale(userId, saleId) {
    const result = await db.transaction(async (tx) => {
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
      //교환을제시한 사람들에게 netQuantity 복구시켜주기 -> 각 제안의 id별로 별도 처리
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
    return result; // 명세에 맞게 평평하게 다듬어야 함.
  }
}
