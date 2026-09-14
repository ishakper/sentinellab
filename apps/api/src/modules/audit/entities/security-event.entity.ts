import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SecurityEventType, VulnerabilitySeverity } from '@sentinel/shared-types';

/**
 * Security event entity recording anomalous activity, intrusion attempts,
 * policy breaches, and threat triggers across the platform.
 */
@Entity('security_events')
@Index(['organizationId', 'createdAt'])
@Index(['eventType', 'createdAt'])
@Index(['sourceIp', 'createdAt'])
export class SecurityEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    name: 'event_type',
    type: 'enum',
    enum: SecurityEventType,
  })
  eventType!: SecurityEventType;

  @Index()
  @Column({
    type: 'enum',
    enum: VulnerabilitySeverity,
    default: VulnerabilitySeverity.HIGH,
  })
  severity!: VulnerabilitySeverity;

  @Index()
  @Column({ name: 'source_ip', type: 'varchar', length: 45 })
  sourceIp!: string;

  @Column({ name: 'target_resource', type: 'varchar', length: 255, nullable: true })
  targetResource!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy!: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
