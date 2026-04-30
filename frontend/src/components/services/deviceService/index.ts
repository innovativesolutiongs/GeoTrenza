import { getRequest, postRequest, putRequest, deleteRequest } from "../api";

export interface DevicePayload {
  deviceNo: string;
  deviceName: string;
  statusID: string;
  userID?: number;
}

// ====== GET ALL ======
const getAllDevices = () => {
  return getRequest("/devices");
};

// ====== CREATE ======
const createDevice = (data: DevicePayload) => {
  return postRequest("/devices", data);
};

// ====== UPDATE ======
const updateDevice = (id: number, data: Partial<DevicePayload>) => {
  return putRequest(`/devices/${id}`, data);
};

// ====== DELETE ======
const deleteDevice = (id: number) => {
  return deleteRequest(`/devices/${id}`);
};

export default {
  getAllDevices,
  createDevice,
  updateDevice,
  deleteDevice,
};
