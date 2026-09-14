import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { RefreshToken } from '../../database/entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createRefreshToken(userId: string, family?: string): Promise<{ token: string; family: string }> {
    const token = randomBytes(32).toString('hex');
    const tokenFamily = family || randomBytes(16).toString('hex');
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshToken = this.refreshTokenRepository.create({
      tokenHash: hashedToken,
      userId,
      family: tokenFamily,
      expiresAt,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return { token, family: tokenFamily };
  }

  async rotateRefreshToken(oldToken: string): Promise<{ token: string; family: string; userId: string }> {
    const hashedOldToken = this.hashToken(oldToken);
    const existingToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hashedOldToken },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.isRevoked) {
      await this.revokeTokenFamily(existingToken.family);
      throw new UnauthorizedException('Token reuse detected, family revoked');
    }

    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    existingToken.isRevoked = true;
    await this.refreshTokenRepository.save(existingToken);

    const newTokens = await this.createRefreshToken(existingToken.userId, existingToken.family);
    return { ...newTokens, userId: existingToken.userId };
  }

  async revokeTokenFamily(family: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { family },
      { isRevoked: true },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId },
      { isRevoked: true },
    );
  }
}
