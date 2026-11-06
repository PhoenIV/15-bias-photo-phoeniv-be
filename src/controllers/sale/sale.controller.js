import { HTTP_STATUS } from '#constants';
import { BaseController } from '../base.controller.js';
import { needsLogin, validate } from '#middlewares';
import {
  getSalesSchema,
  saleIdSchema,
  postSaleSchema,
  updateSaleSchema,
  purchaseSchema,
} from './dto/sale.dto.js';

export class SaleController extends BaseController {
  #saleService;

  constructor({ saleService }) {
    super();
    this.#saleService = saleService;
  }

  routes() {
    this.router.get('/', validate('query', getSalesSchema), (req, res) =>
      this.getSalesList(req, res),
    );
    this.router.get(
      '/:saleId',
      needsLogin,
      validate('params', saleIdSchema),
      (req, res) => this.getSaleDetail(req, res),
    );
    this.router.post(
      '/',
      needsLogin,
      validate('body', postSaleSchema),
      (req, res) => this.postSale(req, res),
    );
    this.router.patch(
      '/:saleId',
      needsLogin,
      validate('params', saleIdSchema),
      validate('body', updateSaleSchema),
      (req, res) => this.updateSale(req, res),
    );
    this.router.delete(
      '/:saleId',
      needsLogin,
      validate('params', saleIdSchema),
      (req, res) => this.deleteSale(req, res),
    );
    this.router.post(
      '/:saleId/purchases',
      needsLogin,
      validate('params', saleIdSchema),
      validate('body', purchaseSchema),
      (req, res) => this.makePurchase(req, res),
    );
    return this.router;
  }

  async getSalesList(req, res) {
    const { sort, cursor, limit, keyword, grade, genre, excludeSoldOut } =
      req.query;
    const salesList = await this.#saleService.getSales({
      sort,
      cursor,
      limit,
      keyword,
      grade,
      genre,
      excludeSoldOut,
    });
    res.status(HTTP_STATUS.OK).json(salesList);
  }

  async getSaleDetail(req, res) {
    const userId = req.user.id;
    const saleId = req.params.saleId;
    const sale = await this.#saleService.getSaleDetail(userId, saleId);
    res.status(HTTP_STATUS.OK).json(sale);
  }

  async postSale(req, res) {
    const userId = req.user.id;
    const data = req.body;
    const sale = await this.#saleService.postSale(userId, data);
    res.status(HTTP_STATUS.CREATED).json(sale);
  }

  async updateSale(req, res) {
    const userId = req.user.id;
    const saleId = req.params.saleId;
    const data = req.body;
    const sale = await this.#saleService.updateSale(userId, saleId, data);
    res.status(HTTP_STATUS.OK).json(sale);
  }

  async deleteSale(req, res) {
    const userId = req.user.id;
    const saleId = req.params.saleId;
    const sale = await this.#saleService.deleteSale(userId, saleId);
    res.status(HTTP_STATUS.OK).json(sale);
  }

  async makePurchase(req, res) {
    const userId = req.user.id;
    const saleId = req.params.saleId;
    const data = req.body;
    const purchase = await this.#saleService.makePurchase(userId, saleId, data);
    res.status(HTTP_STATUS.CREATED).json(purchase);
  }
}
