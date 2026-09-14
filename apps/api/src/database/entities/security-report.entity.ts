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
import { Organization } from './organization.entity';
import { User } from './user.entity';

export enum SecurityReportType {
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
  TECHNICAL_DETAIL = 'TECHNICAL_DETAIL',
}

@Entity('security_reports')
export class SecurityReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({
    name: 'report_type',
    type: 'enum',
    enum: SecurityReportType,
    default: SecurityReportType.EXECUTIVE_SUMMARY,
  })
  reportType!: SecurityReportType;

  @Index()
  @Column({ name: 'generated_by', type: 'uuid' })
  generatedBy!: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'vulnerability_summary', type: 'jsonb' })
  vulnerabilitySummary!: Record<string, any>;

  @Column({ name: 'overall_risk_score', type: 'numeric', precision: 4, scale: 2 })
  overallRiskScore!: number;

  @Column({ name: 'pdf_file_path', type: 'varchar', length: 500, nullable: true })
  pdfFilePath!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generated_by' })
  generator!: User | null;
}
