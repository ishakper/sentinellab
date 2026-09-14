import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SupportSessionStatus } from '@sentinel/shared-types';
import { Organization } from './organization.entity';
import { Device } from './device.entity';
import { User } from './user.entity';

@Entity('support_sessions')
export class SupportSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'device_id', type: 'uuid' })
  deviceId!: string;

  @Index()
  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: SupportSessionStatus,
    default: SupportSessionStatus.REQUESTED,
  })
  status!: SupportSessionStatus;

  @Column({ name: 'consent_granted_at', type: 'timestamp with time zone', nullable: true })
  consentGrantedAt!: Date | null;

  @Column({ name: 'visual_watermark_active', type: 'boolean', default: true })
  visualWatermarkActive!: boolean;

  @Column({ name: 'started_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamp with time zone', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, (organization) => organization.supportSessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: User;
}
