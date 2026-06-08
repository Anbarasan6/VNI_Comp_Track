import React from 'react';

const STATUS_CONFIG = {
  REQUESTED: { label: 'Requested', cls: 'badge-status-requested' },
  APPROVED: { label: 'Approved', cls: 'badge-status-approved' },
  DISPATCHED: { label: 'Dispatched', cls: 'badge-status-dispatched' },
  DELIVERED: { label: 'Delivered', cls: 'badge-status-delivered' },
  REJECTED: { label: 'Rejected', cls: 'badge-status-rejected' },
};

export default function StatusBadge({ status }) {
  if (!status) return <span className="badge bg-secondary">Unknown</span>;
  const config = STATUS_CONFIG[status.toUpperCase()] || {
    label: status,
    cls: 'bg-secondary',
  };
  return (
    <span className={`badge ${config.cls}`} style={{ fontSize: '0.75rem', padding: '0.35em 0.65em' }}>
      {config.label}
    </span>
  );
}
