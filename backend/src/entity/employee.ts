import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("employee")
export class Employee {
  @PrimaryGeneratedColumn({ type: "bigint", name: "ID" })
  ID: number;

  @Column({ type: "bigint", default: 0 })
  code: number;

  @Column({ type: "varchar", length: 100 })
  slug: string;

  @Column({ type: "text" })
  fname: string;

  @Column({ type: "text" })
  lname: string;

  @Column({ type: "text" })
  title: string;

  @Column({ type: "varchar", length: 120 })
  nickName: string;

  @Column({ type: "smallint", default: 0 })
  chkOT: number;

  @Column({ type: "smallint", default: 0 })
  chkSV: number;

  @Column({ type: "smallint", default: 1 })
  etypeID: number;

  @Column({ type: "varchar", length: 150 })
  fatherName: string;

  @Column({ type: "varchar", length: 12 })
  fatherContact: string;

  @Column({ type: "varchar", length: 150 })
  motherName: string;

  @Column({ type: "varchar", length: 12 })
  motherContact: string;

  @Column({ type: "smallint", default: 0 })
  genderID: number;

  @Column({ type: "smallint", default: 0 })
  mstatusID: number;

  @Column({ type: "smallint", default: 0 })
  proficiencyID: number;

  @Column({ type: "smallint", default: 2 })
  assistantID: number;

  @Column({ type: "date" })
  dobDT: string;

  @Column({ type: "date" })
  anniversaryDT: string;

  @Column({ type: "bigint", default: 0 })
  scheduleID: number;

  @Column({ type: "bigint", default: 0 })
  deptID: number;

  @Column({ type: "bigint", default: 0 })
  desigID: number;

  @Column({ type: "bigint", default: 0 })
  dlevelID: number;

  @Column({ type: "varchar", length: 20 })
  mDeptID: string;

  @Column({ type: "smallint", default: 0 })
  mAutoID: number;

  @Column({ type: "smallint", default: 0 })
  mCallsID: number;

  @Column({ type: "float", precision: 20, scale: 2, default: 0 })
  payoutVal: number;

  @Column({ type: "varchar", length: 5, default: "00:00" })
  wrkHours: string;

  @Column({ type: "smallint", default: 0 })
  jtypeID: number;

  @Column({ type: "text" })
  address: string;

  @Column({ type: "varchar", length: 20 })
  pincode: string;

  @Column({ type: "varchar", length: 15 })
  phoneNO: string;

  @Column({ type: "varchar", length: 15 })
  phoneNO_1: string;

  @Column({ type: "varchar", length: 150 })
  userName: string;

  @Column({ type: "varchar", length: 30 })
  userPass: string;

  @Column({ type: "varchar", length: 150 })
  emailID: string;

  @Column({ type: "varchar", length: 100 })
  salBankName: string;

  @Column({ type: "varchar", length: 100 })
  salAccountName: string;

  @Column({ type: "varchar", length: 50 })
  salAccountNo: string;

  @Column({ type: "varchar", length: 50 })
  salIfscCode: string;

  @Column({ type: "varchar", length: 100 })
  salBranchName: string;

  @Column({ type: "varchar", length: 30 })
  pfCardNo: string;

  @Column({ type: "varchar", length: 30 })
  esiCardNo: string;

  @Column({ type: "varchar", length: 120 })
  bankName: string;

  @Column({ type: "varchar", length: 30 })
  accountNo: string;

  @Column({ type: "varchar", length: 150 })
  accountName: string;

  @Column({ type: "varchar", length: 30 })
  ifscCode: string;

  @Column({ type: "varchar", length: 100 })
  branchName: string;

  @Column({ type: "varchar", length: 30 })
  aadharNo: string;

  @Column({ type: "varchar", length: 30 })
  panNo: string;

  @Column({ type: "varchar", length: 30 })
  licenseNo: string;

  @Column({ type: "text" })
  attachFile: string;

  @Column({ type: "text" })
  imageFile: string;

  @Column({ type: "smallint", default: 0 })
  chkShuffle: number;

  @Column({ type: "float", default: 0 })
  secuirtyFee: number;

  @Column({ type: "smallint", default: 0 })
  statusID: number;

  @Column({ type: "date" })
  tsDate: string;

  @Column({ type: "date" })
  teDate: string;

  @Column({ type: "date" })
  esDate: string;

  @Column({ type: "date" })
  enDate: string;

  @Column({ type: "date", nullable: true })
  inDate: string | null;

  @Column({ type: "varchar", length: 5 })
  systemNO: string;

  @Column({ type: "bigint", default: 0 })
  batchID: number;

  @Column({ type: "smallint", default: 0 })
  unitID: number;

  @Column({ type: "bigint", default: 0 })
  companyID: number;

  @Column({ type: "bigint" })
  userID: number;

  @Column({ type: "timestamptz" })
  logID: Date;
}
