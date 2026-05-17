import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "devices" })
export class Devices {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "terminal_id", type: "text" })
  terminal_id: string;

  @Column({ name: "imei", type: "text", nullable: true })
  imei: string | null;

  @Column({ name: "account_id", type: "bigint", nullable: true })
  account_id: string | null;

  @Column({ name: "truck_id", type: "bigint", nullable: true })
  truck_id: string | null;

  @Column({ name: "auth_code", type: "text", nullable: true })
  auth_code: string | null;

  @Column({ name: "firmware_version", type: "text", nullable: true })
  firmware_version: string | null;

  @Column({ name: "model", type: "text", nullable: true })
  model: string | null;

  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true })
  last_seen_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
