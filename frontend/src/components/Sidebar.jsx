import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const salesMenu = [
  { to: '/sales/create-request', icon: 'bi-plus-circle', label: 'Create Request' },
  { to: '/sales/my-tracking', icon: 'bi-list-check', label: 'My Tracking' },
];

const managerMenu = [
  { to: '/manager/pending', icon: 'bi-hourglass-split', label: 'Pending Requests' },
  { to: '/manager/approved', icon: 'bi-check-circle', label: 'Approved Requests' },
];

const adminMenu = [
  { to: '/admin/professors', icon: 'bi-person-lines-fill', label: 'Professors' },
  { to: '/admin/books', icon: 'bi-book', label: 'Books' },
  { to: '/admin/letters-dispatch', icon: 'bi-envelope-paper', label: 'Letters & Dispatch' },
  { to: '/admin/faculty-info-forms', icon: 'bi-file-earmark-person', label: 'Faculty Info Forms' },
  { to: '/admin/tracking', icon: 'bi-bar-chart-steps', label: 'Complete Tracking' },
  { to: '/admin/users', icon: 'bi-person-gear', label: 'User Management' },
];

function MenuSection({ title, items }) {
  return (
    <>
      <div className="nav-section-title">{title}</div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <i className={`bi ${item.icon}`} />
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export default function Sidebar({ show, onHide }) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <>
      {/* Backdrop for mobile */}
      {show && (
        <div
          className="d-md-none position-fixed inset-0"
          style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={onHide}
        />
      )}

      <aside className={`vni-sidebar ${show ? 'show' : ''}`}>
        <nav className="nav flex-column pt-2">
          {role === 'sales_rep' && (
            <MenuSection title="Sales" items={salesMenu} />
          )}
          {role === 'manager' && (
            <MenuSection title="Manager" items={managerMenu} />
          )}
          {role === 'admin' && (
            <MenuSection title="Admin" items={adminMenu} />
          )}
        </nav>
      </aside>
    </>
  );
}
