import { App } from './app.js';
import { config } from 'zod/v4/core';
import { setupGracefulShutdown } from './common/lifecycle/graceful-shutdown.js';
import { EXIT_CODE } from './common/constants/exit-code.js';

async function bootstrap(db) {
  const app = new App(config);
  const server = await app.listen(config.PORT);

  setupGracefulShutdown(server, db);
}

bootstrap().catch((error) => {
  console.error('애플리케이션 시작 실패:', error);
  process.exitCode = EXIT_CODE.FAILURE;
});
