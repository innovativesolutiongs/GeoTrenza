// Mock ormconfig so AppDataSource.getRepository returns a swappable fake.
// Each test sets repoMocks[entityName] to a per-test repo implementation.
const repoMocks: Record<string, any> = {};

jest.mock("../ormconfig", () => ({
  AppDataSource: {
    getRepository: jest.fn((entity: { name?: string } | string) => {
      const key = typeof entity === "string" ? entity : entity.name ?? "";
      const m = repoMocks[key];
      if (!m) throw new Error(`No mock registered for repository ${key}`);
      return m;
    }),
  },
}));

import express from "express";
import request from "supertest";
import devicesRouter from "../routes/deviceRoutes";
import truckRouter from "../routes/truckRouter";
import positionRouter from "../routes/positionRoutes";
import eventRouter from "../routes/eventRoutes";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/devices", devicesRouter);
  app.use("/api/trucks", truckRouter);
  app.use("/api/positions", positionRouter);
  app.use("/api/events", eventRouter);
  return app;
};

beforeEach(() => {
  for (const k of Object.keys(repoMocks)) delete repoMocks[k];
});

const makeQB = (rows: unknown[]) => {
  const qb: any = {};
  qb.distinctOn = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.addOrderBy = jest.fn().mockReturnValue(qb);
  qb.limit = jest.fn().mockReturnValue(qb);
  qb.getMany = jest.fn().mockResolvedValue(rows);
  return qb;
};

describe("GET /api/devices", () => {
  test("happy path returns devices array", async () => {
    repoMocks["Devices"] = {
      find: jest.fn().mockResolvedValue([
        { id: "1", terminal_id: "690106149138", model: "G107" },
      ]),
    };
    const res = await request(buildApp()).get("/api/devices");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "1", terminal_id: "690106149138", model: "G107" }]);
    expect(repoMocks["Devices"].find).toHaveBeenCalledWith({ order: { id: "ASC" } });
  });

  test("empty result returns []", async () => {
    repoMocks["Devices"] = { find: jest.fn().mockResolvedValue([]) };
    const res = await request(buildApp()).get("/api/devices");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("GET /api/devices/:id with non-numeric id returns 400", async () => {
    repoMocks["Devices"] = { findOneBy: jest.fn() };
    const res = await request(buildApp()).get("/api/devices/abc");
    expect(res.status).toBe(400);
    expect(repoMocks["Devices"].findOneBy).not.toHaveBeenCalled();
  });

  test("GET /api/devices/:id missing returns 404", async () => {
    repoMocks["Devices"] = { findOneBy: jest.fn().mockResolvedValue(null) };
    const res = await request(buildApp()).get("/api/devices/9999");
    expect(res.status).toBe(404);
  });

  test("GET /api/devices/:id found returns device", async () => {
    repoMocks["Devices"] = {
      findOneBy: jest.fn().mockResolvedValue({ id: "42", terminal_id: "690106149138" }),
    };
    const res = await request(buildApp()).get("/api/devices/42");
    expect(res.status).toBe(200);
    expect(res.body.terminal_id).toBe("690106149138");
  });
});

describe("GET /api/trucks", () => {
  test("happy path returns trucks array", async () => {
    repoMocks["Trucks"] = {
      find: jest.fn().mockResolvedValue([
        { id: "1", account_id: "5", registration_no: "ABC-123", status: "active" },
      ]),
    };
    const res = await request(buildApp()).get("/api/trucks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].registration_no).toBe("ABC-123");
  });

  test("empty result returns []", async () => {
    repoMocks["Trucks"] = { find: jest.fn().mockResolvedValue([]) };
    const res = await request(buildApp()).get("/api/trucks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("GET /api/trucks/:id with non-numeric id returns 400", async () => {
    repoMocks["Trucks"] = { findOneBy: jest.fn() };
    const res = await request(buildApp()).get("/api/trucks/nope");
    expect(res.status).toBe(400);
  });

  test("GET /api/trucks/:id missing returns 404", async () => {
    repoMocks["Trucks"] = { findOneBy: jest.fn().mockResolvedValue(null) };
    const res = await request(buildApp()).get("/api/trucks/9999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/positions/latest", () => {
  test("happy path returns most recent position per device", async () => {
    const rows = [
      { id: "10", device_id: "1", lat: 24.86, lng: 67.0, recorded_at: "2026-05-15T17:55:46.000Z" },
    ];
    const qb = makeQB(rows);
    repoMocks["Position"] = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const res = await request(buildApp()).get("/api/positions/latest");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(qb.distinctOn).toHaveBeenCalledWith(["p.device_id"]);
    expect(qb.limit).toHaveBeenCalledWith(100);
  });

  test("respects limit query param", async () => {
    const qb = makeQB([]);
    repoMocks["Position"] = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const res = await request(buildApp()).get("/api/positions/latest?limit=5");
    expect(res.status).toBe(200);
    expect(qb.limit).toHaveBeenCalledWith(5);
  });

  test("rejects limit > 1000", async () => {
    repoMocks["Position"] = { createQueryBuilder: jest.fn() };
    const res = await request(buildApp()).get("/api/positions/latest?limit=999999");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/limit must be <=/);
  });

  test("rejects non-numeric limit", async () => {
    repoMocks["Position"] = { createQueryBuilder: jest.fn() };
    const res = await request(buildApp()).get("/api/positions/latest?limit=abc");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/positions", () => {
  test("happy path filters by device + time range", async () => {
    const rows = [{ id: "1", device_id: "42", lat: 24.86, lng: 67.0, recorded_at: "2026-05-15T17:55:46.000Z" }];
    const qb = makeQB(rows);
    repoMocks["Position"] = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const res = await request(buildApp())
      .get("/api/positions")
      .query({ device_id: "42", from: "2026-05-15T00:00:00Z", to: "2026-05-16T00:00:00Z" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(qb.where).toHaveBeenCalledWith("p.device_id = :deviceId", { deviceId: "42" });
  });

  test("missing required params returns 400", async () => {
    repoMocks["Position"] = { createQueryBuilder: jest.fn() };
    const res = await request(buildApp()).get("/api/positions");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/);
  });

  test("non-numeric device_id returns 400", async () => {
    repoMocks["Position"] = { createQueryBuilder: jest.fn() };
    const res = await request(buildApp())
      .get("/api/positions")
      .query({ device_id: "abc", from: "2026-05-15T00:00:00Z", to: "2026-05-16T00:00:00Z" });
    expect(res.status).toBe(400);
  });

  test("invalid from timestamp returns 400", async () => {
    repoMocks["Position"] = { createQueryBuilder: jest.fn() };
    const res = await request(buildApp())
      .get("/api/positions")
      .query({ device_id: "1", from: "not-a-date", to: "2026-05-16T00:00:00Z" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/from/);
  });

  test("empty result set returns []", async () => {
    const qb = makeQB([]);
    repoMocks["Position"] = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const res = await request(buildApp())
      .get("/api/positions")
      .query({ device_id: "999", from: "2026-05-15T00:00:00Z", to: "2026-05-16T00:00:00Z" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/events", () => {
  test("happy path filters by device + time range", async () => {
    const rows = [{ id: "1", device_id: "42", kind: "sos", started_at: "2026-05-15T18:00:00.000Z" }];
    const qb = makeQB(rows);
    repoMocks["Event"] = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const res = await request(buildApp())
      .get("/api/events")
      .query({ device_id: "42", from: "2026-05-15T00:00:00Z", to: "2026-05-16T00:00:00Z" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(qb.where).toHaveBeenCalledWith("e.device_id = :deviceId", { deviceId: "42" });
    expect(qb.orderBy).toHaveBeenCalledWith("e.started_at", "DESC");
  });

  test("missing required params returns 400", async () => {
    repoMocks["Event"] = { createQueryBuilder: jest.fn() };
    const res = await request(buildApp()).get("/api/events");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/);
  });

  test("empty result set returns []", async () => {
    const qb = makeQB([]);
    repoMocks["Event"] = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const res = await request(buildApp())
      .get("/api/events")
      .query({ device_id: "999", from: "2026-05-15T00:00:00Z", to: "2026-05-16T00:00:00Z" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
