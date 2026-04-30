import { getRequest } from "../api";

const fetchCustomersAPI = async () => {
  return getRequest("/customer");
};

export default fetchCustomersAPI;
