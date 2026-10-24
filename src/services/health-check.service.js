import { HTTP_STATUS } from '#constants';

export class HealthCheckService {
  ping() {
    const message = 'Hello Phoenix';
    const time = `timestamp: ${new Date().toISOString()}`;
    return { message, time };
  }
}
