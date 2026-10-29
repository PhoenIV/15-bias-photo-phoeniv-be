import { BaseController } from './base.controller.js';
import { HealthCheckController } from './health-check.controller.js';

export * from './auth/auth.controller.js';

export class Controller extends BaseController {
  #authController;

  constructor({ authController }) {
    super();
    this.healthCheckController = new HealthCheckController();
    this.#authController = authController;
  }

  routes() {
    this.router.use('/health-check', this.healthCheckController.routes());
    this.router.use('/auth', this.#authController.routes());
    return this.router;
  }
}
