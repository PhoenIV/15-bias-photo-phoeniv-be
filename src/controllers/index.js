import { BaseController } from './base.controller.js';
import { HealthCheckController } from './health-check.controller.js';
import { SaleController } from './sale.controller.js';

export * from './base.controller.js';
export class Controller extends BaseController {
  #saleController;
  constructor() {
    super();
    this.healthCheckController = new HealthCheckController();
    this.#saleController = new SaleController();
  }

  routes() {
    this.router.use('/health-check', this.healthCheckController.routes());
    this.router.use('/sales', this.#saleController.routes());
    return this.router;
  }
}
