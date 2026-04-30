import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import UserService from "../services/userServices";

/* =======================
   TYPES
======================= */

export interface UserSession {
   // employee
  userID?: number;
  compID?: number;

  // new unified login type
  userTY?: "EMPLOYEE" | "CUSTOMER" | "AD";

  // customer
  customerID?: number;
  companyID?: number;
  // userTY: string;
  userNM: string;
  userEM?: string;
  deptNM?: string;
  compNM?: string;
}

interface UserState {
  userInfo: UserSession | null;
  token: string;
  userPc: string;
  userID?: number;
  companyID?: number;
  loading: boolean;
  error: string | null;
}

/* =======================
   INITIAL STATE
======================= */

const initialState: UserState = {
  userInfo: null,
  token: localStorage.getItem("token") || "",
  userPc: localStorage.getItem("userSelectedPc") || "",
  userID: localStorage.getItem("userID")
    ? Number(localStorage.getItem("userID"))
    : undefined,
  companyID: localStorage.getItem("companyID")
    ? Number(localStorage.getItem("companyID"))
    : undefined,
  loading: false,
  error: null,
};

/* =======================
   LOGIN
======================= */
export const userLogin = createAsyncThunk<
  {
    token: string;
    user: UserSession;
    userID: number | undefined;
    companyID: number | undefined;
  },
  any,
  { rejectValue: string }
>("login/userLogin", async (payload, thunkAPI) => {
  try {
    const res = await UserService.signInUser(payload);
    const response = res?.data || res;
    const session: UserSession = response.sessionData;

    if (!response?.token) {
      return thunkAPI.rejectWithValue("Invalid username or password");
    }

    // ===============================
    // STORE TOKEN
    // ===============================
    localStorage.setItem("token", response.token);

    // ===============================
    // STORE LOGIN TYPE
    // ===============================
    if (session.userTY) {
      localStorage.setItem("userTY", session.userTY);
    }

    // ===============================
    // EMPLOYEE / ADMIN
    // ===============================
    if (session.userID) {
      localStorage.setItem("userID", String(session.userID));
    }

    if (session.compID !== undefined) {
      localStorage.setItem("companyID", String(session.compID));
    }

    // ===============================
    // CUSTOMER
    // ===============================
    if (session.customerID) {
      localStorage.setItem("customerID", String(session.customerID));
    }

    if (session.companyID !== undefined) {
      localStorage.setItem("companyID", String(session.companyID));
    }

    return {
      token: response.token,
      user: session,
      userID: session.userID || session.customerID,
      companyID: session.compID || session.companyID,
    };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(
      err?.response?.data?.message || "Login failed"
    );
  }
});

/* =======================
   LOGOUT
======================= */

export const userLogout = createAsyncThunk(
  "login/userLogout",
  async () => {
    await UserService.logoutUser();
    localStorage.removeItem("token");
    localStorage.removeItem("userSelectedPc");
    localStorage.removeItem("userID");
    localStorage.removeItem("companyID");
    return true;
  }
);

/* =======================
   SLICE
======================= */

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    setUserPC: (state, action: PayloadAction<string>) => {
      state.userPc = action.payload;
      localStorage.setItem("userSelectedPc", action.payload);
    },

    signoutUser: (state) => {
      state.userInfo = null;
      state.token = "";
      state.userPc = "";
      state.userID = undefined;
      state.companyID = undefined;

      localStorage.removeItem("token");
      localStorage.removeItem("userSelectedPc");
      localStorage.removeItem("userID");
      localStorage.removeItem("companyID");
    },
  },

  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(userLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(userLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.userInfo = action.payload.user;
        state.userID = action.payload.userID;
        state.companyID = action.payload.companyID;
      })

      .addCase(userLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      })

      // LOGOUT
      .addCase(userLogout.fulfilled, (state) => {
        state.userInfo = null;
        state.token = "";
        state.userPc = "";
        state.userID = undefined;
        state.companyID = undefined;
      });
  },
});

/* =======================
   EXPORTS
======================= */

export const { setUserPC, signoutUser } = loginSlice.actions;
export default loginSlice.reducer;
