import { BaseController } from './base.controller.js';
import { HealthCheckController } from './health-check.controller.js';

//1. container.js에서 import하기 위해 export - 아래로 추가
export * from './auth/auth.controller.js';
export * from './base.controller.js';
export * from './sale/sale.controller.js';
export * from './pointDraw/pointDraw.controller.js';
export * from './card/card.controller.js';

export class Controller extends BaseController {
  #authController; //2. private 필드 - 아래로 추가
  #pointDrawController;
  #saleController;
  #cardController;

  //3. constructor 인자에 구조분해로 다른 controller 추가
  constructor({
    authController,
    pointDrawController,
    saleController,
    cardController,
  }) {
    super();
    this.healthCheckController = new HealthCheckController();
    this.#authController = authController; //4. this로 필드 저장 - 아래로 추가
    this.#pointDrawController = pointDrawController;
    this.#saleController = saleController;
    this.#cardController = cardController;
  }

  //5. 엔트포인트와 라우트 추가
  routes() {
    this.router.use('/health-check', this.healthCheckController.routes());
    this.router.use('/auth', this.#authController.routes());
    this.router.use('/sales', this.#saleController.routes());
    this.router.use('/pointDraws', this.#pointDrawController.routes());
    this.router.use('/cards', this.#cardController.routes());
    return this.router;
  }
}
