import { HTTP_STATUS } from '#constants';
import { needsLogin, validate } from '#middlewares';
import { BaseController } from '../base.controller.js';
import {
  saleIdParamSchema,
  exchangeIdParamSchema,
  createExchangeSchema,
  updateExchangeSchema,
  exchangeListQuerySchema,
} from './dto/exchange.dto.js';

export class ExchangeController extends BaseController {
  #exchangeService;

  constructor({ exchangeService }) {
    super();
    this.#exchangeService = exchangeService;
  }

  routes() {
    // 판매글의 교환 제시 목록
    this.router.get(
      '/sales/:saleId/exchanges',
      needsLogin,
      validate('params', saleIdParamSchema),
      validate('query', exchangeListQuerySchema),
      (req, res) => this.getOffersBySale(req, res),
    );
    // 교환 제시하기
    this.router.post(
      '/sales/:saleId/exchanges',
      needsLogin,
      validate('params', saleIdParamSchema),
      validate('body', createExchangeSchema),
      (req, res) => this.createOffer(req, res),
    );
    // 나에게 들어온 제시 전체 (/:exchangeId 보다 먼저!)
    this.router.get(
      '/exchanges/me',
      needsLogin,
      validate('query', exchangeListQuerySchema),
      (req, res) => this.getMyReceivedOffers(req, res),
    );
    // 승인·거절·취소
    this.router.patch(
      '/exchanges/:exchangeId',
      needsLogin,
      validate('params', exchangeIdParamSchema),
      validate('body', updateExchangeSchema),
      (req, res) => this.updateStatus(req, res),
    );
    return this.router;
  }

  async createOffer(req, res) {
    const offer = await this.#exchangeService.createOffer(
      req.user.id,
      req.params.saleId,
      req.body,
    );
    res.status(HTTP_STATUS.CREATED).json({ data: offer });
  }

  async getOffersBySale(req, res) {
    const result = await this.#exchangeService.getOffersBySale(
      req.user.id,
      req.params.saleId,
      req.query,
    );
    res.status(HTTP_STATUS.OK).json(result);
  }

  async getMyReceivedOffers(req, res) {
    const result = await this.#exchangeService.getMyReceivedOffers(
      req.user.id,
      req.query,
    );
    res.status(HTTP_STATUS.OK).json(result);
  }

  async updateStatus(req, res) {
    const result = await this.#exchangeService.updateStatus(
      req.user.id,
      req.params.exchangeId,
      req.body.status,
    );
    res.status(HTTP_STATUS.OK).json({ data: result });
  }
}
