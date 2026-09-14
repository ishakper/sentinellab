import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@sentinel/shared-types';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Argon2Service } from './argon2.service';
import { TotpService } from './totp.service';
import { RefreshTokenService } from './refresh-token.service';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepository: Repository<Organization>,
    private readonly jwtService: JwtService,
    private readonly argon2Service: Argon2Service,
    private readonly totpService: TotpService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOne(User, { where: { email: dto.email } });
      if (existingUser) {
        throw new BadRequestException('User already exists');
      }

      let organization = null;
      if (dto.organizationName) {
        const slug = dto.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        organization = queryRunner.manager.create(Organization, { name: dto.organizationName, slug });
        await queryRunner.manager.save(organization);
      }

      const hashedPassword = await this.argon2Service.hashPassword(dto.password);
      const user = queryRunner.manager.create(User, {
        email: dto.email,
        passwordHash: hashedPassword,
        firstName: dto.firstName || 'Admin',
        lastName: dto.lastName || 'User',
        organizationId: organization?.id,
        role: UserRole.ADMIN,
      });
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      const payload = { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const { token: refreshToken } = await this.refreshTokenService.createRefreshToken(user.id);

      return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: any) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordHash = user.passwordHash || user.password;
    const isPasswordValid = await this.argon2Service.verifyPassword(passwordHash, dto.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (user.mfaEnabled) {
      if (!dto.mfaCode) throw new UnauthorizedException('MFA code required');
      const isValid = user.mfaSecret ? this.totpService.verifyToken(user.mfaSecret, dto.mfaCode) : false;
      if (!isValid) throw new UnauthorizedException('Invalid MFA code');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const { token: refreshToken } = await this.refreshTokenService.createRefreshToken(user.id);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
  }

  async refreshToken(dto: any) {
    const { token: newRefreshToken, userId } = await this.refreshTokenService.rotateRefreshToken(dto.refreshToken);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const payload = { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshToken: string) {
    await this.refreshTokenService.revokeAllUserTokens(userId);
    return { success: true };
  }

  async setupMfa(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    
    const { secret, otpauthUrl, qrCodeDataUrl } = await this.totpService.generateSecret(user.email);
    user.mfaSecret = secret;
    await this.userRepository.save(user);
    
    return { otpauthUrl, qrCodeDataUrl };
  }

  async verifyAndEnableMfa(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA setup not initiated');

    const isValid = this.totpService.verifyToken(user.mfaSecret, code);
    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    user.mfaEnabled = true;
    await this.userRepository.save(user);
    return { success: true };
  }
  
  async disableMfa(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    user.mfaEnabled = false;
    user.mfaSecret = null;
    await this.userRepository.save(user);
    return { success: true };
  }
}
