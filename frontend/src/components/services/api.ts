// src/components/services/api.ts
import axios from "axios";

// VITE_API_URL is set per-environment in .env.local (gitignored) or via the
// build environment. Falls back to local dev backend for the common case.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const API = axios.create({
  baseURL,
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
