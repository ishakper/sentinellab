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
import { SecurityEventType, VulnerabilitySeverity } from '@sentinel/shared-types';
import { Organization } from './organization.entity';

@Entity('security_events')
export class SecurityEvent {
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
  })
  severity!: VulnerabilitySeverity;

  @Column({ name: 'source_ip', type: 'varchar', length: 45 })
  sourceIp!: string;

  @Column({ name: 'target_resource', type: 'varchar', length: 255, nullable: true })
  targetResource!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;
}
