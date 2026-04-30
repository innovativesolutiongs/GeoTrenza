import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "accounts_dtl" })
export class allocation {
  @PrimaryGeneratedColumn() // Postgres SERIAL/auto increment
  recID: number;

  @Column({ name: "ID", type: "integer" })
  ID: number;

  @Column({ name: "truckID", type: "integer", default: 0 })
  truckID: number;

  @Column({ name: "deviceID", type: "integer", default: 0 })
  deviceID: number;

  @Column({ name: "customerID", type: "integer", default: 0 })
  customerID: number;

  @Column({ name: "dateID", type: "integer", default: 0 })
  dateID: number;

  @Column({ name: "logDate", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  logDate: Date;

  @Column({ name: "logTime", type: "varchar", length: 100, nullable: true })
  logTime?: string;
}
