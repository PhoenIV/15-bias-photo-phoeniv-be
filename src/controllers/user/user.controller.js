import { HTTP_STATUS } from '#constants';
import { needsLogin } from '#middlewares';
import { BaseController } from '../base.controller.js';

export class UserController extends BaseController {
  #authService;

  constructor({ authService }) {
    super();
    this.#authService = authService;
  }
  routes() {
    this.router.get('/me', needsLogin, (req, res) => this.me(req, res));

    return this.router;
  }

  async me(req, res) {
    const userId = req.user.id;
    const user = await this.#authService.getMe(userId);
    res.set('Cache-Control', 'no-store');
    //이 응답을 저장하지 말라는 지시를 응답 헤더에 실어 보내는 옵션
    //유저의 민감 정보가 저장될 수 있고 다른 유저의 정보를 받아올 수도 있기 때문

    res.status(HTTP_STATUS.OK).json({ data: { user } });
  }
}
