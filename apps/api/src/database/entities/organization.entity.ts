import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Device } from './device.entity';
import { Vulnerability } from './vulnerability.entity';
import { SupportSession } from './support-session.entity';
import { AuditLog } from './audit-log.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'max_devices', type: 'integer', default: 50 })
  maxDevices!: number;

  @Column({ name: 'max_users', type: 'integer', default: 10 })
  maxUsers!: number;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  settings?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => Device, (device) => device.organization)
  devices!: Device[];

  @OneToMany(() => Vulnerability, (vulnerability) => vulnerability.organization)
  vulnerabilities!: Vulnerability[];

  @OneToMany(() => SupportSession, (supportSession) => supportSession.organization)
  supportSessions!: SupportSession[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.organization)
  auditLogs!: AuditLog[];
}
