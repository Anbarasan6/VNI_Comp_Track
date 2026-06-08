import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { getRoleBadgeClass, humanizeRole } from '../utils/formatters';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar vni-navbar shadow-sm">
      <div className="container-fluid d-flex align-items-center justify-content-between px-3">
        {/* Left: Toggle + Brand */}
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-sm text-white border-0 d-md-none"
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            <i className="bi bi-list fs-4" />
          </button>
          <div className="brand-text">
            <span style={{ color: '#c8a45a' }}>VNI</span>
            <span className="ms-1">Publications</span>
          </div>
          <span
            className="text-white-50 d-none d-md-inline"
            style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}
          >
            Complimentary Copy Tracking System
          </span>
        </div>

        {/* Right: User info + Logout */}
        <div className="d-flex align-items-center gap-2">
          <span className="text-white d-none d-sm-inline" style={{ fontSize: '0.875rem' }}>
            {user?.name || user?.email}
          </span>
          {user?.role && (
            <span className={`badge ${getRoleBadgeClass(user.role)}`}>
              {humanizeRole(user.role)}
            </span>
          )}
          <button
            className="btn btn-sm btn-outline-light ms-2"
            onClick={logout}
            title="Sign Out"
          >
            <i className="bi bi-box-arrow-right me-1" />
            <span className="d-none d-sm-inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
