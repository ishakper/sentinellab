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
import { AuditAction } from '@sentinel/shared-types';
import { FileRecord } from './file-record.entity';
import { User } from './user.entity';

@Entity('file_operations')
export class FileOperation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Index()
  @Column({ name: 'performed_by', type: 'uuid' })
  performedBy!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => FileRecord, (fileRecord) => fileRecord.operations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  fileRecord!: FileRecord;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performer!: User | null;
}
