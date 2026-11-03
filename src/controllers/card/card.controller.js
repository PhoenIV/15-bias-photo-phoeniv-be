import { HTTP_STATUS } from '#constants';
import { BaseController } from '../base.controller.js';
import { cardCreateSchema } from './dto/card.dto.js';
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
