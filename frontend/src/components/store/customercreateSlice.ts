// src/store/customercreateSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import fetchCustomersAPI from "../services/createcustomerservice";

export const fetchCustomers = createAsyncThunk<
  any[],
  void,
  { rejectValue: string }
>("customer/fetch", async (_, thunkAPI) => {
  try {
    const res = await fetchCustomersAPI();
    // console.log(res);

    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    if (Array.isArray(res.data?.customers)) return res.data.customers;

    return [];
  } catch {
    return thunkAPI.rejectWithValue("Failed to load customers");
  }
});

const customerSlice = createSlice({
  name: "customercreate",
  initialState: {
    list: [] as any[],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.list = [];
        state.error = action.payload || "Error";
      });
  },
});

export default customerSlice.reducer;
