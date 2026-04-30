import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn({ name: "ID", type: "bigint" })
  ID: number;

  @Column({ name: "companyID", type: "bigint", default: 0 })
  companyID: number;

  @Column({ name: "customerID", type: "bigint", default: 0 })
  customerID: number;

  @Column({ name: "staffID", type: "bigint", default: 0 })
  staffID: number;

  @Column({ name: "etypeID", type: "smallint", default: 1 })
  etypeID: number;

  @Column({ name: "uroleID", type: "bigint", default: 0 })
  uroleID: number;

  @Column({ name: "suroleID", type: "bigint", default: 0 })
  suroleID: number;

  @Column({ name: "empID", type: "bigint", default: 0 })
  empID: number;

  @Column({ name: "username", type: "varchar", length: 20 })
  username: string;

  @Column({ name: "fname", type: "varchar", length: 30 })
  fname: string;

  @Column({ name: "lname", type: "varchar", length: 30 })
  lname: string;

  @Column({ name: "email", type: "varchar", length: 30, nullable: true })
  email?: string;

  @Column({ name: "mobileno", type: "text" })
  mobileno: string;

  @Column({ name: "password", type: "varchar", length: 50 })
  password: string;

  @Column({ name: "pstexts", type: "text" })
  pstexts: string;

  @Column({ name: "userTY", type: "varchar", length: 5 })
  userTY: string;

  @Column({ name: "tokenAN", type: "text", nullable: true })
  tokenAN?: string;

  @Column({ name: "tokenAP", type: "text", nullable: true })
  tokenAP?: string;

  @Column({ name: "fcmID", type: "text" })
  fcmID: string;

  @Column({ name: "chkSupv", type: "smallint", default: 0 })
  chkSupv: number;

  @Column({ name: "isActive", type: "bigint", default: 1 })
  isActive: number;

  @Column({ name: "Available", type: "smallint", nullable: true })
  Available?: number;

  @Column({ name: "is_online", type: "smallint", default: 0 })
  is_online: number;

  @Column({ name: "extension", type: "smallint", default: 0 })
  extension: number;

  @Column({ name: "telnyx_user_id", type: "text" })
  telnyx_user_id: string;

  @Column({ name: "telnyx_conn_id", type: "varchar", length: 45 })
  telnyx_conn_id: string;

  @Column({ name: "logID", type: "timestamptz", nullable: true })
  logID?: Date;
}
