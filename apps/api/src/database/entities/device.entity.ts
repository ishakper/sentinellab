import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { DeviceStatus } from '@sentinel/shared-types';
import { Organization } from './organization.entity';
import { DeviceKey } from './device-key.entity';
import { DeviceSession } from './device-session.entity';
import { Command } from './command.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'device_name', type: 'varchar', length: 255 })
  deviceName!: string;

  @Column({ name: 'android_version', type: 'varchar', length: 50 })
  androidVersion!: string;

  @Column({ name: 'security_patch_level', type: 'varchar', length: 50 })
  securityPatchLevel!: string;

  @Column({ type: 'varchar', length: 100 })
  manufacturer!: string;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100 })
  serialNumber!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.PAIRING,
  })
  status!: DeviceStatus;

  @Column({ name: 'is_rooted', type: 'boolean', default: false })
  isRooted!: boolean;

  @Column({ name: 'is_encrypted', type: 'boolean', default: false })
  isEncrypted!: boolean;

  @Column({ name: 'adb_enabled', type: 'boolean', default: false })
  adbEnabled!: boolean;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'last_seen_at', type: 'timestamp with time zone', nullable: true })
  lastSeenAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, (organization) => organization.devices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @OneToMany(() => DeviceKey, (deviceKey) => deviceKey.device)
  keys!: DeviceKey[];

  @OneToMany(() => DeviceSession, (deviceSession) => deviceSession.device)
  sessions!: DeviceSession[];

  @OneToMany(() => Command, (command) => command.device)
  commands!: Command[];
}
