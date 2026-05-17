import { getRequest, postRequest, putRequest, deleteRequest } from "../api";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RuleType =
  | "GEOFENCE_ENTRY" | "GEOFENCE_EXIT" | "DEVICE_OFFLINE"
  | "EXTENDED_IDLE" | "SPEED_VIOLATION" | "UNAUTHORIZED_MOVEMENT" | "STUB_TEST";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "SNOOZED" | "MUTED";
export type AlertChannel = "IN_APP" | "WHATSAPP" | "EMAIL" | "SMS";

export interface AlertRow {
  id: string;
  account_id: string;
  rule_id: string;
  vehicle_id: string | null;
  device_id: string | null;
  triggered_at: string;
  severity: Severity;
  title: string;
  description: string | null;
  payload: Record<string, unknown> | null;
  status: AlertStatus;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  resolved_at: string | null;
  snoozed_until: string | null;
}

export interface AlertRuleRow {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  rule_type: RuleType;
  config: Record<string, unknown>;
  severity: Severity;
  enabled: boolean;
  scope: "FLEET" | "VEHICLE" | "GROUP";
}

// --- Alerts ---
const listAlerts = (q: { account_id?: string; status?: AlertStatus | "all"; vehicle_id?: string; from?: string; to?: string; limit?: number } = {}) => {
  const params = new URLSearchParams();
  if (q.account_id) params.set("account_id", q.account_id);
  if (q.status && q.status !== "all") params.set("status", q.status);
  if (q.vehicle_id) params.set("vehicle_id", q.vehicle_id);
  if (q.from) params.set("from", q.from);
  if (q.to) params.set("to", q.to);
  if (q.limit) params.set("limit", String(q.limit));
  const qs = params.toString();
  return getRequest(`/alerts${qs ? `?${qs}` : ""}`);
};
const getAlert = (id: string) => getRequest(`/alerts/${id}`);
const acknowledgeAlert = (id: string, user_id?: string) => postRequest(`/alerts/${id}/acknowledge`, { user_id });
const resolveAlert = (id: string) => postRequest(`/alerts/${id}/resolve`, {});
const snoozeAlert = (id: string, until: string) => postRequest(`/alerts/${id}/snooze`, { until });
const muteAlert = (id: string) => postRequest(`/alerts/${id}/mute`, {});
const deleteAlert = (id: string) => deleteRequest(`/alerts/${id}`);

// --- Alert rules ---
const listAlertRules = (accountId?: string) =>
  getRequest(`/alert-rules${accountId ? `?account_id=${encodeURIComponent(accountId)}` : ""}`);
const createAlertRule = (data: Partial<AlertRuleRow> & { account_id: string; name: string; rule_type: RuleType }) =>
  postRequest("/alert-rules", data);
const updateAlertRule = (id: string, data: Partial<AlertRuleRow>) => putRequest(`/alert-rules/${id}`, data);
const deleteAlertRule = (id: string) => deleteRequest(`/alert-rules/${id}`);
const testFireAlertRule = (id: string, data: { title?: string; description?: string; vehicle_id?: string; device_id?: string } = {}) =>
  postRequest(`/alert-rules/${id}/test`, data);

// --- Subscriptions ---
const listSubscriptions = (userId: string) => getRequest(`/users/${userId}/alert-subscriptions`);
const createSubscription = (userId: string, data: { rule_id?: string | null; channels: AlertChannel[]; min_severity?: Severity }) =>
  postRequest(`/users/${userId}/alert-subscriptions`, data);
const updateSubscription = (id: string, data: { channels?: AlertChannel[]; min_severity?: Severity; snooze_until?: string | null }) =>
  putRequest(`/alert-subscriptions/${id}`, data);
const deleteSubscription = (id: string) => deleteRequest(`/alert-subscriptions/${id}`);

export default {
  listAlerts, getAlert, acknowledgeAlert, resolveAlert, snoozeAlert, muteAlert, deleteAlert,
  listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, testFireAlertRule,
  listSubscriptions, createSubscription, updateSubscription, deleteSubscription,
};
