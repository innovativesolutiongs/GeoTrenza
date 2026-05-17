import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import type { Severity } from "./alertRule";

export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "SNOOZED" | "MUTED";

@Entity({ name: "alerts" })
export class Alert {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "account_id", type: "bigint" })
  account_id: string;

  @Column({ name: "rule_id", type: "bigint" })
  rule_id: string;

  @Column({ name: "vehicle_id", type: "bigint", nullable: true })
  vehicle_id: string | null;

  @Column({ name: "device_id", type: "bigint", nullable: true })
  device_id: string | null;

  @Column({ name: "triggered_at", type: "timestamptz" })
  triggered_at: Date;

  // Severity copied from rule at fire time — historical record stays stable
  // even if the rule's severity is later edited.
  @Column({ name: "severity", type: "varchar", length: 16 })
  severity: Severity;

  @Column({ name: "title", type: "varchar", length: 255 })
  title: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "payload", type: "jsonb", nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: "status", type: "varchar", length: 16 })
  status: AlertStatus;

  @Column({ name: "acknowledged_at", type: "timestamptz", nullable: true })
  acknowledged_at: Date | null;

  @Column({ name: "acknowledged_by_user_id", type: "bigint", nullable: true })
  acknowledged_by_user_id: string | null;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolved_at: Date | null;

  @Column({ name: "snoozed_until", type: "timestamptz", nullable: true })
  snoozed_until: Date | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
