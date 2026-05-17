import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import positionService from "../services/positionService";

// bigint columns (id, device_id) come over the wire as strings; never parseInt them.
// device_type is joined in by the API (defaults to "WIRED" if missing).
export interface Position {
  id: string;
  device_id: string;
  recorded_at: string;
  received_at: string;
  lat: number;
  lng: number;
  speed_kph: number | null;
  heading_deg: number | null;
  altitude_m: number | null;
  satellites: number | null;
  signal_strength: number | null;
  battery_voltage: number | null;
  mileage_m: number | null;
  telemetry: Record<string, unknown>;
  device_type: "WIRED" | "MAGNETIC_BATTERY" | "ASSET_TRACKER";
}

interface PositionState {
  latest: Position[];
  history: Position[];
  loading: boolean;
  error: string | null;
}

const initialState: PositionState = {
  latest: [],
  history: [],
  loading: false,
  error: null,
};

export const fetchLatestPositions = createAsyncThunk<Position[], number | undefined>(
  "position/fetchLatest",
  async (limit, { rejectWithValue }) => {
    try {
      const res = await positionService.getLatestPositions(limit);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch latest positions"
      );
    }
  }
);

export const fetchPositionsForDevice = createAsyncThunk<
  Position[],
  { deviceId: string; from: string; to: string }
>("position/fetchForDevice", async ({ deviceId, from, to }, { rejectWithValue }) => {
  try {
    const res = await positionService.getPositionsForDevice(deviceId, from, to);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || err.message || "Failed to fetch positions"
    );
  }
});

const positionSlice = createSlice({
  name: "position",
  initialState,
  reducers: {
    clearPositionHistory: (state) => {
      state.history = [];
    },
    resetPositionState: (state) => {
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLatestPositions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLatestPositions.fulfilled, (state, action: PayloadAction<Position[]>) => {
        state.loading = false;
        state.latest = action.payload;
      })
      .addCase(fetchLatestPositions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchPositionsForDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPositionsForDevice.fulfilled, (state, action: PayloadAction<Position[]>) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchPositionsForDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPositionHistory, resetPositionState } = positionSlice.actions;
export default positionSlice.reducer;
