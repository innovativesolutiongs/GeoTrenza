import {
  getRequest,
  postRequest,
  putRequest,
  deleteRequest,
} from "../api";

/* ========= PAYLOAD ========= */
export interface TruckPayload {
  truckNo: string;
  regoNo: string;
  modelNo: string;
  statusID: string;
  userID?: number; // ✅ FIXED
}


/* ========= API CALLS ========= */

const getAllTrucks = () => getRequest("/trucks");

const createTruck = (payload: TruckPayload) =>
  postRequest("/trucks", payload);

const updateTruck = (id: number, payload: TruckPayload) =>
  putRequest(`/trucks/${id}`, payload);

const deleteTruck = (id: number) =>
  deleteRequest(`/trucks/${id}`);

export default {
  getAllTrucks,
  createTruck,
  updateTruck,
  deleteTruck,
};
