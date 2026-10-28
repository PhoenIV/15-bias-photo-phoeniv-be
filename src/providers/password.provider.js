import bcrypt from 'bcrypt';

export class PasswordProvider {
  #saltRounds;

  constructor() {
    this.#saltRounds = 10;
  }

  hash(password) {
    return bcrypt.hash(password, this.#saltRounds);
  }

  async compare(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
}
