import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity({ name: "events" })
@Index("events_device_id_started_at_idx", ["device_id", "started_at"])
@Index("events_kind_started_at_idx", ["kind", "started_at"])
export class Event {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "device_id", type: "bigint" })
  device_id: string;

  @Column({ name: "position_id", type: "bigint", nullable: true })
  position_id: string | null;

  @Column({ name: "kind", type: "text" })
  kind: string;

  @Column({ name: "payload", type: "jsonb" })
  payload: Record<string, unknown>;

  @Column({ name: "started_at", type: "timestamptz" })
  started_at: Date;

  @Column({ name: "ended_at", type: "timestamptz", nullable: true })
  ended_at: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  created_at: Date;
}
