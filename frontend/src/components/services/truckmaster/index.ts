import {
  getRequest,
  postRequest,
  putRequest,
  deleteRequest,
} from "../api";

// Form payload shape — write endpoints are removed in Stage 3 backend, so these
// calls reject at runtime. Mutation UI is hidden via ENABLE_MUTATIONS.
export interface TruckPayload {
  truckNo: string;
  regoNo: string;
  modelNo: string;
  statusID: string;
  userID?: number;
}

const getAllTrucks = () => getRequest("/trucks");

const createTruck = (payload: TruckPayload) =>
  postRequest("/trucks", payload);

const updateTruck = (id: string, payload: TruckPayload) =>
  putRequest(`/trucks/${id}`, payload);

const deleteTruck = (id: string) =>
  deleteRequest(`/trucks/${id}`);

export default {
  getAllTrucks,
  createTruck,
  updateTruck,
  deleteTruck,
};
