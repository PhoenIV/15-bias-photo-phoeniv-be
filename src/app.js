import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from '#config';
import { swaggerSpec } from './config/swagger.js';
export class App {
  #config;

  constructor(controller, config) {
    this.#config = config;
    this.app = express();
    this.middleware();
    this.routes(controller);
  }

  middleware() {
    this.app.use(helmet());
    this.app.use(morgan());
    this.app.use(
      cors({
        origin: corsOrigins,
        credentials: true,
      }),
    );
    this.app.use(express.json());
    this.app.use(cookieParser());
  }

  routes(controller) {
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    this.app.use('/api', controller.routes());
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
