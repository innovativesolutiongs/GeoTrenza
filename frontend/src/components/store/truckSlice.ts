import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import truckService from "../services/truckmaster";
import type { TruckPayload } from "../services/truckmaster";

// v2 trucks row shape. bigint columns (id, account_id) arrive as strings.
export interface Truck {
  id: string;
  account_id: string;
  registration_no: string;
  name: string | null;
  model: string | null;
  vin: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TruckState {
  trucks: Truck[];
  loading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: TruckState = {
  trucks: [],
  loading: false,
  error: null,
  success: false,
};

export const fetchTrucks = createAsyncThunk<Truck[]>(
  "truck/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await truckService.getAllTrucks();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch trucks"
      );
    }
  }
);

// Mutation thunks: backend /api/trucks is GET-only in Stage 3 — these reject at
// runtime. Forms gated by ENABLE_MUTATIONS until Stage 4.
export const createTruck = createAsyncThunk<Truck, TruckPayload>(
  "truck/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await truckService.createTruck(payload);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to create truck"
      );
    }
  }
);

export const updateTruck = createAsyncThunk<
  Truck,
  { id: string; payload: TruckPayload },
  { rejectValue: string }
>("truck/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await truckService.updateTruck(id, payload);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Failed to update truck"
    );
  }
});

export const deleteTruck = createAsyncThunk<string, string>(
  "truck/delete",
  async (id, { rejectWithValue }) => {
    try {
      await truckService.deleteTruck(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to delete truck"
      );
    }
  }
);

const truckSlice = createSlice({
  name: "truck",
  initialState,
  reducers: {
    resetTruckState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrucks.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(fetchTrucks.fulfilled, (state, action: PayloadAction<Truck[]>) => {
        state.loading = false;
        state.trucks = action.payload;
      })
      .addCase(fetchTrucks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createTruck.pending, (state) => {
        state.loading = true;
        state.success = false;
      })
      .addCase(createTruck.fulfilled, (state, action: PayloadAction<Truck>) => {
        state.loading = false;
        state.success = true;
        state.trucks.push(action.payload);
      })
      .addCase(createTruck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(updateTruck.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTruck.fulfilled, (state, action: PayloadAction<Truck>) => {
        const index = state.trucks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) state.trucks[index] = action.payload;
      })
      .addCase(updateTruck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(deleteTruck.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTruck.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.trucks = state.trucks.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTruck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetTruckState } = truckSlice.actions;
export default truckSlice.reducer;
