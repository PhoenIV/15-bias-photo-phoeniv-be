import { BaseController } from './base.controller.js';
import { HealthCheckController } from './health-check.controller.js';

export class Controller extends BaseController {
  constructor() {
    super();
    this.healthCheckController = new HealthCheckController();
  }

  routes() {
    this.router.use('/health-check', this.healthCheckController.routes());
    return this.router;
  }
}
