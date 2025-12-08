import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Index";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Logistics from "./pages/Logistics";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;