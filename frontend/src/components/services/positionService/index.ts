import { getRequest } from "../api";

// GET /api/positions/latest?limit=N — most recent position per device.
const getLatestPositions = (limit?: number) => {
  const query = limit !== undefined ? `?limit=${limit}` : "";
  return getRequest(`/positions/latest${query}`);
};

// GET /api/positions?device_id=&from=&to= — historical track for a device.
const getPositionsForDevice = (deviceId: string, from: string, to: string) => {
  const qs = `device_id=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return getRequest(`/positions?${qs}`);
};

export default {
  getLatestPositions,
  getPositionsForDevice,
};
