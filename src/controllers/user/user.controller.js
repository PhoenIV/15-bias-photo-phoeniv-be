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
    res.status(HTTP_STATUS.OK).json({ data: { user } });
  }
}
