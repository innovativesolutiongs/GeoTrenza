import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import loginSlice from './loginSlice';
import loginReducer from './loginSlice';
import customersReducer from "./customerSlice";
import customercreateReducer from "./customercreateSlice";
import changePasswordReducer from "./changePasswordSlice";
import truckReducer from "./truckSlice";
import deviceReducer from "./deviceSlice";
import allocationReducer from "./allocationslice";
import positionReducer from "./positionSlice";
import eventReducer from "./eventSlice";




const rootReducer = combineReducers({
    user: loginSlice,
    login: loginReducer,
    customers: customersReducer,
    customercreate: customercreateReducer,
    changePassword: changePasswordReducer,
    truck: truckReducer,
    device: deviceReducer,
    allocation: allocationReducer,
    position: positionReducer,
    event: eventReducer,
});

const persistConfig = {
    key: 'root',
    storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
        }),


});
export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>
export const persistor = persistStore(store);


