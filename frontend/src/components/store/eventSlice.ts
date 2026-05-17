import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import eventService from "../services/eventService";

// bigint columns serialized as strings.
export interface FleetEvent {
  id: string;
  device_id: string;
  position_id: string | null;
  kind: string;
  payload: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

interface EventState {
  events: FleetEvent[];
  loading: boolean;
  error: string | null;
}

const initialState: EventState = {
  events: [],
  loading: false,
  error: null,
};

export const fetchEventsForDevice = createAsyncThunk<
  FleetEvent[],
  { deviceId: string; from: string; to: string }
>("event/fetchForDevice", async ({ deviceId, from, to }, { rejectWithValue }) => {
  try {
    const res = await eventService.getEventsForDevice(deviceId, from, to);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || err.message || "Failed to fetch events"
    );
  }
});

const eventSlice = createSlice({
  name: "event",
  initialState,
  reducers: {
    clearEvents: (state) => {
      state.events = [];
    },
    resetEventState: (state) => {
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventsForDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventsForDevice.fulfilled, (state, action: PayloadAction<FleetEvent[]>) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchEventsForDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEvents, resetEventState } = eventSlice.actions;
export default eventSlice.reducer;
