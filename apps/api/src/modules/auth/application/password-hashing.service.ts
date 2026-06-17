import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class PasswordHashingService {
  private dummyHashPromise?: Promise<string>;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async verifyAgainstDummy(password: string): Promise<void> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = bcrypt.hash('no-such-user-placeholder', BCRYPT_ROUNDS);
    }
    await bcrypt.compare(password, await this.dummyHashPromise);
  }
}

