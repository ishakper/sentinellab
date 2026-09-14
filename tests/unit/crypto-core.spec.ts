import { ChallengeResponseService, SignatureVerifier, TokenGenerator, HashUtils } from '@sentinel/crypto-core';
import { generateKeyPairSync, createSign } from 'crypto';

describe('Crypto Core Unit Tests', () => {
  describe('Challenge Response Hash Verification', () => {
    it('should successfully generate and verify a valid challenge response', () => {
      const challenge = ChallengeResponseService.generateChallenge(32);
      expect(challenge).toBeDefined();
      expect(challenge.length).toBe(64); // 32 bytes hex = 64 chars

      const expectedHash = ChallengeResponseService.hashChallenge(challenge);
      const isValid = ChallengeResponseService.verifyChallenge(challenge, expectedHash);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid challenge response', () => {
      const challenge = ChallengeResponseService.generateChallenge(32);
      const wrongHash = ChallengeResponseService.hashChallenge('wrong-challenge-string');

      const isValid = ChallengeResponseService.verifyChallenge(challenge, wrongHash);
      expect(isValid).toBe(false);
    });
  });

  describe('ECDSA Signature Verification', () => {
    it('should verify a valid ECDSA signature using DER format', () => {
      const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const payload = {
        deviceId: 'DEV-12345',
        timestamp: new Date().toISOString(),
        body: JSON.stringify({ action: 'PING' }),
      };

      const message = SignatureVerifier.buildSignatureMessage(payload);
      const signer = createSign('SHA256');
      signer.update(message);
      signer.end();
      const signatureBase64 = signer.sign(privateKey).toString('base64');

      const publicKeyBase64 = publicKey.toString('base64');
      const isValid = SignatureVerifier.verifyECDSA(publicKeyBase64, signatureBase64, payload);
      expect(isValid).toBe(true);
    });

    it('should reject a tampered signature payload', () => {
      const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const payload = {
        deviceId: 'DEV-12345',
        timestamp: new Date().toISOString(),
        body: JSON.stringify({ action: 'PING' }),
      };

      const message = SignatureVerifier.buildSignatureMessage(payload);
      const signer = createSign('SHA256');
      signer.update(message);
      signer.end();
      const signatureBase64 = signer.sign(privateKey).toString('base64');

      const tamperedPayload = {
        ...payload,
        deviceId: 'ATTACKER-DEV',
      };

      const publicKeyBase64 = publicKey.toString('base64');
      const isValid = SignatureVerifier.verifyECDSA(publicKeyBase64, signatureBase64, tamperedPayload);
      expect(isValid).toBe(false);
    });

    it('should validate timestamp within max drift window', () => {
      const validTimestamp = new Date().toISOString();
      expect(SignatureVerifier.isTimestampValid(validTimestamp, 300000)).toBe(true);

      const expiredTimestamp = new Date(Date.now() - 600000).toISOString(); // 10 mins ago
      expect(SignatureVerifier.isTimestampValid(expiredTimestamp, 300000)).toBe(false);
    });
  });

  describe('Token Generator', () => {
    it('should generate a secure hex token of specified length', () => {
      const lengthBytes = 32;
      const token = TokenGenerator.generateSecureRandom(lengthBytes);
      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });

    it('should generate unique non-repeating tokens', () => {
      const token1 = TokenGenerator.generatePairingToken(16);
      const token2 = TokenGenerator.generatePairingToken(16);
      expect(token1).not.toBe(token2);
    });

    it('should generate deterministic SHA-256 token hashes', () => {
      const token = 'test-token-12345';
      const hash1 = TokenGenerator.hashToken(token);
      const hash2 = TokenGenerator.hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  describe('HashUtils Constant-Time Compare', () => {
    it('should return true for identical strings', () => {
      const a = 'super-secret-token-12345';
      const b = 'super-secret-token-12345';
      expect(HashUtils.constantTimeCompare(a, b)).toBe(true);
    });

    it('should return false for different strings of equal length', () => {
      const a = 'super-secret-token-12345';
      const b = 'super-secret-token-54321';
      expect(HashUtils.constantTimeCompare(a, b)).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      const a = 'short-secret';
      const b = 'long-secret-with-more-chars';
      expect(HashUtils.constantTimeCompare(a, b)).toBe(false);
    });
  });
});
