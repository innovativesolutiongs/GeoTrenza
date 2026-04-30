
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "devices" })
export class Devices {
  @PrimaryGeneratedColumn({ name: "ID", type: "bigint" })
  ID: number;

  @Column({ name: "srNO", type: "integer", default: 0 })
  srNO: number;

  @Column({ name: "title", type: "integer", default: 0 })
  title: number;

  @Column({ name: "code", type: "integer", default: 0 })
  code: number;

  @Column({ name: "statusID", type: "integer",  nullable: true })
  statusID?: number;

  @Column({ name: "userID", type: "varchar", length: 100, nullable: true })
  userID: number;

  @Column({ type: "timestamptz", name: "logID", comment: "logID" })
  logID: Date;
}
