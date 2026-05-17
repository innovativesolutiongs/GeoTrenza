import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "trucks" })
export class Trucks {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "account_id", type: "bigint" })
  account_id: string;

  @Column({ name: "registration_no", type: "text" })
  registration_no: string;

  @Column({ name: "name", type: "text", nullable: true })
  name: string | null;

  @Column({ name: "model", type: "text", nullable: true })
  model: string | null;

  @Column({ name: "vin", type: "text", nullable: true })
  vin: string | null;

  @Column({ name: "status", type: "text" })
  status: string;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;

  @Column({ name: "updated_at", type: "timestamptz" })
  updated_at: Date;
}
