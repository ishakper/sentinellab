import { createVerify, createPublicKey, KeyObject } from 'crypto';

export interface SignaturePayload {
  deviceId: string;
  timestamp: string;
  body?: string;
}

export class SignatureVerifier {
  static buildSignatureMessage(payload: SignaturePayload): string {
    const parts = [payload.deviceId, payload.timestamp];
    if (payload.body) {
      parts.push(payload.body);
    }
    return parts.join(':');
  }

  static verifyECDSA(
    publicKeyPem: string,
    signature: string,
    payload: SignaturePayload,
  ): boolean {
    try {
      const message = SignatureVerifier.buildSignatureMessage(payload);
      const publicKey: KeyObject = createPublicKey({
        key: Buffer.from(publicKeyPem, 'base64'),
        format: 'der',
        type: 'spki',
      });
      const verifier = createVerify('SHA256');
      verifier.update(message);
      verifier.end();
      return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }

  static isTimestampValid(timestamp: string, maxDriftMs: number = 300000): boolean {
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.abs(now - requestTime) <= maxDriftMs;
  }
}
