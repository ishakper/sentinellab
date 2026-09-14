import { randomBytes, createHash } from 'crypto';

export class TokenGenerator {
  static generatePairingToken(lengthBytes: number = 32): string {
    return randomBytes(lengthBytes).toString('hex');
  }

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  static generateSecureRandom(lengthBytes: number = 32): string {
    return randomBytes(lengthBytes).toString('hex');
  }
}
