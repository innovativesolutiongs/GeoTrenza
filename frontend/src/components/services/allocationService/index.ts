import { getRequest, postRequest, deleteRequest } from "../api";

export interface Allocation {
  recID?: number;
  ID?: number;
  allocationDate: string;
  customerId: number;
  truckNo: number;
  deviceNo: number;
  compID?: number;
}

const allocationService = {

  // GET ALL allocations
  fetchAllocations: async (): Promise<Allocation[]> => {
    const response = await getRequest("/allocation");
    return response.data;
  },

  // GET allocations by customer
  fetchCustomerAllocations: async (
    customerId: number
  ): Promise<Allocation[]> => {
    const response = await getRequest(`/allocation/customer/${customerId}`);
    return response.data.data; // because backend returns {success,data}
  },

  // CREATE allocation
  createAllocation: async (data: Allocation): Promise<Allocation> => {
    const response = await postRequest("/allocation", data);
    return response.data;
  },

  // DELETE allocation
  deleteAllocation: async (id: number): Promise<void> => {
    await deleteRequest(`/allocation/${id}`);
  },
};

export default allocationService;