import { DRAW_COOLDOWN_MS, ERROR_CODE, ERROR_MESSAGE } from '#constants';
import { TooManyRequestsException } from '#exceptions';

export class PointDrawService {
  #pointDrawRepository;
  #drawAmount() {
    const rate = Math.random() * 100;

    if (rate < 51) return 100;
    if (rate < 82) return 500;
    return 1000;
  }

  constructor({ pointDrawRepository }) {
    this.#pointDrawRepository = pointDrawRepository;
  }

  //POST: 랜덤 포인트 뽑기 (pointDraw 행 생성)
  async draw(userId) {
    //포인트 뽑기
    const randomPoint = this.#drawAmount();

    //pointDrawRepository 호출, grantPoint()인자로 받는 값이 무엇인지 보고 쓰기
    const pointDrawData = await this.#pointDrawRepository.grantPoint({
      userId,
      amount: randomPoint,
      cooldown: DRAW_COOLDOWN_MS,
    });

    //쿨다운이 아직 남아 있는 경우 (반환값중 canDraw: false인 경우)
    if (!pointDrawData.canDraw) {
      throw new TooManyRequestsException(
        ERROR_MESSAGE.POINT_COOLDOWN_NOT_ENOUGH,
        {
          code: ERROR_CODE.BOX_COOLDOWN,
          fieldErrors: {},
        },
      );
    }
    const { amount, nextAvailableAt } = pointDrawData;

    return { amount, nextAvailableAt };
  }

  //GET: 뽑기 시간이 됐는지 여부 조회
  async getDrawStatus(userId) {
    const nowTime = Date.now();
    const serverTime = new Date(nowTime).toISOString();

    const drawStatus =
      await this.#pointDrawRepository.findLatestByUserId(userId);

    //특정 유저가 뽑기를 한 이력이 없을 경우: 뽑기에 필요한 값을 직접 넣어주고 반환
    if (!drawStatus) {
      return { canDraw: true, nextAvailableAt: null, serverTime };
    }
    //뽑기 이력이 있는 경우: 다음 뽑기 시각을 구한다.
    const next = new Date(drawStatus.createdAt).getTime() + DRAW_COOLDOWN_MS;

    return {
      canDraw: next <= nowTime, //-> 비교식을 넣어서 true,false를 바로 반환
      nextAvailableAt: new Date(next).toISOString(),
      serverTime,
    };
  }
}
