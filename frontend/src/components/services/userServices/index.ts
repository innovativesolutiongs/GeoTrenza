// src/components/services/userServices.ts
import { postRequest } from "../api";

const signInUser = (payload: { userName: string; password: string }) => {
  return postRequest("/login", payload);
};

const logoutUser = () => {
  return postRequest("/logout", {});
};

const forgotPassword = (payload: { email: string }) => {
  return postRequest("/users/forgot-password", payload);
};

const signUpUser = (payload: any) => {
  return postRequest("/users/signup", payload);
};

export default {
  signInUser,
  logoutUser,
  forgotPassword,
  signUpUser,
};
