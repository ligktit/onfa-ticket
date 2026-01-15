import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ClientApp from "./pages/ClientApp";
import AdminApp from "./pages/AdminApp";
import LoginPage from "./pages/LoginPage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("admin_authenticated") === "true";
  return isAuthenticated ? children : <Navigate to="/admin/login" replace />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Client Route - Public */}
        <Route path="/" element={<ClientApp />} />

        {/* Admin Login Route */}
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Admin Routes - Protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminApp />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
