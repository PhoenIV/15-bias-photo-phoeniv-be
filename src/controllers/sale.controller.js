import { HTTP_STATUS } from '#constants';
import { SaleService } from '#services';
import { BaseController } from './base.controller.js';

export class SaleController extends BaseController {
  #saleService;

  constructor() {
    super();
    this.#saleService = new SaleService();
  }

  routes() {
    this.router.get('/', (req, res) => this.getSalesList(req, res));
    this.router.get('/:saleId', (req, res) => this.getSaleDetail(req, res));
    this.router.post('/', (req, res) => this.postSale(req, res));
    this.router.patch('/:saleId', (req, res) => this.updateSale(req, res));
    this.router.delete('/:saleId', (req, res) => this.deleteSale(req, res));
    this.router.post('/:saleId/purchases', (req, res) =>
      this.makePurchase(req, res),
    );
    return this.router;
  }

  async getSalesList(req, res) {
    const { sort, cursor, limit, keyword, grade, genre, excludeSoldOut } =
      req.query;
    const list = await this.#saleService.getSales({
      sort,
      cursor,
      limit,
      keyword,
      grade,
      genre,
      excludeSoldOut,
    });
    res.status(HTTP_STATUS.OK).json(list);
  }

  async getSaleDetail(req, res) {
    const saleId = Number(req.paramms);
    const sale = await this.#saleService.getSaleDetail(saleId);
    res.status(HTTP_STATUS.OK).json(sale);
  }

  async postSale(req, res) {
    const { userId, userCardId, ...data } = req.body;
    const sale = await this.#saleService.postSale(userId, userCardId, data);
    res.status(HTTP_STATUS.CREATED).json(sale);
  }

  async updateSale(req, res) {
    const { userId, saleId, ...data } = req.body;
    const sale = await this.#saleService.updateSale(userId, saleId, data);
    res.status(HTTP_STATUS.OK).json(sale);
  }

  async deleteSale(req, res) {
    const { userId } = req.body;
    const { saleId } = req.params;
    const sale = await this.#saleService.deleteSale(userId, saleId);
    res.status(HTTP_STATUS.OK).json(sale);
  }

  async makePurchase(req, res) {
    const { userId, ...data } = req.body;
    const { saleId } = req.params;
    const purchase = await this.#saleService.makePurchase(userId, saleId, data);
    res.status(HTTP_STATUS.CREATED).json(purchase);
  }
}
