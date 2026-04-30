import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import deviceService from "../services/deviceService";
import type { DevicePayload } from "../services/deviceService";


export interface Device {
  device_ID: number;
  deviceNo: string;
  deviceName: string;
  statusID: string;
  userID?: number;
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

// ====== ASYNC THUNKS ======
export const fetchDevices = createAsyncThunk<Device[]>(
  "device/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await deviceService.getAllDevices();
      // console.log(res.data)
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch devices");
    }
  }
);

export const createDevice = createAsyncThunk<Device, DevicePayload>(
  "device/create",
  async (deviceData, { rejectWithValue }) => {
    try {
      const res = await deviceService.createDevice(deviceData);
      console.log(res.data)
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || "Failed to create device");
    }
  }
);

export const updateDevice = createAsyncThunk<
  Device,
  { id: number; data: Partial<DevicePayload> }
>("device/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await deviceService.updateDevice(id, data);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.message || "Failed to update device");
  }
});

export const deleteDevice = createAsyncThunk<number, number>(
  "device/delete",
  async (device_ID, { rejectWithValue }) => {
    try {
      await deviceService.deleteDevice(device_ID);
      return device_ID;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete device");
    }
  }
);

// ====== SLICE ======
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
      // FETCH
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

      // CREATE
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

      // UPDATE
      .addCase(updateDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateDevice.fulfilled, (state, action: PayloadAction<Device>) => {
        state.loading = false;
        state.devices = state.devices.map((d) =>
          d.device_ID === action.payload.device_ID ? action.payload : d
        );
        state.success = true;
      })
      .addCase(updateDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.success = false;
      })

      // DELETE
      .addCase(deleteDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteDevice.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.devices = state.devices.filter((device) => device.device_ID !== action.payload);
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
