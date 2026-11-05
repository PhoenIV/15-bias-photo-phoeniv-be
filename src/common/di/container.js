import {
  createContainer as createAwilixContainer,
  asClass,
  asValue,
  InjectionMode,
  Lifetime,
} from 'awilix';
import { config } from '#config';
import { db } from '#prisma/db.js';
import {
  PointDrawRepository,
  CardRepository,
  ExchangeOfferRepository,
  SaleRepository,
  UserRepository,
  PointHistoryRepository,
  NotificationRepository,
} from '#repositories';
import {
  AuthService,
  SaleService,
  PointDrawService,
  CardService,
  NotificationService,
} from '#services';
import {
  AuthController,
  PointDrawController,
  Controller,
  SaleController,
  UserController,
  CardController,
  NotificationController,
} from '#controllers';
import {
  PasswordProvider,
  TokenProvider,
  CookieProvider,
  CloudinaryProvider,
} from '#providers';
import { AuthMiddleware } from '#middlewares';

//함수로 한번 감싼 이유는 원하는 시점에서 함수를 실행시키기 위해
export const createContainer = () => {
  const container = createAwilixContainer({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    //1. Provider, 설정값, 데이터 접근
    config: asValue(config),
    db: asValue(db),
    userRepository: asClass(UserRepository, {
      lifetime: Lifetime.SINGLETON,
    }),
    pointDrawRepository: asClass(PointDrawRepository, {
      lifetime: Lifetime.SINGLETON,
    }),
    passwordProvider: asClass(PasswordProvider, {
      lifetime: Lifetime.SINGLETON,
    }),
    tokenProvider: asClass(TokenProvider, {
      lifetime: Lifetime.SINGLETON,
    }),
    cookieProvider: asClass(CookieProvider, {
      lifetime: Lifetime.SINGLETON,
    }),
    cardRepository: asClass(CardRepository, {
      lifetime: Lifetime.SINGLETON,
    }),
    saleRepository: asClass(SaleRepository, {
      lifetime: Lifetime.SINGLETON,
    }),
    exchangeOfferRepository: asClass(ExchangeOfferRepository, {
      lifetime: Lifetime.SINGLETON,
    }),
    cloudinaryProvider: asClass(CloudinaryProvider, {
      lifetime: Lifetime.SINGLETON,
    }),
    pointHistoryRepository: asClass(PointHistoryRepository, {
      lifetime: Lifetime.SINGLETON,
    }),
    notificationRepository: asClass(NotificationRepository, {
      lifetime: Lifetime.SINGLETON,
    }),

    //2. Service
    authService: asClass(AuthService, {
      lifetime: Lifetime.SINGLETON,
    }),
    saleService: asClass(SaleService, {
      lifetime: Lifetime.SINGLETON,
    }),
    pointDrawService: asClass(PointDrawService, {
      lifetime: Lifetime.SINGLETON,
    }),
    cardService: asClass(CardService, {
      lifetime: Lifetime.SINGLETON,
    }),
    notificationService: asClass(NotificationService, {
      lifetime: Lifetime.SINGLETON,
    }),

    //3. Middleware
    authMiddleware: asClass(AuthMiddleware, {
      lifetime: Lifetime.SINGLETON,
    }),

    //4. Controller
    authController: asClass(AuthController, {
      lifetime: Lifetime.SINGLETON,
    }),
    saleController: asClass(SaleController, {
      lifetime: Lifetime.SINGLETON,
    }),
    pointDrawController: asClass(PointDrawController, {
      lifetime: Lifetime.SINGLETON,
    }),
    userController: asClass(UserController, {
      lifetime: Lifetime.SINGLETON,
    }),
    cardController: asClass(CardController, {
      lifetime: Lifetime.SINGLETON,
    }),
    notificationController: asClass(NotificationController, {
      lifetime: Lifetime.SINGLETON,
    }),

    // 5. 최상위 Controller
    controller: asClass(Controller, {
      lifetime: Lifetime.SINGLETON,
    }),
  });
  return container.cradle;
};
