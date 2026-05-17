import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type RuleType =
  | "GEOFENCE_ENTRY"
  | "GEOFENCE_EXIT"
  | "DEVICE_OFFLINE"
  | "EXTENDED_IDLE"
  | "SPEED_VIOLATION"
  | "UNAUTHORIZED_MOVEMENT"
  | "STUB_TEST";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RuleScope = "FLEET" | "VEHICLE" | "GROUP";

@Entity({ name: "alert_rules" })
export class AlertRule {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "account_id", type: "bigint" })
  account_id: string;

  @Column({ name: "name", type: "varchar", length: 160 })
  name: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "rule_type", type: "varchar", length: 40 })
  rule_type: RuleType;

  @Column({ name: "config", type: "jsonb" })
  config: Record<string, unknown>;

  @Column({ name: "severity", type: "varchar", length: 16 })
  severity: Severity;

  @Column({ name: "enabled", type: "boolean" })
  enabled: boolean;

  @Column({ name: "scope", type: "varchar", length: 16 })
  scope: RuleScope;

  @Column({ name: "target_vehicle_ids", type: "bigint", array: true, nullable: true })
  target_vehicle_ids: string[] | null;

  @Column({ name: "target_geofence_ids", type: "bigint", array: true, nullable: true })
  target_geofence_ids: string[] | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
