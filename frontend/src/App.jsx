import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

// Pages
import Login from './pages/Login';
import FacultyInfoForm from './pages/public/FacultyInfoForm';

// Sales
import CreateRequest from './pages/sales/CreateRequest';
import MyTracking from './pages/sales/MyTracking';

// Manager
import PendingRequests from './pages/manager/PendingRequests';
import ApprovedRequests from './pages/manager/ApprovedRequests';

// Admin
import ProfessorMaster from './pages/admin/ProfessorMaster';
import BookMaster from './pages/admin/BookMaster';
import LettersDispatch from './pages/admin/LettersDispatch';
import FacultyInfoForms from './pages/admin/FacultyInfoForms';
import CompleteTracking from './pages/admin/CompleteTracking';
import UserManagement from './pages/admin/UserManagement';

function RoleHome() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" style={{ color: 'var(--vni-primary)' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/professors" replace />;
    case 'manager':
      return <Navigate to="/manager/pending" replace />;
    case 'sales_rep':
    default:
      return <Navigate to="/sales/create-request" replace />;
  }
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/faculty-info-form" element={<FacultyInfoForm />} />

      {/* Root redirect */}
      <Route path="/" element={<RoleHome />} />

      {/* Sales Rep routes */}
      <Route
        path="/sales/create-request"
        element={
          <ProtectedRoute roles={['sales_rep', 'admin']}>
            <CreateRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/my-tracking"
        element={
          <ProtectedRoute roles={['sales_rep']}>
            <MyTracking />
          </ProtectedRoute>
        }
      />

      {/* Manager routes */}
      <Route
        path="/manager/pending"
        element={
          <ProtectedRoute roles={['manager', 'admin']}>
            <PendingRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/approved"
        element={
          <ProtectedRoute roles={['manager', 'admin']}>
            <ApprovedRequests />
          </ProtectedRoute>
        }
      />


      {/* Admin routes */}
      <Route
        path="/admin/professors"
        element={
          <ProtectedRoute roles={['admin']}>
            <ProfessorMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/books"
        element={
          <ProtectedRoute roles={['admin']}>
            <BookMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/letters-dispatch"
        element={
          <ProtectedRoute roles={['admin']}>
            <LettersDispatch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/faculty-info-forms"
        element={
          <ProtectedRoute roles={['admin']}>
            <FacultyInfoForms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tracking"
        element={
          <ProtectedRoute roles={['admin']}>
            <CompleteTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
