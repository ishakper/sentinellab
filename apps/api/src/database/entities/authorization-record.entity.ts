import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResearchProject } from './research-project.entity';

export enum AuthorizationRecordStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Entity('authorization_records')
export class AuthorizationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'research_project_id', type: 'uuid' })
  researchProjectId!: string;

  @Column({ name: 'asset_owner', type: 'varchar', length: 255 })
  assetOwner!: string;

  @Column({ name: 'authorized_by', type: 'varchar', length: 255 })
  authorizedBy!: string;

  @Column({ name: 'document_path', type: 'varchar', length: 500 })
  documentPath!: string;

  @Index()
  @Column({ name: 'document_hash', type: 'varchar', length: 64 })
  documentHash!: string;

  @Column({ name: 'valid_from', type: 'timestamp with time zone' })
  validFrom!: Date;

  @Column({ name: 'valid_until', type: 'timestamp with time zone' })
  validUntil!: Date;

  @Column({ name: 'approved_targets', type: 'jsonb' })
  approvedTargets!: string[];

  @Column({ name: 'prohibited_actions', type: 'jsonb' })
  prohibitedActions!: string[];

  @Index()
  @Column({ type: 'enum', enum: AuthorizationRecordStatus, default: AuthorizationRecordStatus.PENDING })
  status!: AuthorizationRecordStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => ResearchProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'research_project_id' })
  researchProject!: ResearchProject;
}
