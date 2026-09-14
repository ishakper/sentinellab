import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CommandStatus } from '@sentinel/shared-types';
import { Command } from './command.entity';
import { Device } from './device.entity';

@Entity('command_results')
export class CommandResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'command_id', type: 'uuid', unique: true })
  commandId!: string;

  @Index()
  @Column({ name: 'device_id', type: 'uuid' })
  deviceId!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: CommandStatus,
  })
  status!: CommandStatus;

  @Column({ type: 'jsonb' })
  result!: Record<string, any>;

  @Column({ name: 'execution_time_ms', type: 'integer' })
  executionTimeMs!: number;

  @Column({ name: 'received_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToOne(() => Command, (command) => command.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'command_id' })
  command!: Command;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device;
}
