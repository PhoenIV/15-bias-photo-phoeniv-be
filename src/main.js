import { App } from './app.js';
import { config } from '#config';
import { db } from '#prisma/db.js';
import { setupGracefulShutdown } from './common/lifecycle/graceful-shutdown.js';
import { EXIT_CODE } from './common/constants/exit-code.js';
import { Controller } from '#controllers';

async function bootstrap() {
  const controller = new Controller();
  const app = new App(controller, config);
  const server = await app.listen(config.PORT);

  setupGracefulShutdown(server, db);
}

bootstrap().catch((error) => {
  console.error('애플리케이션 시작 실패:', error);
  process.exitCode = EXIT_CODE.FAILURE;
});
