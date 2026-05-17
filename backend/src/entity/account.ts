import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

@Entity({ name: "accounts" })
export class Account {
  @PrimaryGeneratedColumn({ name: "ID", type: "bigint" })
  ID: number;

  @Column({ name: "refID", type: "bigint", default: 0 })
  refID: number;

  @Column({ name: "code", type: "varchar", length: 20 })
  code: string;

  @Column({ name: "title", type: "text" })
  title: string;

  @Column({ name: "dotNo", type: "varchar", length: 15 })
  dotNo: string;

  @Column({ name: "mcNo", type: "varchar", length: 15 })
  mcNo: string;

  @Column({ name: "address", type: "varchar", length: 200 })
  address: string;

  @Column({ name: "stateName", type: "bigint", default: 0 })
  stateName: number;

  @Column({ name: "cityName", type: "bigint", default: 0 })
  cityName: number;

  @Column({ name: "zipCode", type: "bigint", default: 0 })
  zipCode: number;

  @Column({ name: "shpAddress", type: "varchar", length: 200 })
  shpAddress: string;

  @Column({ name: "shpStateName", type: "bigint", default: 0 })
  shpStateName: number;

  @Column({ name: "shpCityName", type: "bigint", default: 0 })
  shpCityName: number;

  @Column({ name: "shpZipCode", type: "bigint", default: 0 })
  shpZipCode: number;

  @Column({ name: "phoneNo", type: "varchar", length: 30 })
  phoneNo: string;

  @Column({ name: "emailID", type: "text" })
  emailID: string;

  @Column({ name: "nemailID", type: "text" })
  nemailID: string;

  @Column({ name: "firstName", type: "varchar", length: 200 })
  firstName: string;

  @Column({ name: "lastName", type: "varchar", length: 120 })
  lastName: string;

  @Column({ name: "dlNo", type: "varchar", length: 50 })
  dlNo: string;

  @Column({ name: "totT", type: "smallint", default: 0 })
  totT: number;

  @Column({ name: "totD", type: "smallint", default: 0 })
  totD: number;

  @Column({ name: "totS", type: "smallint", default: 0 })
  totS: number;

  @Column({ name: "batchID", type: "bigint", default: 0 })
  batchID: number;

  @Column({ name: "username", type: "varchar", length: 255, nullable: true })
  username: string;

  @Column({ name: "userpass", type: "varchar", length: 255, nullable: true })
  userpass: string;


  @Column({ name: "teamID", type: "varchar", length: 50 })
  teamID: string;

  @Column({ name: "assignTo", type: "varchar", length: 10 })
  assignTo: string;

  @Column({ name: "planID", type: "smallint", default: 0 })
  planID: number;

  @Column({ name: "elogID", type: "smallint", default: 2 })
  elogID: number;

  @Column({ name: "elogKey", type: "text" })
  elogKey: string;

  @Column({ name: "chkConfim", type: "smallint", default: 0 })
  chkConfim: number;

  @Column({ name: "appActiveID", type: "smallint", default: 2 })
  appActiveID: number;

  @Column({ name: "wapActiveID", type: "smallint", default: 2 })
  wapActiveID: number;

  @Column({ name: "mayaPlanID", type: "smallint", default: 0 })
  mayaPlanID: number;

  @Column({ name: "planTypeID", type: "smallint", default: 0 })
  planTypeID: number;

  @Column({ name: "rowID", type: "bigint", default: 0 })
  rowID: number;

  @Column({ name: "imageFile", type: "text" })
  imageFile: string;

  @Column({ name: "userID", type: "bigint", default: 0 })
  userID: number;

  @Column({ name: "companyID", type: "bigint", default: 0 })
  companyID: number;

  @Column({ name: "statusID", type: "smallint", default: 1 })
  statusID: number;

  @Column({ name: "logID", type: "timestamptz" })
  logID: Date;

  // === Stage 3e additions (customer onboarding) ===
  @Column({ name: "email", type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ name: "phone", type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ name: "owner_name", type: "varchar", length: 120, nullable: true })
  owner_name: string | null;

  @Column({ name: "company_name", type: "varchar", length: 255, nullable: true })
  company_name: string | null;

  @Column({ name: "pricing_tier", type: "varchar", length: 32 })
  pricing_tier: "Basic" | "Pro" | "Enterprise";

  @Column({ name: "billing_email", type: "varchar", length: 255, nullable: true })
  billing_email: string | null;

  @Column({ name: "billing_contact_name", type: "varchar", length: 120, nullable: true })
  billing_contact_name: string | null;

  @Column({ name: "address_line1", type: "varchar", length: 255, nullable: true })
  address_line1: string | null;

  @Column({ name: "address_line2", type: "varchar", length: 255, nullable: true })
  address_line2: string | null;

  @Column({ name: "city", type: "varchar", length: 120, nullable: true })
  city: string | null;

  @Column({ name: "state", type: "varchar", length: 120, nullable: true })
  state: string | null;

  @Column({ name: "postal_code", type: "varchar", length: 20, nullable: true })
  postal_code: string | null;

  @Column({ name: "country", type: "varchar", length: 120, nullable: true })
  country: string | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deleted_at: Date | null;
}
