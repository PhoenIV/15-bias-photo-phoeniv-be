import bcrypt from 'bcrypt';

export class PasswordProvider {
  #saltRounds;
  #dummyHash;

  constructor() {
    this.#saltRounds = 10;
    this.#dummyHash = bcrypt.hashSync('dummy-password', this.#saltRounds);
  }

  hash(password) {
    return bcrypt.hash(password, this.#saltRounds);
  }

  async compare(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  //일부러 존재하지 않는 유저의 더미 패스워드를 해시하도록하여
  //시간이 걸리도록 하는 용도 (보안 용도)
  //#dummyHash는 서버가 실행될 때 한번만 만들어집니다.
  async compareDummy(password) {
    return await bcrypt.compare(password, this.#dummyHash);
  }
}
