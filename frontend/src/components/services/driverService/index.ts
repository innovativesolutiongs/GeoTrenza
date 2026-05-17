import { postRequest, putRequest, deleteRequest } from "../api";

const updateDriver = (id: string, data: any) => putRequest(`/drivers/${id}`, data);
const assignDriverToVehicle = (id: string, vehicle_id: string) =>
  postRequest(`/drivers/${id}/assign-vehicle`, { vehicle_id });
const unassignDriverFromVehicle = (id: string) =>
  postRequest(`/drivers/${id}/unassign-vehicle`, {});
const deleteDriver = (id: string) => deleteRequest(`/drivers/${id}`);

export default { updateDriver, assignDriverToVehicle, unassignDriverFromVehicle, deleteDriver };
