import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <Sidebar show={sidebarOpen} onHide={() => setSidebarOpen(false)} />
      <main className="vni-main-content">
        {children}
      </main>
    </div>
  );
}
