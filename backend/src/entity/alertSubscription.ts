import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import type { Severity } from "./alertRule";

export type AlertChannel = "IN_APP" | "WHATSAPP" | "EMAIL" | "SMS";

@Entity({ name: "alert_subscriptions" })
export class AlertSubscription {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "user_id", type: "bigint" })
  user_id: string;

  // null rule_id => subscription applies to all rules in user's account.
  @Column({ name: "rule_id", type: "bigint", nullable: true })
  rule_id: string | null;

  @Column({ name: "channels", type: "varchar", length: 16, array: true })
  channels: AlertChannel[];

  @Column({ name: "min_severity", type: "varchar", length: 16 })
  min_severity: Severity;

  @Column({ name: "snooze_until", type: "timestamptz", nullable: true })
  snooze_until: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
