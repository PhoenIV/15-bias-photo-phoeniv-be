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
      const { message, timestamp } = this.healthCheckService.ping();
      res.status(HTTP_STATUS.OK).json({ message, timestamp });
    });
    return this.router;
  }
}
