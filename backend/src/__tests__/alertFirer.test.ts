// Tests alertFirer — verifies dedup gating, severity-frozen-at-fire,
// in-app delivery dispatch, and that channel errors don't block fires.

const mockSavedAlerts: any[] = [];
let mockShouldSuppress = false;
let mockAccountUsers: any[] = [];
let mockSubs: any[] = [];

jest.mock("../services/alertEngine/deduplicator", () => ({
  deduplicator: {
    shouldSuppress: async () => mockShouldSuppress,
  },
}));

jest.mock("../ormconfig", () => ({
  AppDataSource: {
    getRepository: (cls: any) => {
      const tableName = cls?.name || "";
      if (tableName === "Alert") {
        return {
          create: (data: any) => ({ ...data, id: String(mockSavedAlerts.length + 1) }),
          save: async (data: any) => { mockSavedAlerts.push(data); return data; },
        };
      }
      if (tableName === "AlertSubscription") {
        return {
          createQueryBuilder: () => {
            const qb: any = {
              where: () => qb, andWhere: () => qb,
              getMany: async () => mockSubs,
            };
            return qb;
          },
        };
      }
      if (tableName === "User") {
        return {
          createQueryBuilder: () => {
            const qb: any = {
              where: () => qb, andWhere: () => qb,
              getMany: async () => mockAccountUsers,
            };
            return qb;
          },
        };
      }
      return {};
    },
  },
}));

// Track in-app deliveries.
const inAppDeliveries: any[] = [];
jest.mock("../services/alertEngine/deliveryChannels/inApp", () => ({
  inAppChannel: {
    name: "IN_APP",
    deliver: async (alert: any, userId: string) => { inAppDeliveries.push({ alert, userId }); },
  },
}));
// WhatsApp channel that throws — verify alert still persists.
jest.mock("../services/alertEngine/deliveryChannels/whatsapp", () => ({
  whatsappChannel: {
    name: "WHATSAPP",
    deliver: async () => { throw new Error("simulated WhatsApp outage"); },
  },
}));
jest.mock("../services/alertEngine/deliveryChannels/email", () => ({
  emailChannel: { name: "EMAIL", deliver: async () => {} },
}));
jest.mock("../services/alertEngine/deliveryChannels/sms", () => ({
  smsChannel: { name: "SMS", deliver: async () => {} },
}));

import { alertFirer } from "../services/alertEngine/alertFirer";

const makeRule = (overrides: any = {}) => ({
  id: "42",
  account_id: "7",
  name: "Test rule",
  severity: "HIGH" as const,
  rule_type: "STUB_TEST",
  ...overrides,
});

beforeEach(() => {
  mockSavedAlerts.length = 0;
  inAppDeliveries.length = 0;
  mockShouldSuppress = false;
  mockAccountUsers = [];
  mockSubs = [];
  // Silence the channel-error logger.
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("alertFirer.fire", () => {
  test("suppressed by deduplicator → returns null, no row saved", async () => {
    mockShouldSuppress = true;
    const result = await alertFirer.fire({
      rule: makeRule() as any,
      vehicle_id: "1",
      device_id: null,
      title: "x",
    });
    expect(result).toBeNull();
    expect(mockSavedAlerts).toHaveLength(0);
  });

  test("not suppressed → creates row with severity frozen from rule", async () => {
    const saved = await alertFirer.fire({
      rule: makeRule({ severity: "CRITICAL" }) as any,
      vehicle_id: "1",
      device_id: null,
      title: "Frozen severity",
    });
    expect(saved).not.toBeNull();
    expect(mockSavedAlerts).toHaveLength(1);
    expect(mockSavedAlerts[0].severity).toBe("CRITICAL");
    expect(mockSavedAlerts[0].status).toBe("ACTIVE");
    expect(mockSavedAlerts[0].title).toBe("Frozen severity");
  });

  test("status set to ACTIVE on fresh fire", async () => {
    await alertFirer.fire({
      rule: makeRule() as any, vehicle_id: null, device_id: null, title: "t",
    });
    expect(mockSavedAlerts[0].status).toBe("ACTIVE");
    expect(mockSavedAlerts[0].acknowledged_at).toBeNull();
    expect(mockSavedAlerts[0].resolved_at).toBeNull();
  });

  test("severity copied at fire time — later rule edits would NOT rewrite history", async () => {
    const rule = makeRule({ severity: "MEDIUM" });
    await alertFirer.fire({
      rule: rule as any, vehicle_id: null, device_id: null, title: "first",
    });
    // Mutate rule severity post-fire — saved alert should still carry MEDIUM.
    rule.severity = "LOW";
    expect(mockSavedAlerts[0].severity).toBe("MEDIUM");
  });

  test("dispatches to in-app channel for matching subscription", async () => {
    mockAccountUsers = [{ ID: "100" }];
    mockSubs = [{ user_id: "100", channels: ["IN_APP"], min_severity: "LOW", snooze_until: null }];
    await alertFirer.fire({
      rule: makeRule() as any, vehicle_id: "1", device_id: null, title: "dispatch test",
    });
    // dispatchToSubscribers is fired async (void). Give it a tick.
    await new Promise((r) => setImmediate(r));
    expect(inAppDeliveries).toHaveLength(1);
    expect(inAppDeliveries[0].userId).toBe("100");
  });

  test("subscription with min_severity above alert severity → not delivered", async () => {
    mockAccountUsers = [{ ID: "100" }];
    mockSubs = [{ user_id: "100", channels: ["IN_APP"], min_severity: "CRITICAL", snooze_until: null }];
    await alertFirer.fire({
      rule: makeRule({ severity: "LOW" }) as any, vehicle_id: null, device_id: null, title: "x",
    });
    await new Promise((r) => setImmediate(r));
    expect(inAppDeliveries).toHaveLength(0);
  });

  test("user-level snooze active → not delivered", async () => {
    mockAccountUsers = [{ ID: "100" }];
    mockSubs = [{
      user_id: "100", channels: ["IN_APP"], min_severity: "LOW",
      snooze_until: new Date(Date.now() + 60 * 60 * 1000),
    }];
    await alertFirer.fire({
      rule: makeRule() as any, vehicle_id: null, device_id: null, title: "x",
    });
    await new Promise((r) => setImmediate(r));
    expect(inAppDeliveries).toHaveLength(0);
  });

  test("WhatsApp channel throws → alert still persisted, in-app still delivered", async () => {
    mockAccountUsers = [{ ID: "100" }];
    mockSubs = [{ user_id: "100", channels: ["IN_APP","WHATSAPP"], min_severity: "LOW", snooze_until: null }];
    const saved = await alertFirer.fire({
      rule: makeRule() as any, vehicle_id: null, device_id: null, title: "resilient",
    });
    await new Promise((r) => setImmediate(r));
    expect(saved).not.toBeNull();
    expect(mockSavedAlerts).toHaveLength(1);
    expect(inAppDeliveries).toHaveLength(1); // IN_APP still went through
  });

  test("no account users → no deliveries, but row still saved", async () => {
    mockAccountUsers = [];
    mockSubs = [];
    const saved = await alertFirer.fire({
      rule: makeRule() as any, vehicle_id: null, device_id: null, title: "orphan",
    });
    await new Promise((r) => setImmediate(r));
    expect(saved).not.toBeNull();
    expect(inAppDeliveries).toHaveLength(0);
  });
});
