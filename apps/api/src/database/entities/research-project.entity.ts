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
import { Organization } from './organization.entity';

export enum ResearchProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('research_projects')
export class ResearchProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 255 })
  institution!: string;

  @Column({ name: 'principal_researcher', type: 'varchar', length: 255 })
  principalResearcher!: string;

  @Column({ type: 'varchar', length: 255 })
  supervisor!: string;

  @Column({ name: 'start_at', type: 'timestamp with time zone' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamp with time zone' })
  endAt!: Date;

  @Index()
  @Column({ type: 'enum', enum: ResearchProjectStatus, default: ResearchProjectStatus.DRAFT })
  status!: ResearchProjectStatus;

  @Column({ name: 'ethics_approval_number', type: 'varchar', length: 255, nullable: true })
  ethicsApprovalNumber!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;
}
