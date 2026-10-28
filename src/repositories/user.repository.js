export class UserRepository {
  #db;
  #fields = ['id', 'nickname', 'email', 'createdAt', 'point'];
  //리턴 값이 중복되는 것을 여기서 한번만 설정하도록 정의

  constructor({ db }) {
    this.#db = db;
  }

  //동일한 코드 반복을 줄이기 위함
  get #users() {
    return this.#db.orm.public.User;
  }

  create(data) {
    return this.#users.select(...this.#fields).create(data);
  }

  findByEmail(email, { includePassword = false } = {}) {
    const fields = includePassword
      ? [...this.#fields, 'password']
      : this.#fields;
    //{includePassword=false} 옵션을 두는 이유
    //findByEmail을 사용할 때 패스워드를 비교해야 될 경우 구조분해로 꺼낼 수 있도록 옵션으로 설정
    //하지만 자동으로 패스워드가 조회되지 않도록 기본값은 false로 지정,
    //두번째 옵션을 깜빡하고 안 쓸 경우 undefined가 넘어가지 않도록 빈값 처리(에러방지)

    return this.#users
      .where({ email })
      .select(...fields)
      .first();
  }

  findById(id) {
    return this.#users
      .where({ id })
      .select(...this.#fields)
      .first();
  }

  findAll() {
    return this.#users.select(...this.#fields).all();
  }

  update(id, data) {
    return this.#users
      .where({ id })
      .select(...this.#fields)
      .update(data);
  }

  delete(id) {
    return this.#users.where({ id }).delete();
  }
}
