import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "trucks" })
export class Trucks {

  @PrimaryGeneratedColumn({ name: "ID", type: "integer" })
  ID: number;

  @Column({ name: "srNO", type: "integer", default: 0 })
  srNO: number;

  @Column({ name: "title", type: "varchar", length: 100 })
  title: string;

  @Column({ name: "slug", type: "varchar", length: 100 })
  slug: string;

  @Column({ name: "code", type: "varchar", length: 100 })
  code: string;

  @Column({ name: "statusID", type: "varchar", length: 100, nullable: true })
  statusID?: string;

  @Column({ name: "userID", type: "varchar", length: 100, nullable: true })
  userID?: string;

  @Column({ name: "logID", type: "varchar", length: 50, nullable: true })
  logID?: string;
}
