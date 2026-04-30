import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import changePasswordService from "../services/changepassword";
import type { ChangePasswordPayload } from "../services/changepassword";

interface ChangePasswordState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

const initialState: ChangePasswordState = {
  loading: false,
  success: false,
  error: null,
};

export const changePassword = createAsyncThunk<
  any,
  ChangePasswordPayload,
  { rejectValue: string }
>(
  "changePassword/update",
  async (data, { rejectWithValue }) => {
    try {
      const response = await changePasswordService.changePassword(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Something went wrong"
      );
    }
  }
);

const changePasswordSlice = createSlice({
  name: "changePassword",
  initialState,
  reducers: {
    resetChangePasswordState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to change password";
      });
  },
});

export const { resetChangePasswordState } = changePasswordSlice.actions;
export default changePasswordSlice.reducer;
