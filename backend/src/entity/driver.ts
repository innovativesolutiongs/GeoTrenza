import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "drivers" })
export class Driver {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "account_id", type: "bigint" })
  account_id: string;

  @Column({ name: "name", type: "varchar", length: 120 })
  name: string;

  @Column({ name: "phone", type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ name: "email", type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ name: "license_number", type: "varchar", length: 64, nullable: true })
  license_number: string | null;

  @Column({ name: "license_expiry", type: "date", nullable: true })
  license_expiry: string | null;

  @Column({ name: "hire_date", type: "date", nullable: true })
  hire_date: string | null;

  @Column({ name: "vehicle_id", type: "bigint", nullable: true })
  vehicle_id: string | null;

  @Column({ name: "status", type: "varchar", length: 16 })
  status: "ACTIVE" | "INACTIVE";

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
