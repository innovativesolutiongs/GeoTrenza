// Tests the alert deduplicator logic in isolation — DB mocked.
import { deduplicator, DEDUP_WINDOW_MS } from "../services/alertEngine/deduplicator";

// Mock the ormconfig module so getRepository returns a controllable stub.
let mockRecentAlert: any = null;
jest.mock("../ormconfig", () => ({
  AppDataSource: {
    getRepository: () => ({
      createQueryBuilder: () => {
        const qb: any = {
          where: () => qb, andWhere: () => qb, orderBy: () => qb, limit: () => qb,
          getOne: async () => mockRecentAlert,
        };
        return qb;
      },
    }),
  },
}));

beforeEach(() => {
  mockRecentAlert = null;
});

describe("deduplicator.shouldSuppress", () => {
  const now = new Date("2026-05-17T12:00:00Z");

  test("no prior alert → not suppressed", async () => {
    mockRecentAlert = null;
    const result = await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now });
    expect(result).toBe(false);
  });

  test("ACTIVE alert within window (10min ago) → suppressed", async () => {
    mockRecentAlert = {
      status: "ACTIVE",
      triggered_at: new Date(now.getTime() - 10 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(true);
  });

  test("ACTIVE alert OUTSIDE window (61min ago) → NOT suppressed (refresh visibility)", async () => {
    mockRecentAlert = {
      status: "ACTIVE",
      triggered_at: new Date(now.getTime() - 61 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(false);
  });

  test("ACTIVE alert at exact window boundary → not suppressed (strict inequality)", async () => {
    mockRecentAlert = {
      status: "ACTIVE",
      triggered_at: new Date(now.getTime() - DEDUP_WINDOW_MS),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(false);
  });

  test("ACKNOWLEDGED alert (even just 1min ago) → NOT suppressed — user cleared it", async () => {
    mockRecentAlert = {
      status: "ACKNOWLEDGED",
      triggered_at: new Date(now.getTime() - 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(false);
  });

  test("RESOLVED alert → NOT suppressed", async () => {
    mockRecentAlert = {
      status: "RESOLVED",
      triggered_at: new Date(now.getTime() - 30 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(false);
  });

  test("SNOOZED with snooze_until in future → suppressed", async () => {
    mockRecentAlert = {
      status: "SNOOZED",
      triggered_at: new Date(now.getTime() - 30 * 60 * 1000),
      snoozed_until: new Date(now.getTime() + 30 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(true);
  });

  test("SNOOZED with snooze_until in past → NOT suppressed", async () => {
    mockRecentAlert = {
      status: "SNOOZED",
      triggered_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      snoozed_until: new Date(now.getTime() - 60 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(false);
  });

  test("MUTED alert → suppressed indefinitely", async () => {
    mockRecentAlert = {
      status: "MUTED",
      triggered_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: "10", now })).toBe(true);
  });

  test("vehicle_id null path queries IS NULL — still suppresses if active match", async () => {
    mockRecentAlert = {
      status: "ACTIVE",
      triggered_at: new Date(now.getTime() - 5 * 60 * 1000),
    };
    expect(await deduplicator.shouldSuppress({ rule_id: "1", vehicle_id: null, now })).toBe(true);
  });
});
