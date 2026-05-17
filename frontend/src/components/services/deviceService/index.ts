import { getRequest, postRequest, putRequest, deleteRequest } from "../api";

// Form payload shape — write endpoints are removed in Stage 3 backend, so these
// calls reject at runtime. Mutation UI is hidden via ENABLE_MUTATIONS.
export interface DevicePayload {
  deviceNo: string;
  deviceName: string;
  statusID: string;
  userID?: number;
}

const getAllDevices = () => {
  return getRequest("/devices");
};

const createDevice = (data: DevicePayload) => {
  return postRequest("/devices", data);
};

const updateDevice = (id: string, data: Partial<DevicePayload>) => {
  return putRequest(`/devices/${id}`, data);
};

const deleteDevice = (id: string) => {
  return deleteRequest(`/devices/${id}`);
};

export default {
  getAllDevices,
  createDevice,
  updateDevice,
  deleteDevice,
};
