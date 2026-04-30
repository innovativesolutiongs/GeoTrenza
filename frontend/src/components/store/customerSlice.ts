import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import customersService, { type Customer } from "../services/customer";

/* ================= STATE ================= */

interface UserCredentialState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface CustomerState {
  items: Customer[];
  loading: boolean;
  error: string | null;
  success: boolean;
  userCredentials: UserCredentialState;
}

const initialState: CustomerState = {
  items: [],
  loading: false,
  error: null,
  success: false,

  userCredentials: {
    loading: false,
    error: null,
    success: false,
  },
};

/* ================= THUNKS ================= */

// Fetch customers
export const fetchCustomers = createAsyncThunk<
  Customer[],
  number,
  { rejectValue: string }
>("customers/fetchCustomers", async (companyID, thunkAPI) => {
  try {
    return await customersService.fetchCustomers(companyID);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message ||
      err?.message ||
      "Failed to fetch customers"
    );
  }
});

// Create customer
export const createCustomer = createAsyncThunk<
  Customer,
  Omit<Customer, "ID">,
  { rejectValue: string }
>("customers/createCustomer", async (payload, thunkAPI) => {
  try {
    return await customersService.createCustomer(payload);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err);
  }
});

export const updateCustomer = createAsyncThunk<
  Customer,
  { ID: number; data: Partial<Customer> },
  { rejectValue: string }
>("customers/updateCustomer", async ({ ID, data }, thunkAPI) => {
  try {
    return await customersService.updateCustomer(ID, data);
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      typeof err === "string"
        ? err
        : err?.response?.data?.message || "Failed to update customer"
    );
  }
});

// Delete customer
export const deleteCustomer = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("customers/deleteCustomer", async (id, thunkAPI) => {
  try {
    await customersService.deleteCustomer(id);
    return id;
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message ||
      err?.message ||
      "Failed to delete customer"
    );
  }
});

export const updateUserCredentials = createAsyncThunk<
  any,
  { customerID: number; username: string; password: string },
  { rejectValue: string }
>(
  "customers/updateUserCredentials",
  async (payload, thunkAPI) => {
    try {
      console.log("THUNK START →", payload);

      const response = await customersService.updateUserCredentials(payload);

      console.log("THUNK SUCCESS →", response);

      return response;
    } catch (err: any) {
      console.log("THUNK ERROR →", err);
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message ||
        err?.message ||
        "Update failed"
      );
    }
  }
);




/* ================= SLICE ================= */

const customersSlice = createSlice({
  name: "customers",
  initialState,

  reducers: {
    resetCustomerState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },

    resetUserCredentialState: (state) => {
      state.userCredentials.loading = false;
      state.userCredentials.error = null;
      state.userCredentials.success = false;
    },
  },

  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action: PayloadAction<Customer[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch customers";
      })

      // CREATE
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCustomer.fulfilled, (state, action: PayloadAction<Customer>) => {
        state.loading = false;
        state.items.push(action.payload);
        state.success = true;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create customer";
      })

      // UPDATE
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCustomer.fulfilled, (state, action: PayloadAction<Customer>) => {
        state.loading = false;
        state.success = true;
        const index = state.items.findIndex(
          (c) => c.ID === action.payload.ID
        );
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update customer";
      })

      // DELETE
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.items = state.items.filter(
          (c) => c.ID !== action.payload
        );
        state.success = true;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete customer";
      })

      // USER CREDENTIAL UPDATE
      // USER CREDENTIAL UPDATE
      .addCase(updateUserCredentials.pending, (state) => {
        if (!state.userCredentials) {
          state.userCredentials = {
            loading: false,
            error: null,
            success: false,
          };
        }

        state.userCredentials.loading = true;
        state.userCredentials.error = null;
        state.userCredentials.success = false;
      })

      .addCase(updateUserCredentials.fulfilled, (state, action) => {
        if (!state.userCredentials) {
          state.userCredentials = {
            loading: false,
            error: null,
            success: false,
          };
        }

        state.userCredentials.loading = false;
        state.userCredentials.success = true;
        state.userCredentials.error = null;

        console.log("REDUCER RECEIVED →", action.payload);
      })

      .addCase(updateUserCredentials.rejected, (state, action) => {
        if (!state.userCredentials) {
          state.userCredentials = {
            loading: false,
            error: null,
            success: false,
          };
        }

        state.userCredentials.loading = false;
        state.userCredentials.error =
          action.payload || "Update failed";
      });
    ;
  },
});

export const {
  resetCustomerState,
  resetUserCredentialState,
} = customersSlice.actions;

export default customersSlice.reducer;
