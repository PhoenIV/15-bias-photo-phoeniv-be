export class PointDrawRepository {
  #db;

  constructor({ db }) {
    this.#db = db;
  }

  //동일한 코드 반복을 줄이기 위함
  get #pointDraws() {
    return this.#db.orm.public.PointDraw;
  }

  findLatestByUserId(userId) {
    return this.#pointDraws
      .where({ userId })
      .orderBy((p) => p.createdAt.desc())
      .first();
  }

  //cooldown 은 service에서 넘겨받을 뽑기 가능 시간(1시간)
  grantPoint({ userId, amount, cooldown }) {
    return this.#db.transaction(async (tx) => {
      //1. 사용자 행잠금
      const user = await tx.orm.public.User.where({ id: userId })
        .forNoKeyUpdate() //-> 사용자의 다른 동작을 잠그고 한동작이 완료될 때까지 기다림
        .first();

      //2. 최신 뽑기 조회
      const latestDraw = await tx.orm.public.PointDraw.where({ userId })
        .orderBy((p) => p.createdAt.desc())
        .first();

      //3. 분기: 여기까지 '읽기(조회)'만 하므로 롤백 할 때 그냥 return으로 끝내도됨
      //   쿨다운 값이 크면 거절 결과만 주고 끝, 쿨다운 값이 작으면 분기 통과
      if (latestDraw) {
        const next = new Date(latestDraw.createdAt).getTime() + cooldown;

        //시간 비교는 값으로 바꿔와서 비교하면 쉽다. 시각 데이터를 밀리초로 환산하여 비교
        //숫자를 new Date(next).toISOString() 이렇게 넣으면 시간 양식으로 다시 나옴
        if (next > Date.now()) {
          return {
            canDraw: false,
            nextAvailableAt: new Date(next).toISOString(),
          };
        }
      }

      //4. 쓰기 3가지
      //4-1) 쓰기
      const newDraw = await tx.orm.public.PointDraw.create({
        userId,
        createdAt: new Date().toISOString,
      });
      const newPoint = user.point + amount;
      //뽑기 이후 다음 뽑기 할 수 있는 시간
      const newNext = new Date(newDraw.createdAt).getTime() + cooldown;

      //4-2) 쓰기 유저 포인트 update
      await tx.orm.public.User.where({ id: userId }).update({
        point: newPoint,
      });
      //4-3) 쓰기 PointHistory에 데이터 생성 create
      await tx.orm.public.PointHistory.create({
        userId,
        amount,
        type: 'POINT_DRAW',
        balanceAfter: newPoint,
        pointDrawId: newDraw.id,
      });

      return {
        canDraw: true,
        amount,
        nextAvailableAt: new Date(newNext).toISOString(),
      };
    });
  }
}
