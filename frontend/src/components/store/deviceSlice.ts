import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import deviceService from "../services/deviceService";
import type { DevicePayload } from "../services/deviceService";

// v2 devices row shape. bigint columns (id, account_id, truck_id) arrive as strings.
export interface Device {
  id: string;
  terminal_id: string;
  imei: string | null;
  account_id: string | null;
  truck_id: string | null;
  auth_code: string | null;
  firmware_version: string | null;
  model: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DeviceState {
  devices: Device[];
  loading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: DeviceState = {
  devices: [],
  loading: false,
  error: null,
  success: false,
};

export const fetchDevices = createAsyncThunk<Device[]>(
  "device/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await deviceService.getAllDevices();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch devices");
    }
  }
);

// Mutation thunks remain so existing form components compile. Backend /api/devices
// is GET-only in Stage 3, so these will reject at runtime. Forms are hidden via
// ENABLE_MUTATIONS until Stage 4 reintroduces write endpoints.
export const createDevice = createAsyncThunk<Device, DevicePayload>(
  "device/create",
  async (deviceData, { rejectWithValue }) => {
    try {
      const res = await deviceService.createDevice(deviceData);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || "Failed to create device");
    }
  }
);

export const updateDevice = createAsyncThunk<
  Device,
  { id: string; data: Partial<DevicePayload> }
>("device/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await deviceService.updateDevice(id, data);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.message || "Failed to update device");
  }
});

export const deleteDevice = createAsyncThunk<string, string>(
  "device/delete",
  async (id, { rejectWithValue }) => {
    try {
      await deviceService.deleteDevice(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete device");
    }
  }
);

const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    resetDeviceState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(fetchDevices.fulfilled, (state, action: PayloadAction<Device[]>) => {
        state.loading = false;
        state.devices = action.payload;
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createDevice.fulfilled, (state, action: PayloadAction<Device>) => {
        state.loading = false;
        state.devices.push(action.payload);
        state.success = true;
      })
      .addCase(createDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.success = false;
      })

      .addCase(updateDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateDevice.fulfilled, (state, action: PayloadAction<Device>) => {
        state.loading = false;
        state.devices = state.devices.map((d) =>
          d.id === action.payload.id ? action.payload : d
        );
        state.success = true;
      })
      .addCase(updateDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.success = false;
      })

      .addCase(deleteDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteDevice.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.devices = state.devices.filter((d) => d.id !== action.payload);
        state.success = true;
      })
      .addCase(deleteDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.success = false;
      });
  },
});

export const { resetDeviceState } = deviceSlice.actions;
export default deviceSlice.reducer;
