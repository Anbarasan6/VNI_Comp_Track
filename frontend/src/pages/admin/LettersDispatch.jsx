import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import LetterEditorModal from '../../components/LetterEditorModal.jsx';
import api from '../../api/axios.js';
import { formatDate, formatBooks, formatRequestNo } from '../../utils/formatters.js';

export default function LettersDispatch() {
  const [activeTab, setActiveTab] = useState('letters');

  const tabs = [
    { key: 'letters',  icon: 'bi-envelope-paper', label: 'Approval Letters' },
    { key: 'dispatch', icon: 'bi-truck',            label: 'Dispatch Queue' },
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-envelope-paper me-2" />
          Letters &amp; Dispatch
        </h1>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4" style={{ borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map(t => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link fw-medium ${activeTab === t.key ? 'active' : ''}`}
              style={activeTab === t.key ? { color: 'var(--vni-primary)', borderBottomColor: 'var(--vni-primary)' } : {}}
              onClick={() => setActiveTab(t.key)}
            >
              <i className={`bi ${t.icon} me-2`} />{t.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'letters'  && <LettersTab />}
      {activeTab === 'dispatch' && <DispatchTab />}
    </Layout>
  );
}

/* ─── Letters Tab ─────────────────────────────────────────────────────────── */
function LettersTab() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [search, setSearch]   = useState('');
  const [letterModal, setLetterModal] = useState({ show: false, requestId: null, requestData: null });
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: { status: 'APPROVED', delivery_type: 'OFFICE_DISPATCH', page, per_page: perPage, search: search || undefined },
      });
      const d = res.data;
      setData(d.data || d.items || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { key: 'request_no', label: 'Request No', render: v => <span className="fw-medium">{formatRequestNo(v)}</span> },
    { key: 'professor',  label: 'Professor',  render: (_, r) => r.professor?.name || '—' },
    { key: 'college',    label: 'College',    render: (_, r) => r.professor?.college_name || '—' },
    { key: 'books',      label: 'Books',      render: (_, r) => {
      const txt = formatBooks(r.books || []);
      return <span title={txt} style={{ maxWidth: 180, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txt}</span>;
    }},
    { key: 'sales_rep_name', label: 'Sales Rep', render: v => v || '—' },
    { key: 'created_at', label: 'Date', render: v => formatDate(v) },
  ];

  const renderActions = (row) => (
    <button
      className="btn btn-sm btn-primary"
      style={{ fontSize: '0.75rem' }}
      onClick={(e) => { e.stopPropagation(); setLetterModal({ show: true, requestId: row.id, requestData: row }); }}
    >
      <i className="bi bi-envelope-paper me-1" />Generate Letter
    </button>
  );

  return (
    <>
      <DataTable
        columns={columns} data={data} loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={q => { setSearch(q); setPage(1); }}
        actions={renderActions} rowKey="id"
        emptyMessage="No approved requests pending letters."
      />
      <LetterEditorModal
        show={letterModal.show}
        onHide={() => { setLetterModal({ show: false, requestId: null, requestData: null }); fetchData(); }}
        requestId={letterModal.requestId}
        requestData={letterModal.requestData}
      />
    </>
  );
}

/* ─── Dispatch Tab ────────────────────────────────────────────────────────── */
function DispatchTab() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [search, setSearch]       = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: {
          status: 'APPROVED,DISPATCHED', delivery_type: 'OFFICE_DISPATCH',
          page, per_page: perPage, search: search || undefined,
          order_by: 'created_at', order_dir: 'asc',
        },
      });
      const d = res.data;
      setData(d.data || d.items || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (row, action) => {
    const label = action === 'dispatch' ? 'DISPATCHED' : 'DELIVERED';
    if (!window.confirm(`Mark ${row.request_no} as ${label}?`)) return;
    setActionLoading(p => ({ ...p, [row.id]: action }));
    try {
      await api.put(`/requests/${row.id}/${action}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[row.id]; return n; });
    }
  };

  const columns = [
    { key: '__pos__',    label: '#', render: (_, row) => {
      const pos = (page - 1) * perPage + data.indexOf(row) + 1;
      return <span className="badge rounded-pill" style={{ background: 'var(--vni-primary)', color: '#fff', minWidth: '2rem' }}>{pos}</span>;
    }},
    { key: 'request_no', label: 'Request No', render: v => <span className="fw-medium">{formatRequestNo(v)}</span> },
    { key: 'professor',  label: 'Professor',  render: (_, r) => r.professor?.name || '—' },
    { key: 'college',    label: 'College',    render: (_, r) => r.professor?.college_name || '—' },
    { key: 'books',      label: 'Books',      render: (_, r) => {
      const txt = formatBooks(r.books || []);
      return <span title={txt} style={{ maxWidth: 160, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txt}</span>;
    }},
    { key: 'created_at', label: 'Req Date', render: v => formatDate(v) },
    { key: 'status',     label: 'Status',   render: v => <StatusBadge status={v} /> },
  ];

  const renderActions = (row) => {
    const busy = actionLoading[row.id];
    if (row.status === 'APPROVED') return (
      <button className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem' }}
        onClick={e => { e.stopPropagation(); doAction(row, 'dispatch'); }} disabled={!!busy}>
        {busy === 'dispatch' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-truck me-1" />}
        Mark Dispatched
      </button>
    );
    if (row.status === 'DISPATCHED') return (
      <button className="btn btn-sm btn-success" style={{ fontSize: '0.75rem' }}
        onClick={e => { e.stopPropagation(); doAction(row, 'deliver'); }} disabled={!!busy}>
        {busy === 'deliver' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-all me-1" />}
        Mark Delivered
      </button>
    );
    return <span className="text-muted small">—</span>;
  };

  return (
    <>
      <div className="alert alert-light border mb-3 py-2 small">
        <i className="bi bi-info-circle me-2 text-primary" />
        Requests are processed FIFO (oldest approved first). Mark as <strong>Dispatched</strong> once sent, then <strong>Delivered</strong> on confirmation.
      </div>
      <DataTable
        columns={columns} data={data} loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={q => { setSearch(q); setPage(1); }}
        actions={renderActions} rowKey="id"
        emptyMessage="No requests in dispatch queue."
      />
    </>
  );
}

/* ─── Hand Delivery Tab ───────────────────────────────────────────────────── */
function HandDeliveryTab() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [search, setSearch]       = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // Per-row delivery date picker state: { [rowId]: 'YYYY-MM-DD' }
  const [deliveryDates, setDeliveryDates] = useState({});
  const perPage = 20;

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: {
          status: 'REQUESTED',
          delivery_type: 'HAND_DELIVERY',
          page, per_page: perPage,
          search: search || undefined,
        },
      });
      const d = res.data;
      const rows = d.data || d.items || [];
      setData(rows);
      setTotal(d.total || 0);
      // Pre-fill today's date for new rows
      setDeliveryDates(prev => {
        const next = { ...prev };
        rows.forEach(r => { if (!next[r.id]) next[r.id] = today; });
        return next;
      });
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markDelivered = async (row) => {
    const dateVal = deliveryDates[row.id] || today;
    setActionLoading(p => ({ ...p, [row.id]: true }));
    try {
      await api.put(`/requests/${row.id}/deliver`, {
        delivery_date: new Date(dateVal).toISOString(),
      });
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to mark as delivered');
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[row.id]; return n; });
    }
  };

  const columns = [
    { key: 'request_no', label: 'Request No', render: v => <span className="fw-medium">{formatRequestNo(v)}</span> },
    { key: 'professor',  label: 'Professor',  render: (_, r) => r.professor?.name || '—' },
    { key: 'college',    label: 'College',    render: (_, r) => r.professor?.college_name || '—' },
    { key: 'books',      label: 'Books',      render: (_, r) => {
      const txt = formatBooks(r.books || []);
      return <span title={txt} style={{ maxWidth: 160, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txt}</span>;
    }},
    { key: 'sales_rep_name', label: 'Sales Rep',   render: v => v || '—' },
    { key: 'created_at',     label: 'Request Date', render: v => formatDate(v) },
    {
      key: '__delivery_date__',
      label: 'Delivery Date',
      render: (_, row) => (
        <input
          type="date"
          className="form-control form-control-sm"
          style={{ maxWidth: 150 }}
          value={deliveryDates[row.id] || today}
          max={today}
          onChange={e => setDeliveryDates(p => ({ ...p, [row.id]: e.target.value }))}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
  ];

  const renderActions = (row) => {
    const busy = actionLoading[row.id];
    return (
      <button
        className="btn btn-sm btn-success"
        style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
        onClick={e => { e.stopPropagation(); markDelivered(row); }}
        disabled={!!busy}
      >
        {busy
          ? <span className="spinner-border spinner-border-sm me-1" />
          : <i className="bi bi-check2-circle me-1" />}
        Mark Delivered
      </button>
    );
  };

  return (
    <>
      <div className="alert alert-light border mb-3 py-2 small">
        <i className="bi bi-hand-index-thumb me-2 text-primary" />
        Hand delivery requests — select the <strong>delivery date</strong> and click <strong>Mark Delivered</strong> to complete.
      </div>
      <DataTable
        columns={columns} data={data} loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={q => { setSearch(q); setPage(1); }}
        actions={renderActions} rowKey="id"
        emptyMessage="No hand delivery requests pending."
      />
    </>
  );
}
