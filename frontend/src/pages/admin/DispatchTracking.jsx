import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/axios';
import { formatDate, formatBooks, formatRequestNo } from '../../utils/formatters';

export default function DispatchTracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: {
          status: 'APPROVED,DISPATCHED',
          delivery_type: 'OFFICE_DISPATCH',
          page,
          per_page: perPage,
          search: search || undefined,
          order_by: 'created_at',
          order_dir: 'asc',
        },
      });
      const d = res.data;
      setData(d.items || d.data || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkDispatched = async (row) => {
    if (!window.confirm(`Mark request ${row.request_no} as DISPATCHED?`)) return;
    setActionLoading((p) => ({ ...p, [row.id]: 'dispatching' }));
    try {
      await api.put(`/requests/${row.id}/dispatch`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading((p) => { const n = { ...p }; delete n[row.id]; return n; });
    }
  };

  const handleMarkDelivered = async (row) => {
    if (!window.confirm(`Mark request ${row.request_no} as DELIVERED?`)) return;
    setActionLoading((p) => ({ ...p, [row.id]: 'delivering' }));
    try {
      await api.put(`/requests/${row.id}/deliver`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading((p) => { const n = { ...p }; delete n[row.id]; return n; });
    }
  };

  const columns = [
    {
      key: '__queue__',
      label: '#',
      render: (_, row, idx) => {
        // Calculate queue position from page offset
        const queuePos = (page - 1) * perPage + (data.indexOf(row) + 1);
        return (
          <span
            className="badge rounded-pill"
            style={{ background: 'var(--vni-primary)', color: '#fff', minWidth: '2rem' }}
          >
            {queuePos}
          </span>
        );
      },
    },
    {
      key: 'request_no',
      label: 'Request No',
      render: (v) => <span className="fw-medium">{formatRequestNo(v)}</span>,
    },
    {
      key: 'professor',
      label: 'Professor',
      render: (_, row) => row.professor?.name || '—',
    },
    {
      key: 'college',
      label: 'College',
      render: (_, row) => row.professor?.college_name || row.professor?.college || '—',
    },
    {
      key: 'books',
      label: 'Books',
      render: (_, row) => {
        const text = formatBooks(row.books || row.request_books || []);
        return <span title={text} style={{ maxWidth: 180, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>;
      },
    },
    {
      key: 'created_at',
      label: 'Request Date',
      render: (v) => formatDate(v),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusBadge status={v} />,
    },
  ];

  const renderActions = (row) => {
    const busy = actionLoading[row.id];
    if (row.status === 'APPROVED') {
      return (
        <button
          className="btn btn-sm btn-primary"
          style={{ fontSize: '0.75rem' }}
          onClick={(e) => { e.stopPropagation(); handleMarkDispatched(row); }}
          disabled={!!busy}
        >
          {busy === 'dispatching' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-truck me-1" />}
          Mark Dispatched
        </button>
      );
    }
    if (row.status === 'DISPATCHED') {
      return (
        <button
          className="btn btn-sm btn-success"
          style={{ fontSize: '0.75rem' }}
          onClick={(e) => { e.stopPropagation(); handleMarkDelivered(row); }}
          disabled={!!busy}
        >
          {busy === 'delivering' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-all me-1" />}
          Mark Delivered
        </button>
      );
    }
    return <span className="text-muted small">—</span>;
  };

  // Override columns to include queue position
  const columnsWithQueue = [
    {
      key: '__queue_pos__',
      label: '#',
      render: (_, row) => {
        const idx = data.indexOf(row);
        const pos = (page - 1) * perPage + idx + 1;
        return (
          <span className="badge rounded-pill" style={{ background: 'var(--vni-primary)', color: '#fff', minWidth: '2rem' }}>
            {pos}
          </span>
        );
      },
    },
    ...columns.slice(1),
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-truck me-2" />
          Dispatch Tracking
        </h1>
        <span className="badge bg-info text-dark">FIFO Queue</span>
      </div>

      <div className="alert alert-light border mb-3 py-2 small">
        <i className="bi bi-info-circle me-2 text-primary" />
        Requests are processed in FIFO order (oldest approved first). Mark as Dispatched once sent, then Delivered on confirmation.
      </div>

      <DataTable
        columns={columnsWithQueue}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        actions={renderActions}
        rowKey="id"
        emptyMessage="No pending dispatch requests."
      />
    </Layout>
  );
}
