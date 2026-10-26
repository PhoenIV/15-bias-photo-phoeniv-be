import { EXIT_CODE } from '#constants';

export const setupGracefulShutdown = (server, db) => {
  const shutdown = async (signal) => {
    console.log(`\n${signal} 신호를 받았습니다. 서버를 종료합니다...`);

    try {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      console.log('서버가 종료되었습니다.');

      await db.close();
      console.log('데이터베이스 연결이 종료되었습니다.');

      process.exit(EXIT_CODE.SUCCESS);
    } catch (error) {
      console.error('서버 또는 데이터베이스 종료 중 에러:', error);

      process.exit(EXIT_CODE.FAILURE);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};
