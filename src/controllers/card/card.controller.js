import { HTTP_STATUS } from '#constants';
import { BaseController } from '../base.controller.js';
import {
  cardCreateSchema,
  myCardQuerySchema,
  mySaleQuerySchema,
} from './dto/card.dto.js';
import {
  needsLogin,
  validate,
  receiveImage,
  requireImage,
  validateImageContent,
} from '#middlewares';

export class CardController extends BaseController {
  #cardService;

  constructor({ cardService }) {
    super();
    this.#cardService = cardService;
  }

  routes() {
    this.router.get('/quota', needsLogin, (req, res) =>
      this.getQuota(req, res),
    );

    this.router.get(
      '/me',
      needsLogin,
      validate('query', myCardQuerySchema),
      (req, res) => this.getMyCards(req, res),
    );

    // 나의 판매·교환 포토카드 목록 조회
    this.router.get(
      '/me/sales',
      needsLogin,
      validate('query', mySaleQuerySchema),
      this.getMySales.bind(this),
    );

    this.router.post(
      '/',
      needsLogin,
      receiveImage,
      requireImage,
      validateImageContent,
      validate('body', cardCreateSchema),
      (req, res) => this.createCard(req, res),
    );

    return this.router;
  }

  async getQuota(req, res) {
    const userId = req.user.id;
    const result = await this.#cardService.getQuota(userId);

    return res.status(HTTP_STATUS.OK).json({ data: result });
  }

  async getMyCards(req, res) {
    const userId = req.user.id;
    const query = req.query;

    const result = await this.#cardService.getMyCards(userId, query);

    return res.status(HTTP_STATUS.OK).json(result);
  }

  // 나의 판매·교환 포토카드 목록 조회
  async getMySales(req, res) {
    const userId = req.user.id;
    const query = req.query;

    const result = await this.#cardService.getMySales(userId, query);

    return res.status(HTTP_STATUS.OK).json(result);
  }

  async createCard(req, res) {
    const userId = req.user.id;

    const cardData = req.body;
    const imageBuffer = req.file.buffer;

    const { photoCard, userCard } = await this.#cardService.createPhotoCard(
      userId,
      cardData,
      imageBuffer,
    );

    const responseData = {
      userCardId: userCard.id,
      photoCardId: photoCard.id,
      name: photoCard.name,
      grade: photoCard.grade,
      genre: photoCard.genre,
      minPrice: photoCard.minPrice,
      totalCreated: photoCard.totalCreated,
      netQuantity: userCard.netQuantity,
      totalQuantity: userCard.totalQuantity,
      imagePublicId: photoCard.imagePublicId,
      description: photoCard.description,
      creatorNickname: req.user.nickname,
      createdAt: photoCard.createdAt,
    };

    return res.status(HTTP_STATUS.CREATED).json({
      data: responseData,
    });
  }
}
