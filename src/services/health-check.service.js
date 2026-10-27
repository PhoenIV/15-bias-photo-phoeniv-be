export class HealthCheckService {
  ping() {
    const message = 'Hello Phoenix';
    const timestamp = `${new Date().toISOString()}`;
    return { message, timestamp };
  }
}
