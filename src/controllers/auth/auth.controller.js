import { HTTP_STATUS } from '#constants';
import { validate } from '#middlewares';
import { loginSchema, signUpSchema } from './dto/auth.dto.js';
import { BaseController } from '../base.controller.js';

export class AuthController extends BaseController {
  #authService;
  #cookieProvider;

  constructor({ authService, cookieProvider }) {
    super();
    this.#authService = authService;
    this.#cookieProvider = cookieProvider;
  }

  routes() {
    this.router.post('/signup', validate('body', signUpSchema), (req, res) =>
      this.signUp(req, res),
    );
    this.router.post('/login', validate('body', loginSchema), (req, res) =>
      this.login(req, res),
    );
    this.router.post('/logout', (_req, res) => this.logout(_req, res));
    return this.router;
  }

  async signUp(req, res) {
    const { email, password, nickname } = req.body;
    const { user, tokens } = await this.#authService.signUp({
      email,
      password,
      nickname,
    });

    this.#cookieProvider.setAuthCookies(res, tokens);
    res.status(HTTP_STATUS.CREATED).json({ data: { user } });
  }

  async login(req, res) {
    const { email, password } = req.body;
    const { user, tokens } = await this.#authService.logIn({
      email,
      password,
    });

    this.#cookieProvider.setAuthCookies(res, tokens);
    res.status(HTTP_STATUS.OK).json({ data: { user } });
  }

  logout(_req, res) {
    this.#cookieProvider.clearAuthCookies(res);
    res.sendStatus(HTTP_STATUS.NO_CONTENT).end();
  }
}
