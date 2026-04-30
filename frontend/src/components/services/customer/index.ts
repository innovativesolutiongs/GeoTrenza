// src/services/customersService.ts
import { getRequest, postRequest, putRequest, deleteRequest } from "../api";
type ApiMaybeArray<T> =
  | T[]
  | { data?: T[]; result?: T[]; items?: T[]; customers?: T[] };

const normalizeArray = <T>(payload: ApiMaybeArray<T> | undefined | null): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.data ?? payload.result ?? payload.items ?? payload.customers ?? [];
};
// Define Customer interface (adjust fields according to your DB)
export interface Customer {
  ID: number;
  code: string;
  title: string;
  dotNo?: number | string;
  mcNo?: number | string;
  address?: number | string;
  zipCode?: number | string;
  phoneNo?: string;
  emailID?: string;
  nemailID?: string;
  firstName?: string;
  lastName?: string;
  userID?: number;
  companyID?: number;
  statusID?: number;
  logID?: string;  // date as ISO string
}
export interface UserCredentialsPayload {
  customerID: number;
  username: string;
  password: string;
}

const customersService = {
  fetchCustomers: async (companyID: number): Promise<Customer[]> => {
    const res = await getRequest(`/customer?companyID=${companyID}`);
    // Debug:
    // console.log("fetchCustomers raw response:", res);
    return normalizeArray<Customer>(res?.data);
  },

  createCustomer: async (payload: Omit<Customer, "ID">): Promise<Customer> => {
    try {
      const res = await postRequest("/customer", payload);
      return res?.data?.data ?? res?.data;
    } catch (err: any) {
      throw err?.response?.data?.message || "Failed to create customer";
    }
  },

  updateCustomer: async (
    id: number,
    payload: Partial<Customer>
  ): Promise<Customer> => {
    try {
      const res = await putRequest(`/customer/update/${id}`, payload);
      return res?.data?.data ?? res?.data;
    } catch (err: any) {
      throw err?.response?.data?.message || "Failed to update customer";
    }
  },

  deleteCustomer: async (id: number): Promise<void> => {
    await deleteRequest(`/customer/delete/${id}`);
    console.log('deletereached')
  },

  updateUserCredentials: async (
    payload: UserCredentialsPayload
  ): Promise<any> => {
    console.log("SERVICE HIT →", payload);
    const res = await postRequest("/customer/update-credentials", payload);

    // normalize response like your other APIs
    return res?.data?.data ?? res?.data;
  },


};
export default customersService;
