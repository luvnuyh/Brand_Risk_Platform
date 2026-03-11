import { Routes, Route } from "react-router-dom";

import Layout from "../components/Layout";

import Features from "../pages/Features";
import Result from "../pages/Result";
import Login from "../pages/Login";
import Signup from "../pages/Signup";

import DemoInput from "../pages/DemoInput";
import DemoLoading from "../pages/DemoLoading";
import DemoResult from "../pages/DemoResult";

import Dashboard from "../pages/Dashboard";

import Settings from "../pages/Settings";
import ActivityLogs from "../pages/ActivityLogs";
import Team from "../pages/Team";
import Alerts from "../pages/Alerts";

import PrivateRoute from "./PrivateRoute";

export default function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>

        {/* Public Pages */}
        <Route path="/" element={<Features />} />
        <Route path="/features" element={<Features />} />

        <Route path="/result" element={<Result />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Demo */}
        <Route path="/demo" element={<DemoInput />} />
        <Route path="/demo-loading" element={<DemoLoading />} />
        <Route path="/demo-result" element={<DemoResult />} />

        {/* Protected Pages */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings/activity-logs"
          element={
            <PrivateRoute>
              <ActivityLogs />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings/team"
          element={
            <PrivateRoute>
              <Team />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings/alerts"
          element={
            <PrivateRoute>
              <Alerts />
            </PrivateRoute>
          }
        />

      </Route>
    </Routes>
  );
}