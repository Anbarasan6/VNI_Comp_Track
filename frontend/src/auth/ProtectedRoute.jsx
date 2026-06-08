import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * ProtectedRoute - wraps protected pages
 * Props:
 *   roles: array of allowed roles (e.g. ['admin', 'manager'])
 *   children: the page component
 */
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh', background: '#f8f9fa' }}
      >
        <div className="text-center">
          <div
            className="spinner-border"
            style={{ color: 'var(--vni-primary)', width: '3rem', height: '3rem' }}
            role="status"
          />
          <p className="mt-3 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh', background: '#f8f9fa' }}
      >
        <div className="text-center">
          <div className="mb-3">
            <i className="bi bi-shield-exclamation text-danger" style={{ fontSize: '3rem' }} />
          </div>
          <h4 className="text-danger">Access Denied</h4>
          <p className="text-muted">You do not have permission to view this page.</p>
          <a href="/" className="btn btn-outline-secondary mt-2">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return children;
}
