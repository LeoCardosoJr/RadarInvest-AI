import { compare, hash } from "bcryptjs";

import type { PasswordHasher } from "../../auth/password-hasher";
import { MAX_PASSWORD_BYTES } from "../../modules/auth/password-policy";

const MIN_COST = 10;
const MAX_COST = 16;

const DUMMY_PASSWORD = "radarinvest-dummy-password-comparison";

export class BcryptjsPasswordHasher implements PasswordHasher {
  private readonly cost: number;
  private dummyHashPromise?: Promise<string>;

  constructor(cost: number) {
    if (!Number.isInteger(cost) || cost < MIN_COST || cost > MAX_COST) {
      throw new Error(`Password hash cost must be an integer between ${MIN_COST} and ${MAX_COST}.`);
    }

    this.cost = cost;
  }

  async hash(password: string): Promise<string> {
    this.assertWithinBcryptLimit(password);

    return hash(password, this.cost);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      return false;
    }

    return compare(password, passwordHash);
  }

  /**
   * Calculado uma vez por processo com o mesmo custo do hash real, para que o
   * login com e-mail inexistente execute uma comparação equivalente.
   */
  async dummyHash(): Promise<string> {
    this.dummyHashPromise ??= hash(DUMMY_PASSWORD, this.cost);

    return this.dummyHashPromise;
  }

  private assertWithinBcryptLimit(password: string): void {
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      throw new Error(`Password must have at most ${MAX_PASSWORD_BYTES} bytes.`);
    }
  }
}
