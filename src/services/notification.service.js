import {
  setInterval,
  setTimeout,
  clearInterval,
  clearTimeout,
} from 'node:timers';
import { DAY_IN_MS, SECOND_IN_MS } from '#constants';

const NOTIFICATION_RETENTION_DAYS = 7;
const SSE_HEARTBEAT_INTERVAL_MS = 25 * SECOND_IN_MS;
const MAX_TIMEOUT_MS = 2_147_483_647;

export class NotificationService {
  #notificationRepository;
  #tokenProvider;
  #clients = new Map(); // userId -> Set<{ res, cleanup }>

  constructor({ notificationRepository, tokenProvider }) {
    this.#notificationRepository = notificationRepository;
    this.#tokenProvider = tokenProvider;
  }

  // 알림 목록 조회 (최근 7일 및 미확인 알림)
  async getNotifications(userId, query = {}) {
    const { page = 1, limit = 12, unreadOnly = false } = query;

    const nowMs = Date.now();
    const serverTime = new Date(nowMs).toISOString();
    const since = new Date(
      nowMs - NOTIFICATION_RETENTION_DAYS * DAY_IN_MS,
    ).toISOString();

    // 목록, 필터된 전체 개수, 전체 안 읽은 알림 수를 병렬 조회
    const [notifications, countResult, unreadCountResult] = await Promise.all([
      this.#notificationRepository.findPageByUser({
        userId,
        since,
        unreadOnly,
        page,
        limit,
      }),
      this.#notificationRepository.countByUser({
        userId,
        since,
        unreadOnly,
      }),
      unreadOnly
        ? Promise.resolve(null)
        : this.#notificationRepository.countByUser({
            userId,
            since,
            unreadOnly: true,
          }),
    ]);

    const { totalCount } = countResult;
    const unreadCount = unreadOnly ? totalCount : unreadCountResult.totalCount;

    const data = notifications.map((item) => ({
      id: item.id,
      message: item.message,
      saleId:
        item.saleId ??
        item.purchase?.saleId ??
        item.exchangeOffer?.saleId ??
        null,
      createdAt: item.createdAt,
      readAt: item.readAt,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
      },
      unreadCount,
      serverTime,
    };
  }

  // 알림 전체 읽음 처리 (기간 제한 없음)
  async readAll(userId) {
    const updatedCount =
      await this.#notificationRepository.markAllReadByUser(userId);

    if (updatedCount > 0) {
      this.emitChanged(userId);
    }
  }

  // 실시간 알림 SSE 연결 등록
  subscribeStream(userId, res, cookies = {}) {
    const expiresAtMs = this.#getSessionExpiresAtMs(cookies);
    let isClosed = false;
    let expiryTimer = null;

    const expireSession = () => {
      if (isClosed) return;
      this.#sendSseEvent(res, 'session-expired', {});
      cleanup();
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    };

    const heartbeatTimer = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        cleanup();
        return;
      }

      if (expiresAtMs !== null && Date.now() >= expiresAtMs) {
        expireSession();
        return;
      }

      res.write(': keep-alive\n\n');
    }, SSE_HEARTBEAT_INTERVAL_MS);

    if (expiresAtMs !== null) {
      const remainingMs = Math.max(0, expiresAtMs - Date.now());
      if (remainingMs <= MAX_TIMEOUT_MS) {
        expiryTimer = setTimeout(expireSession, remainingMs);
      }
    }

    const clientEntry = {
      res,
      expireSession,
    };

    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;

      clearInterval(heartbeatTimer);
      if (expiryTimer) {
        clearTimeout(expiryTimer);
      }

      const userClients = this.#clients.get(userId);
      if (userClients) {
        userClients.delete(clientEntry);
        if (userClients.size === 0) {
          this.#clients.delete(userId);
        }
      }
    };

    let userClients = this.#clients.get(userId);
    if (!userClients) {
      userClients = new Set();
      this.#clients.set(userId, userClients);
    }
    userClients.add(clientEntry);

    // 연결 즉시 ready 이벤트 전송
    this.#sendSseEvent(res, 'ready', {});

    return cleanup;
  }

  // 특정 사용자의 알림 상태 변경 시 SSE changed 이벤트 전송
  emitChanged(userId) {
    const userClients = this.#clients.get(userId);
    if (!userClients) return;

    for (const client of userClients) {
      this.#sendSseEvent(client.res, 'changed', {});
    }
  }

  // 특정 사용자의 세션 만료 시 SSE session-expired 이벤트 전송 후 연결 종료
  emitSessionExpired(userId) {
    const userClients = this.#clients.get(userId);
    if (!userClients) return;

    for (const client of [...userClients]) {
      client.expireSession();
    }
  }

  #sendSseEvent(res, eventName, data = {}) {
    if (res.writableEnded || res.destroyed) return;
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  #getSessionExpiresAtMs(cookies = {}) {
    const { accessToken, refreshToken } = cookies;

    const refreshPayload = refreshToken
      ? this.#tokenProvider.verifyRefreshToken(refreshToken)
      : null;
    if (refreshPayload?.exp) {
      return refreshPayload.exp * SECOND_IN_MS;
    }

    const accessPayload = accessToken
      ? this.#tokenProvider.verifyAccessToken(accessToken)
      : null;
    if (accessPayload?.exp) {
      return accessPayload.exp * SECOND_IN_MS;
    }

    return null;
  }
}
