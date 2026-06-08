import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/axios.js';
import { formatDate, formatBooks, formatRequestNo } from '../../utils/formatters.js';

const STATUS_OPTIONS = ['REQUESTED', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'REJECTED'];
const DT_OPTIONS = ['HAND_DELIVERY', 'OFFICE_DISPATCH'];

export default function AllTracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dtFilter, setDtFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewRow, setViewRow] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: {
          page, per_page: perPage,
          search: search || undefined,
          status: statusFilter || undefined,
          delivery_type: dtFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      const d = res.data;
      setData(d.data || d.items || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, dtFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { key: 'request_no', label: 'Request No', render: v => <span className="fw-medium">{formatRequestNo(v)}</span> },
    { key: 'professor', label: 'Professor', render: (_, r) => r.professor?.name || '—' },
    { key: 'college', label: 'College', render: (_, r) => r.professor?.college_name || '—' },
    { key: 'books', label: 'Books', render: (_, r) => {
      const txt = formatBooks(r.books || []);
      return <span title={txt} style={{ maxWidth: 160, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txt}</span>;
    }},
    { key: 'sales_rep_name', label: 'Sales Rep', render: v => v || '—' },
    { key: 'delivery_type', label: 'Delivery', render: v => v === 'HAND_DELIVERY'
      ? <span className="badge bg-info text-dark">Hand</span>
      : <span className="badge bg-secondary">Dispatch</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'created_at', label: 'Date', render: v => formatDate(v) },
  ];

  const filters = (
    <div className="d-flex gap-2 flex-wrap">
      <select className="form-select form-select-sm" style={{ maxWidth: 160 }} value={statusFilter}
        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="form-select form-select-sm" style={{ maxWidth: 170 }} value={dtFilter}
        onChange={e => { setDtFilter(e.target.value); setPage(1); }}>
        <option value="">All Delivery Types</option>
        <option value="HAND_DELIVERY">Hand Delivery</option>
        <option value="OFFICE_DISPATCH">Office Dispatch</option>
      </select>
      <input type="date" className="form-control form-control-sm" style={{ maxWidth: 150 }} value={dateFrom}
        onChange={e => { setDateFrom(e.target.value); setPage(1); }} title="From date" />
      <input type="date" className="form-control form-control-sm" style={{ maxWidth: 150 }} value={dateTo}
        onChange={e => { setDateTo(e.target.value); setPage(1); }} title="To date" />
    </div>
  );

  const renderActions = (row) => (
    <button className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.75rem', padding: '2px 10px' }}
      onClick={e => { e.stopPropagation(); setViewRow(row); }}>
      <i className="bi bi-eye me-1" />View
    </button>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title"><i className="bi bi-list-check me-2" />Complete Tracking</h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={q => { setSearch(q); setPage(1); }}
        filters={filters}
        actions={renderActions}
        rowKey="id"
        emptyMessage="No requests found."
      />

      {/* View Modal */}
      {viewRow && (
        <div className="modal d-flex align-items-start justify-content-center pt-4"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1055, overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg m-0 mb-4 w-100" style={{ maxWidth: 760 }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title"><i className="bi bi-file-text me-2" />Request Details — {formatRequestNo(viewRow.request_no)}</h5>
                <button className="btn-close btn-close-white" onClick={() => setViewRow(null)} />
              </div>
              <div className="modal-body">
                <RequestDetailBody row={viewRow} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setViewRow(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export function RequestDetailBody({ row }) {
  const books = row.books || row.request_books || [];
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <div className="small text-muted">Request No</div>
        <div className="fw-semibold">{formatRequestNo(row.request_no)}</div>
      </div>
      <div className="col-md-4">
        <div className="small text-muted">Status</div>
        <StatusBadge status={row.status} />
      </div>
      <div className="col-md-4">
        <div className="small text-muted">Date Submitted</div>
        <div>{formatDate(row.created_at)}</div>
      </div>
      <div className="col-md-6">
        <div className="small text-muted">Professor</div>
        <div className="fw-medium">{row.professor?.name || '—'}</div>
      </div>
      <div className="col-md-6">
        <div className="small text-muted">College</div>
        <div>{row.professor?.college_name || '—'}</div>
      </div>
      <div className="col-md-4">
        <div className="small text-muted">Department</div>
        <div>{row.professor?.department || '—'}</div>
      </div>
      <div className="col-md-4">
        <div className="small text-muted">Delivery Type</div>
        <div>{row.delivery_type === 'HAND_DELIVERY' ? 'Hand Delivery' : 'Office Dispatch'}</div>
      </div>
      <div className="col-md-4">
        <div className="small text-muted">Address Type</div>
        <div>{row.address_type === 'RESIDENTIAL' ? 'Residential' : 'College'}</div>
      </div>
      {row.sales_rep_name && (
        <div className="col-md-4">
          <div className="small text-muted">Sales Rep</div>
          <div>{row.sales_rep_name}</div>
        </div>
      )}
      {row.dispatch_date && (
        <div className="col-md-4">
          <div className="small text-muted">Dispatch Date</div>
          <div>{formatDate(row.dispatch_date)}</div>
        </div>
      )}
      {row.delivery_date && (
        <div className="col-md-4">
          <div className="small text-muted">Delivery Date</div>
          <div>{formatDate(row.delivery_date)}</div>
        </div>
      )}
      {row.rejection_reason && (
        <div className="col-12">
          <div className="small text-muted">Rejection Reason</div>
          <div className="text-danger">{row.rejection_reason}</div>
        </div>
      )}
      {row.remarks && (
        <div className="col-12">
          <div className="small text-muted">Remarks</div>
          <div>{row.remarks}</div>
        </div>
      )}
      {books.length > 0 && (
        <div className="col-12">
          <div className="small text-muted mb-1">Books Requested</div>
          <table className="table table-sm vni-table mb-0">
            <thead>
              <tr><th>Title</th><th>Author</th><th>Copies</th></tr>
            </thead>
            <tbody>
              {books.map((b, i) => (
                <tr key={i}>
                  <td>{b.book?.title || b.title || '—'}</td>
                  <td>{b.book?.author_name || b.author_name || '—'}</td>
                  <td>{b.copies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
