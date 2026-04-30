import { postRequest } from "../api";

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  customerID: number;
}

const changePasswordService = {
  changePassword: (data: ChangePasswordPayload) =>
    postRequest("/changepassword", data),
};

export default changePasswordService;
