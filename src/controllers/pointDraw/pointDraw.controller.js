import { HTTP_STATUS } from '#constants';
import { needsLogin, validate } from '#middlewares';
import { BaseController } from '../base.controller.js';
import { pointDrawSchema } from './dto/pointDraw.dto.js';

export class PointDrawController extends BaseController {
  #pointDrawService;

  //생성자는 구조분해로 써야됨 (여러개를 넣어서 객체 형태로 {}를 쓴게 아님)
  constructor({ pointDrawService }) {
    super();
    this.#pointDrawService = pointDrawService;
  }

  routes() {
    this.router.get('/status', needsLogin, (req, res) =>
      this.getDrawStatus(req, res),
    );
    this.router.post(
      '/',
      needsLogin,
      validate('body', pointDrawSchema),
      (req, res) => this.draw(req, res),
    );
    return this.router;
  }

  async getDrawStatus(req, res) {
    const userId = req.user.id; //전역에 걸린 authenticate를 통과하면 req.user = {id}가 생김
    const { canDraw, nextAvailableAt, serverTime } =
      await this.#pointDrawService.getDrawStatus(userId);

    return res
      .status(HTTP_STATUS.OK)
      .json({ data: { canDraw, nextAvailableAt, serverTime } });
  }

  async draw(req, res) {
    const userId = req.user.id;
    const { amount, nextAvailableAt } =
      await this.#pointDrawService.draw(userId);

    return res
      .status(HTTP_STATUS.CREATED)
      .json({ data: { amount, nextAvailableAt } });
  }
}
