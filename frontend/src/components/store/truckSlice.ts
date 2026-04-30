import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import truckService from "../services/truckmaster";
import type { TruckPayload } from "../services/truckmaster";

/* ================= TYPES ================= */

export interface Truck {
  ID: number;
  truckNo: number;
  regoNo: number;
  modelNo: number;
  statusID: number;
  userID: number;
  srNO: number;
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

/* ================= FETCH ================= */

export const fetchTrucks = createAsyncThunk<Truck[]>(
  "truck/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await truckService.getAllTrucks();
      // console.log(res.data)
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch trucks"
      );
    }
  }
);

/* ================= CREATE ================= */

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

/* ================= UPDATE ================= */

export const updateTruck = createAsyncThunk<
  Truck,
  { id: number; payload: TruckPayload },
  { rejectValue: string }
>("truck/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await truckService.updateTruck(id, payload);

    console.log("UPDATED FROM SERVER:", res.data);

    return res.data;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Failed to update truck"
    );
  }
});


/* ================= DELETE ================= */

export const deleteTruck = createAsyncThunk<number, number>(
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

/* ================= SLICE ================= */

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

      /* ===== FETCH ===== */
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

      /* ===== CREATE ===== */
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

      /* ===== UPDATE ===== */
      .addCase(updateTruck.pending, (state) => {
        state.loading = true;
      })

    builder.addCase(updateTruck.fulfilled, (state, action) => {
      const index = state.trucks.findIndex(
        (truck) => truck.ID === action.payload.ID
      );

      if (index !== -1) {
        state.trucks[index] = action.payload;
      }
    })

      .addCase(updateTruck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      /* ===== DELETE ===== */
      .addCase(deleteTruck.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTruck.fulfilled, (state, action) => {
        state.loading = false;
        state.trucks = state.trucks.filter(
          (t) => t.ID !== action.payload
        );
      })
      .addCase(deleteTruck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetTruckState } = truckSlice.actions;
export default truckSlice.reducer;
