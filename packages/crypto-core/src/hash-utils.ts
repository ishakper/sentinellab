import { createHash, timingSafeEqual } from 'crypto';

export class HashUtils {
  static sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  static sha512(data: string): string {
    return createHash('sha512').update(data).digest('hex');
  }

  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
