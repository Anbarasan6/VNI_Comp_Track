import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/axios.js';
import { formatDate } from '../../utils/formatters.js';

export default function CompleteTracking() {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });
  const [search, setSearch]       = useState('');
  const [filters, setFilters]     = useState({
    status: '', delivery_type: '', sales_rep: '', date_from: '', date_to: '',
  });
  const [salesReps, setSalesReps] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Detail modal state
  const [detailRow, setDetailRow] = useState(null);

  // Load sales reps for filter dropdown
  useEffect(() => {
    api.get('/users?role=sales_rep&per_page=100').then(r => {
      setSalesReps(r.data?.data || r.data?.items || []);
    }).catch(() => {});
  }, []);

  const fetchRequests = useCallback(async (page = 1, q = search, f = filters) => {
    setLoading(true);
    try {
      const params = { page, per_page: pagination.per_page };
      if (q) params.search = q;
      if (f.status)        params.status        = f.status;
      if (f.delivery_type) params.delivery_type = f.delivery_type;
      if (f.sales_rep)     params.sales_rep_id  = f.sales_rep;
      if (f.date_from)     params.date_from     = f.date_from;
      if (f.date_to)       params.date_to       = f.date_to;
      const res = await api.get('/requests', { params });
      setRequests(res.data.data || []);
      setPagination(p => ({ ...p, page: res.data.page, total: res.data.total, total_pages: res.data.total_pages }));
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally { setLoading(false); }
  }, [pagination.per_page, search, filters]);

  useEffect(() => { fetchRequests(); }, []);

  const handleSearch = (q) => { setSearch(q); fetchRequests(1, q, filters); };
  const handleFilterChange = (key, value) => {
    const f = { ...filters, [key]: value };
    setFilters(f);
    fetchRequests(1, search, f);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.status)    params.status    = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;
      const res = await api.get('/reports/export', { responseType: 'blob', params });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `VNI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  const formatBooks = (books) => {
    if (!books || books.length === 0) return '—';
    return books.map(b => `${b.book?.title || ''}${b.copies > 1 ? ` (${b.copies})` : ''}`).join(', ');
  };

  const columns = [
    { key: 'request_no', label: 'Request No', render: v => <span className="fw-semibold">{v}</span> },
    { key: 'professor',  label: 'Professor',  render: (_, r) => r.professor?.name || '—' },
    { key: 'college',    label: 'College',    render: (_, r) => r.professor?.college_name || '—' },
    { key: 'sales_rep',  label: 'Sales Rep',  render: (_, r) => r.sales_rep_name || '—' },
    {
      key: 'books', label: 'Books',
      render: (_, r) => <span style={{ fontSize: '0.8rem' }}>{formatBooks(r.books)}</span>,
    },
    {
      key: 'delivery_type', label: 'Delivery',
      render: (_, r) => (
        <span className={`badge ${r.delivery_type === 'HAND_DELIVERY' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
          {r.delivery_type === 'HAND_DELIVERY' ? 'Hand' : 'Dispatch'}
        </span>
      ),
    },
    { key: 'status',        label: 'Status',        render: (_, r) => <StatusBadge status={r.status} /> },
    { key: 'dispatch_date', label: 'Dispatch Date',  render: (_, r) => formatDate(r.dispatch_date) },
    { key: 'delivery_date', label: 'Delivery Date',  render: (_, r) => formatDate(r.delivery_date) },
  ];

  const renderActions = (row) => (
    <button
      className="btn btn-sm btn-outline-primary"
      style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
      onClick={e => { e.stopPropagation(); setDetailRow(row); }}
    >
      <i className="bi bi-eye me-1" />View
    </button>
  );

  const filterBar = (
    <div className="table-actions-bar flex-wrap">
      <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 140 }}
        value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} id="filter-status">
        <option value="">All Statuses</option>
        <option value="REQUESTED">Requested</option>
        <option value="APPROVED">Approved</option>
        <option value="DISPATCHED">Dispatched</option>
        <option value="DELIVERED">Delivered</option>
        <option value="REJECTED">Rejected</option>
      </select>
      <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 150 }}
        value={filters.delivery_type} onChange={e => handleFilterChange('delivery_type', e.target.value)} id="filter-delivery-type">
        <option value="">All Delivery Types</option>
        <option value="HAND_DELIVERY">Hand Delivery</option>
        <option value="OFFICE_DISPATCH">Office Dispatch</option>
      </select>
      <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 160 }}
        value={filters.sales_rep} onChange={e => handleFilterChange('sales_rep', e.target.value)} id="filter-sales-rep">
        <option value="">All Sales Reps</option>
        {salesReps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }}
        value={filters.date_from} onChange={e => handleFilterChange('date_from', e.target.value)} title="From Date" />
      <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }}
        value={filters.date_to} onChange={e => handleFilterChange('date_to', e.target.value)} title="To Date" />
      <button className="btn btn-sm btn-outline-secondary ms-auto d-flex align-items-center gap-1"
        onClick={handleExportCsv} disabled={exporting} id="btn-export-csv">
        {exporting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-download" />}
        Export CSV
      </button>
    </div>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title"><i className="bi bi-table me-2" />Complete Tracking</h1>
        <span className="badge bg-secondary">{pagination.total} total requests</span>
      </div>

      <div className="vni-card">
        <div className="vni-card-header">
          <h5>All Requests — All Sales Representatives</h5>
        </div>
        <div className="p-3">
          {filterBar}
          <DataTable
            columns={columns} data={requests} loading={loading}
            pagination={pagination}
            onPageChange={p => fetchRequests(p)}
            onSearch={handleSearch}
            actions={renderActions}
          />
        </div>
      </div>

      {/* Detail Modal */}
      {detailRow && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDetailRow(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title"><i className="bi bi-file-text me-2" />{detailRow.request_no}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDetailRow(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="fw-semibold mb-2 small text-uppercase text-muted">Professor</div>
                      <div className="fw-bold">{detailRow.professor?.title} {detailRow.professor?.initial} {detailRow.professor?.name}</div>
                      <div className="small text-muted">{detailRow.professor?.designation}</div>
                      <div className="small">{detailRow.professor?.department}</div>
                      <div className="small">{detailRow.professor?.college_name}</div>
                      {detailRow.professor?.university && <div className="small text-muted">{detailRow.professor.university}</div>}
                      <div className="small">{detailRow.professor?.city} {detailRow.professor?.pincode}</div>
                      <div className="small">{detailRow.professor?.mobile}</div>
                      {detailRow.professor?.email && <div className="small">{detailRow.professor.email}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="fw-semibold mb-2 small text-uppercase text-muted">Request Info</div>
                      <div className="row g-2 small">
                        <div className="col-6"><span className="text-muted">Status:</span></div>
                        <div className="col-6"><StatusBadge status={detailRow.status} /></div>
                        <div className="col-6"><span className="text-muted">Delivery Type:</span></div>
                        <div className="col-6">
                          <span className={`badge ${detailRow.delivery_type === 'HAND_DELIVERY' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                            {detailRow.delivery_type === 'HAND_DELIVERY' ? 'Hand Delivery' : 'Office Dispatch'}
                          </span>
                        </div>
                        <div className="col-6"><span className="text-muted">Address Type:</span></div>
                        <div className="col-6">{detailRow.address_type}</div>
                        <div className="col-6"><span className="text-muted">Sales Rep:</span></div>
                        <div className="col-6">{detailRow.sales_rep_name || '—'}</div>
                        <div className="col-6"><span className="text-muted">Request Date:</span></div>
                        <div className="col-6">{formatDate(detailRow.created_at)}</div>
                        {detailRow.dispatch_date && <>
                          <div className="col-6"><span className="text-muted">Dispatch Date:</span></div>
                          <div className="col-6">{formatDate(detailRow.dispatch_date)}</div>
                        </>}
                        {detailRow.delivery_date && <>
                          <div className="col-6"><span className="text-muted">Delivery Date:</span></div>
                          <div className="col-6">{formatDate(detailRow.delivery_date)}</div>
                        </>}
                        {detailRow.rejection_reason && <>
                          <div className="col-6"><span className="text-muted">Rejection Reason:</span></div>
                          <div className="col-6 text-danger">{detailRow.rejection_reason}</div>
                        </>}
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="fw-semibold mb-2 small text-uppercase text-muted">Books</div>
                      {(detailRow.books || []).length === 0 ? <span className="text-muted small">No books</span> : (
                        <table className="table table-sm mb-0">
                          <thead><tr><th>Title</th><th>Author</th><th>Copies</th></tr></thead>
                          <tbody>
                            {(detailRow.books || []).map((b, i) => (
                              <tr key={i}>
                                <td>{b.book?.title || '—'}</td>
                                <td>{b.book?.author_name || '—'}</td>
                                <td>{b.copies}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  {detailRow.remarks && (
                    <div className="col-12">
                      <div className="p-3 rounded" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <div className="fw-semibold mb-1 small text-uppercase text-muted">Remarks</div>
                        <div className="small">{detailRow.remarks}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setDetailRow(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
