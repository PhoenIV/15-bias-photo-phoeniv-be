import { HTTP_STATUS } from '#constants';
import { HealthCheckService } from '#services';
import { BaseController } from './base.controller.js';

export class HealthCheckController extends BaseController {
  constructor() {
    super();
    this.healthCheckService = new HealthCheckService();
  }

  routes() {
    this.router.get('/', (req, res) => {
      const { message, time } = this.healthCheckService.ping();
      res.status(HTTP_STATUS.OK).json({ message, time });
    });
    return this.router;
  }
}
