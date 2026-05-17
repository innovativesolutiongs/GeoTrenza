import { getRequest } from "../api";

// GET /api/events?device_id=&from=&to=
const getEventsForDevice = (deviceId: string, from: string, to: string) => {
  const qs = `device_id=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return getRequest(`/events?${qs}`);
};

export default {
  getEventsForDevice,
};
