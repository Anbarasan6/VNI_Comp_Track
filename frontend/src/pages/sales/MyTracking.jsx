import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/axios.js';
import { formatDate, formatBooks, formatRequestNo } from '../../utils/formatters.js';

const STATUS_OPTIONS = ['REQUESTED', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'REJECTED'];

export default function MyTracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [viewRow, setViewRow] = useState(null);
  const [notesRow, setNotesRow] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: {
          page, per_page: perPage,
          search: search || undefined,
          status: statusFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      const d = res.data;
      setData(d.data || d.items || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNotes = (row) => {
    setNotesRow(row);
    setNotesText(row.sales_notes || '');
  };

  const saveNotes = async () => {
    if (!notesRow) return;
    setNotesSaving(true);
    try {
      await api.put(`/requests/${notesRow.id}/notes`, { sales_notes: notesText });
      setNotesRow(null);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  const columns = [
    { key: 'request_no', label: 'Request No', render: v => <span className="fw-medium">{formatRequestNo(v)}</span> },
    { key: 'professor', label: 'Professor', render: (_, r) => r.professor?.name || '—' },
    { key: 'college', label: 'College', render: (_, r) => r.professor?.college_name || '—' },
    { key: 'books', label: 'Books Requested', render: (_, r) => {
      const txt = formatBooks(r.books || []);
      return <span title={txt} style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txt}</span>;
    }},
    { key: 'delivery_type', label: 'Delivery Type', render: v =>
      v === 'HAND_DELIVERY'
        ? <span className="badge bg-info text-dark">Hand Delivery</span>
        : <span className="badge bg-secondary">Office Dispatch</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'created_at', label: 'Request Date', render: v => formatDate(v) },
  ];

  const renderActions = (row) => (
    <div className="d-flex gap-1">
      <button
        className="btn btn-sm btn-outline-primary"
        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
        onClick={e => { e.stopPropagation(); setViewRow(row); }}
        title="View Details"
      >
        <i className="bi bi-eye me-1" />View
      </button>
      {row.status === 'DELIVERED' && (
        <button
          className="btn btn-sm btn-outline-success"
          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          onClick={e => { e.stopPropagation(); openNotes(row); }}
          title="Update Notes"
        >
          <i className="bi bi-journal-text me-1" />Notes
        </button>
      )}
    </div>
  );

  const filters = (
    <div className="d-flex gap-2 flex-wrap">
      <select className="form-select form-select-sm" style={{ maxWidth: 160 }} value={statusFilter}
        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="date" className="form-control form-control-sm" style={{ maxWidth: 150 }} value={dateFrom}
        onChange={e => { setDateFrom(e.target.value); setPage(1); }} title="Date from" />
      <input type="date" className="form-control form-control-sm" style={{ maxWidth: 150 }} value={dateTo}
        onChange={e => { setDateTo(e.target.value); setPage(1); }} title="Date to" />
    </div>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title"><i className="bi bi-list-check me-2" />My Requests</h1>
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

      {/* ── View Details Modal ────────────────────────────── */}
      {viewRow && (
        <div className="modal d-flex align-items-start justify-content-center pt-4"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1055, overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg m-0 mb-4 w-100" style={{ maxWidth: 760 }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className="bi bi-file-text me-2" />Request Details — {formatRequestNo(viewRow.request_no)}
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setViewRow(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="small text-muted">Status</div>
                    <StatusBadge status={viewRow.status} />
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Delivery Type</div>
                    <div>{viewRow.delivery_type === 'HAND_DELIVERY' ? 'Hand Delivery' : 'Office Dispatch'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Date Submitted</div>
                    <div>{formatDate(viewRow.created_at)}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted">Professor</div>
                    <div className="fw-medium">{viewRow.professor?.name || '—'}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted">College</div>
                    <div>{viewRow.professor?.college_name || '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Department</div>
                    <div>{viewRow.professor?.department || '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Address Type</div>
                    <div>{viewRow.address_type === 'RESIDENTIAL' ? 'Residential' : 'College'}</div>
                  </div>
                  {viewRow.dispatch_date && (
                    <div className="col-md-4">
                      <div className="small text-muted">Dispatch Date</div>
                      <div>{formatDate(viewRow.dispatch_date)}</div>
                    </div>
                  )}
                  {viewRow.delivery_date && (
                    <div className="col-md-4">
                      <div className="small text-muted">Delivery Date</div>
                      <div>{formatDate(viewRow.delivery_date)}</div>
                    </div>
                  )}
                  {viewRow.rejection_reason && (
                    <div className="col-12">
                      <div className="small text-muted">Rejection Reason</div>
                      <div className="text-danger">{viewRow.rejection_reason}</div>
                    </div>
                  )}
                  {viewRow.remarks && (
                    <div className="col-12">
                      <div className="small text-muted">Remarks</div>
                      <div>{viewRow.remarks}</div>
                    </div>
                  )}
                  {(viewRow.books || []).length > 0 && (
                    <div className="col-12">
                      <div className="small text-muted mb-1">Books Requested</div>
                      <table className="table table-sm vni-table mb-0">
                        <thead><tr><th>Title</th><th>Author</th><th>Copies</th></tr></thead>
                        <tbody>
                          {(viewRow.books || []).map((b, i) => (
                            <tr key={i}>
                              <td>{b.book?.title || b.title || '—'}</td>
                              <td>{b.book?.author_name || '—'}</td>
                              <td>{b.copies}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {viewRow.sales_notes && (
                    <div className="col-12">
                      <div className="small text-muted">My Notes</div>
                      <div className="p-2 rounded" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                        {viewRow.sales_notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                {viewRow.status === 'DELIVERED' && (
                  <button className="btn btn-sm btn-outline-success me-auto" onClick={() => { setViewRow(null); openNotes(viewRow); }}>
                    <i className="bi bi-journal-text me-1" />Update Notes
                  </button>
                )}
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setViewRow(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Notes Modal ───────────────────────────── */}
      {notesRow && (
        <div className="modal d-flex align-items-center justify-content-center"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog m-0 w-100" style={{ maxWidth: 520 }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--vni-gold, #c8a45a)', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className="bi bi-journal-text me-2" />Update Notes — {formatRequestNo(notesRow.request_no)}
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setNotesRow(null)} />
              </div>
              <div className="modal-body">
                <label className="form-label fw-medium">Notes <span className="text-muted small">(visible only to you)</span></label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  placeholder="Enter your notes about this delivery, feedback received, next steps, etc..."
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setNotesRow(null)}>Cancel</button>
                <button className="btn btn-sm text-white" style={{ background: 'var(--vni-primary)' }}
                  onClick={saveNotes} disabled={notesSaving}>
                  {notesSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-floppy me-1" />}
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
