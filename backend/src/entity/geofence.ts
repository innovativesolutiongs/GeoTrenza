import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "geofences" })
export class Geofence {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "account_id", type: "bigint" })
  account_id: string;

  @Column({ name: "name", type: "text" })
  name: string;

  @Column({ name: "geometry", type: "geometry" })
  geometry: unknown;

  @Column({ name: "trigger_on_enter", type: "boolean" })
  trigger_on_enter: boolean;

  @Column({ name: "trigger_on_exit", type: "boolean" })
  trigger_on_exit: boolean;

  @Column({ name: "active", type: "boolean" })
  active: boolean;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "color", type: "varchar", length: 16 })
  color: string;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
