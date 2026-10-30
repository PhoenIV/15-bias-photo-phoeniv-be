import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from '#config';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFound } from '#middlewares';

export class App {
  #config;

  constructor(controller, authMiddleware, config) {
    this.#config = config;
    this.app = express();
    this.middleware(authMiddleware);
    this.routes(controller);
    this.errorHandling();
  }

  middleware(authMiddleware) {
    this.app.use(helmet());
    this.app.use(morgan('dev'));
    this.app.use(
      cors({
        origin: corsOrigins,
        credentials: true,
      }),
    );
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use((req, res, next) =>
      authMiddleware.authenticate(req, res, next),
    );
  }

  routes(controller) {
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    this.app.use('/api', controller.routes());
  }

  errorHandling() {
    this.app.use(notFound);
    this.app.use(errorHandler);
  }

  listen(port) {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(port, (error) => {
        if (error) {
          reject(error);
          return;
        }
        console.log(
          `[${this.#config.NODE_ENV}] Server running at http://localhost:${port}`,
        );
        resolve(server);
      });
    });
  }
}
