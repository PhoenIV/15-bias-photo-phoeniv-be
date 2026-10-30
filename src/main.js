import { App } from './app.js';
import { config } from '#config';
import { setupGracefulShutdown } from './common/lifecycle/graceful-shutdown.js';
import { EXIT_CODE } from './common/constants/exit-code.js';
import { createContainer } from './common/di/container.js';

async function bootstrap() {
  //의존성으로 주입할 객체를 담고 있는 컨테이너에서 필요한 걸 꺼낸다.
  const { controller, authMiddleware, db } = createContainer();
  const app = new App(controller, authMiddleware, config);
  const server = await app.listen(config.PORT);

  setupGracefulShutdown(server, db);
}

bootstrap().catch((error) => {
  console.error('애플리케이션 시작 실패:', error);
  process.exitCode = EXIT_CODE.FAILURE;
});
