import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../layout';
import HomeSection from '../dashbord';
import Login from '../login/login';
import SignUp from '../login/signUp';
import ForgotPassword from '../login/forgot-password';
import ChangePassword from "../setting/changepassword";
import Livelocation from "../Locations/livelocation";
import TruckDetail from "../trucks/TruckDetail";
import ProtectedRoute from './protectedRoute';
import CommingSoon from '../coming-soon';
import CustomerList from "../customers/CustomerList";
import CustomerNew from "../customers/CustomerNew";
import CustomerDetail from "../customers/CustomerDetail";
import GatewayList from "../gateways/GatewayList";
import GatewayNew from "../gateways/GatewayNew";

// Stage 3e: old master pages superseded; the legacy paths redirect.
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <HomeSection /> },
          { path: 'dashboard', element: <HomeSection /> },
          { path: 'changepassword', element: <ChangePassword /> },
          { path: 'livelocation', element: <Livelocation /> },

          // Stage 3e admin CRUD
          { path: 'customers', element: <CustomerList /> },
          { path: 'customers/new', element: <CustomerNew /> },
          { path: 'customers/:id', element: <CustomerDetail /> },
          { path: 'gateways', element: <GatewayList /> },
          { path: 'gateways/new', element: <GatewayNew /> },

          // Vehicle detail (keep both /trucks/:id and /vehicles/:id for now)
          { path: 'trucks/:id', element: <TruckDetail /> },
          { path: 'vehicles/:id', element: <TruckDetail /> },

          // Redirects for old master pages
          { path: 'customer', element: <Navigate to="/customers" replace /> },
          { path: 'Createcustomermaster', element: <Navigate to="/customers/new" replace /> },
          { path: 'truckmaster', element: <Navigate to="/customers" replace /> },
          { path: 'createtruckmaster', element: <Navigate to="/customers" replace /> },
          { path: 'edit-truck/:id', element: <Navigate to="/customers" replace /> },
          { path: 'devicemaster', element: <Navigate to="/gateways" replace /> },
          { path: 'Createdevicemaster', element: <Navigate to="/gateways/new" replace /> },
          { path: 'edit-device/:id', element: <Navigate to="/gateways" replace /> },
          { path: 'edit-customer/:id', element: <Navigate to="/customers" replace /> },
          { path: 'allocationmaster', element: <Navigate to="/customers" replace /> },
          { path: 'createallocationmaster', element: <Navigate to="/customers" replace /> },

          { path: '*', element: <CommingSoon /> },
        ],
      },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/sign-up', element: <SignUp /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '*', element: <Login /> },
]);

export default router;
