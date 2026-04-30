// src/components/services/api.ts
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000/api", // adjust if needed
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // keep if backend uses cookies/session
});

// GET request
export const getRequest = (url: string, config = {}) => {
  return API.get(url, config);
};

// POST request
export const postRequest = (url: string, data: any, config = {}) => {
  return API.post(url, data, config);
};

// PUT request
export const putRequest = (url: string, data: any, config = {}) => {
  return API.put(url, data, config);
};

// DELETE request
export const deleteRequest = (url: string, config = {}) => {
  return API.delete(url, config);
};

export default API;
