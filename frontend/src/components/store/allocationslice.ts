import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import allocationService from "../services/allocationService";
import type { Allocation } from "../services/allocationService";

interface AllocationState {
  items: Allocation[];
  allocations: Allocation[];
  loading: boolean;
  error: string | null;
}

const initialState: AllocationState = {
  items: [],
  allocations: [],
  loading: false,
  error: null,
};



// =================== CREATE ALLOCATION ===================

export const addAllocation = createAsyncThunk(
  "allocation/add",
  async (payload: Allocation, { rejectWithValue }) => {
    try {
      const data = await allocationService.createAllocation(payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Error creating allocation"
      );
    }
  }
);



// =================== FETCH ALL ALLOCATIONS ===================

export const fetchAllocations = createAsyncThunk(
  "allocation/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await allocationService.fetchAllocations();
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Error fetching allocations"
      );
    }
  }
);



// =================== FETCH CUSTOMER ALLOCATIONS ===================

export const fetchCustomerAllocations = createAsyncThunk(
  "allocation/fetchCustomerAllocations",
  async (customerId: number, { rejectWithValue }) => {
    try {
      const data = await allocationService.fetchCustomerAllocations(customerId);
      return data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Error fetching customer allocations"
      );
    }
  }
);



// =================== DELETE ALLOCATION ===================

export const deleteAllocation = createAsyncThunk(
  "allocation/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await allocationService.deleteAllocation(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Error deleting allocation"
      );
    }
  }
);



// =================== SLICE ===================

const allocationSlice = createSlice({
  name: "allocation",
  initialState,
  reducers: {},
  extraReducers: (builder) => {

    // CREATE
    builder.addCase(addAllocation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(addAllocation.fulfilled, (state, action) => {
      state.loading = false;
      state.items.push(action.payload);
    });

    builder.addCase(addAllocation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });



    // FETCH ALL
    builder.addCase(fetchAllocations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(fetchAllocations.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
    });

    builder.addCase(fetchAllocations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });



    // FETCH CUSTOMER ALLOCATIONS
    builder.addCase(fetchCustomerAllocations.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchCustomerAllocations.fulfilled, (state, action) => {
      state.loading = false;
      state.allocations = action.payload || [];
    });

    builder.addCase(fetchCustomerAllocations.rejected, (state) => {
      state.loading = false;
    });



    // DELETE
    builder.addCase(deleteAllocation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(deleteAllocation.fulfilled, (state, action) => {
      state.loading = false;
      state.items = state.items.filter(
        (item) => item.recID !== action.payload
      );
    });

    builder.addCase(deleteAllocation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

  },
});

export default allocationSlice.reducer;