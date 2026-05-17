import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity({ name: "positions" })
@Index("positions_device_id_recorded_at_idx", ["device_id", "recorded_at"])
export class Position {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "device_id", type: "bigint" })
  device_id: string;

  @Column({ name: "recorded_at", type: "timestamptz" })
  recorded_at: Date;

  @Column({ name: "received_at", type: "timestamptz" })
  received_at: Date;

  @Column({ name: "lat", type: "double precision" })
  lat: number;

  @Column({ name: "lng", type: "double precision" })
  lng: number;

  @Column({ name: "speed_kph", type: "real", nullable: true })
  speed_kph: number | null;

  @Column({ name: "heading_deg", type: "smallint", nullable: true })
  heading_deg: number | null;

  @Column({ name: "altitude_m", type: "integer", nullable: true })
  altitude_m: number | null;

  @Column({ name: "satellites", type: "smallint", nullable: true })
  satellites: number | null;

  @Column({ name: "signal_strength", type: "smallint", nullable: true })
  signal_strength: number | null;

  @Column({ name: "battery_voltage", type: "real", nullable: true })
  battery_voltage: number | null;

  @Column({ name: "mileage_m", type: "integer", nullable: true })
  mileage_m: number | null;

  @Column({ name: "telemetry", type: "jsonb" })
  telemetry: Record<string, unknown>;
}
