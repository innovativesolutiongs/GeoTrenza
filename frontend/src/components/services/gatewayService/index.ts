import { getRequest, postRequest, putRequest, deleteRequest } from "../api";

export interface GatewayPayload {
  terminal_id: string;
  auth_code: string;
  model: string;
  device_type: "WIRED" | "MAGNETIC_BATTERY" | "ASSET_TRACKER";
  imei?: string | null;
  firmware_version?: string | null;
  inventory_status?: string;
}

const listGateways = (filters?: { account_id?: string; inventory_status?: string }) => {
  const qs = filters
    ? "?" + Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
    : "";
  return getRequest(`/gateways${qs}`);
};
const getGateway = (id: string) => getRequest(`/gateways/${id}`);
const createGateway = (data: GatewayPayload) => postRequest("/gateways", data);
const updateGateway = (id: string, data: Partial<GatewayPayload>) => putRequest(`/gateways/${id}`, data);
const assignGatewayToCustomer = (id: string, account_id: string) =>
  postRequest(`/gateways/${id}/assign-customer`, { account_id });
const unassignGatewayFromCustomer = (id: string) =>
  postRequest(`/gateways/${id}/unassign-customer`, { confirm: true, confirmation_text: "UNASSIGN" });
const assignGatewayToVehicle = (id: string, vehicle_id: string) =>
  postRequest(`/gateways/${id}/assign-vehicle`, { vehicle_id });
const unassignGatewayFromVehicle = (id: string) =>
  postRequest(`/gateways/${id}/unassign-vehicle`, {});
const deleteGateway = (id: string) => deleteRequest(`/gateways/${id}`);

export default {
  listGateways, getGateway, createGateway, updateGateway,
  assignGatewayToCustomer, unassignGatewayFromCustomer,
  assignGatewayToVehicle, unassignGatewayFromVehicle,
  deleteGateway,
};
