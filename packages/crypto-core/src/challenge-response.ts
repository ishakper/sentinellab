import { randomBytes, createHash } from 'crypto';

export class ChallengeResponseService {
  static generateChallenge(lengthBytes: number = 32): string {
    return randomBytes(lengthBytes).toString('hex');
  }

  static hashChallenge(challenge: string): string {
    return createHash('sha256').update(challenge).digest('hex');
  }

  static verifyChallenge(challenge: string, expectedHash: string): boolean {
    const computedHash = ChallengeResponseService.hashChallenge(challenge);
    if (computedHash.length !== expectedHash.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return result === 0;
  }
}
