import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "vehicles" })
export class Vehicles {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "account_id", type: "bigint" })
  account_id: string;

  @Column({ name: "registration_no", type: "text" })
  registration_no: string;

  @Column({ name: "name", type: "text", nullable: true })
  name: string | null;

  @Column({ name: "year", type: "integer", nullable: true })
  year: number | null;

  @Column({ name: "make", type: "varchar", length: 64, nullable: true })
  make: string | null;

  @Column({ name: "model", type: "text", nullable: true })
  model: string | null;

  @Column({ name: "manufacturer", type: "varchar", length: 64, nullable: true })
  manufacturer: string | null;

  @Column({ name: "vin", type: "text", nullable: true })
  vin: string | null;

  @Column({ name: "vehicle_type", type: "varchar", length: 32 })
  vehicle_type: string;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: "status", type: "text" })
  status: string;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
