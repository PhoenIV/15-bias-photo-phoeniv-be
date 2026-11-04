import { HTTP_STATUS } from '#constants';
import { needsLogin, validate } from '#middlewares';
import { BaseController } from '../base.controller.js';
import { notificationQuerySchema } from './dto/notification.dto.js';

export class NotificationController extends BaseController {
  #notificationService;

  constructor({ notificationService }) {
    super();
    this.#notificationService = notificationService;
  }

  routes() {
    // 알림 목록 조회
    this.router.get(
      '/',
      needsLogin,
      validate('query', notificationQuerySchema),
      (req, res) => this.getNotifications(req, res),
    );

    // 알림 전체 읽음
    this.router.post('/readAll', needsLogin, (req, res) =>
      this.readAll(req, res),
    );

    // 실시간 알림 연결 (SSE)
    this.router.get('/stream', needsLogin, (req, res) => this.stream(req, res));

    return this.router;
  }

  async getNotifications(req, res) {
    const userId = req.user.id;
    const query = req.query;

    const result = await this.#notificationService.getNotifications(
      userId,
      query,
    );

    res.set('Cache-Control', 'no-store');
    return res.status(HTTP_STATUS.OK).json(result);
  }

  async readAll(req, res) {
    const userId = req.user.id;

    await this.#notificationService.readAll(userId);

    return res.sendStatus(HTTP_STATUS.NO_CONTENT);
  }

  stream(req, res) {
    const userId = req.user.id;

    res.status(HTTP_STATUS.OK);
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const cleanup = this.#notificationService.subscribeStream(
      userId,
      res,
      req.cookies,
    );

    res.on('close', cleanup);
  }
}
