import { getRequest, postRequest, putRequest, deleteRequest } from "../api";

export interface CustomerPayload {
  company_name: string;
  owner_name: string;
  email: string;
  phone: string;
  pricing_tier?: "Basic" | "Pro" | "Enterprise";
  billing_email?: string | null;
  billing_contact_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

const listCustomers = () => getRequest("/customers");
const getCustomer = (id: string) => getRequest(`/customers/${id}`);
const createCustomer = (data: CustomerPayload) => postRequest("/customers", data);
const updateCustomer = (id: string, data: Partial<CustomerPayload>) => putRequest(`/customers/${id}`, data);
const deleteCustomer = (id: string) => deleteRequest(`/customers/${id}`);

const listVehiclesForCustomer = (id: string) => getRequest(`/customers/${id}/vehicles`);
const createVehicleForCustomer = (id: string, data: any) => postRequest(`/customers/${id}/vehicles`, data);

const listDriversForCustomer = (id: string) => getRequest(`/customers/${id}/drivers`);
const createDriverForCustomer = (id: string, data: any) => postRequest(`/customers/${id}/drivers`, data);

const listUsers = (accountId: string) => getRequest(`/users?account_id=${encodeURIComponent(accountId)}`);
const createUser = (data: { account_id: string; name: string; email: string; role?: string }) =>
  postRequest("/users", data);

export default {
  listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  listVehiclesForCustomer, createVehicleForCustomer,
  listDriversForCustomer, createDriverForCustomer,
  listUsers, createUser,
};
