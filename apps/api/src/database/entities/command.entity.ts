import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CommandType, CommandStatus } from '@sentinel/shared-types';
import { Organization } from './organization.entity';
import { Device } from './device.entity';
import { User } from './user.entity';
import { CommandResult } from './command-result.entity';

@Entity('commands')
export class Command {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'device_id', type: 'uuid' })
  deviceId!: string;

  @Column({
    type: 'enum',
    enum: CommandType,
  })
  type!: CommandType;

  @Index()
  @Column({
    type: 'enum',
    enum: CommandStatus,
    default: CommandStatus.PENDING,
  })
  status!: CommandStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @Index()
  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy!: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'issued_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Device, (device) => device.commands, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issued_by' })
  issuer!: User;

  @OneToOne(() => CommandResult, (commandResult) => commandResult.command)
  result!: CommandResult;
}
