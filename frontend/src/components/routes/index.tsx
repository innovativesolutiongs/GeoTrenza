import { createBrowserRouter } from 'react-router-dom';
import Layout from '../layout';
import HomeSection from '../dashbord';
import Login from '../login/login';
import SignUp from '../login/signUp';
import ForgotPassword from '../login/forgot-password';
import Customer from "../customer";
import ChangePassword from "../setting/changepassword";
import TruckMaster from "../TruckMaster";
import DeviceMaster from "../DeviceMaster";
import AllocationMaster from "../AllocationMaster";
import Createallocationmaster from "../AllocationMaster/createallocationmaster";
import Edittruckmaster from "../TruckMaster/Edittruck";
import Createdevicemaster from "../DeviceMaster/createdevicemaster";
import Createtruckmaster from "../TruckMaster/createtruckmaster";
import Createcustomermaster from "../customer/createcustomer";
import EditcustomerMaster from "../customer/Editcustomer";
import EditDeviceMaster from "../DeviceMaster/Editdevice";
import Livelocation from "../Locations/livelocation";
import TruckRoutes from "../Locations/truckroutes";
import ProtectedRoute from './protectedRoute';
import CommingSoon from '../coming-soon';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />, // Ensure Layout wraps all child routes
        children: [
          {
            index: true, // This will render HomeSection at the root path
            element: <HomeSection />,
          },
          {
            path: 'dashboard',
            element: <HomeSection />, // Displayed within Layout
          },
          {
            path: 'customer',
            element: <Customer />, // Displayed within Layout
          },
          {
            path: 'changepassword',
            element: <ChangePassword />, // Displayed within Layout
          },
          {
            path: 'truckmaster',
            element: <TruckMaster />, // Displayed within Layout
          },
          {
            path: 'createallocationmaster',
            element: <Createallocationmaster />, // Displayed within Layout
          },
          {
            path: 'Createdevicemaster',
            element: <Createdevicemaster />, // Displayed within Layout
          },
          {
            path: 'truckmaster',
            element: <TruckMaster />, // Displayed within Layout
          },
          {
            path: 'edit-truck/:id',
            element: <Edittruckmaster />, // Displayed within Layout
          },

          {
            path: 'allocationmaster',
            element: <AllocationMaster />, // Displayed within Layout
          },
          {
            path: 'devicemaster',
            element: <DeviceMaster />, // Displayed within Layout
          },
          {
            path: 'edit-device/:id',
            element: <EditDeviceMaster />, // Displayed within Layout
          },

          {
            path: 'edit-customer/:id',
            element: <EditcustomerMaster />, // Displayed within Layout
          },
          {
            path: 'createtruckmaster',
            element: <Createtruckmaster />, // Displayed within Layout
          },
          {
            path: 'Createcustomermaster',
            element: <Createcustomermaster />, // Displayed within Layout
          },
          {
            path: 'livelocation',
            element: <Livelocation />, // Displayed within Layout
          },

          {
            path: 'truckroutes',
            element: <TruckRoutes />, // Displayed within Layout
          },

          {
            path: '*',
            element: <CommingSoon />, // Display a NotFound component for unmatched routes
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <Login />, // No header here
  },
  {
    path: '/sign-up',
    element: <SignUp />, // No header here
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '*',
    element: <Login />, // Display a NotFound component for unmatched routes
  },
]);


export default router;
