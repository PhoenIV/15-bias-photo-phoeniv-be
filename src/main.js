import { App } from './app.js';
import { config } from '#config';
import { setupGracefulShutdown } from './common/lifecycle/graceful-shutdown.js';
import { EXIT_CODE } from './common/constants/exit-code.js';
import { Controller } from '#controllers';


// 데이터베이스가 준비되면 bootstrap의 인자로 db를 전달하고 주석처리한 setupGracefulShutdown 함수를 복구합니다.
async function bootstrap() {
  const controller = new Controller();
  const app = new App(controller, config);
  const server = await app.listen(config.PORT);

//   setupGracefulShutdown(server, db);
}

bootstrap().catch((error) => {
  console.error('애플리케이션 시작 실패:', error);
  process.exitCode = EXIT_CODE.FAILURE;
});
