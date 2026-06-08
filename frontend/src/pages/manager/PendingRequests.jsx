import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/axios';
import { formatDate, formatBooks, formatRequestNo } from '../../utils/formatters';

export default function PendingRequests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;
  const [search, setSearch] = useState('');

  // View / edit state (merged into one modal)
  const [viewRow, setViewRow] = useState(null);
  const [viewBooks, setViewBooks] = useState([]);   // editable books list inside view modal
  const [viewSaving, setViewSaving] = useState(false);
  const [viewDirty, setViewDirty] = useState(false); // tracks if user changed anything

  // Reject modal
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: { status: 'REQUESTED', page, per_page: perPage, search: search || undefined },
      });
      const d = res.data;
      setData(d.items || d.data || []);
      setTotal(d.total || 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Open View Modal ─── */
  const openView = (row) => {
    setViewRow(row);
    // Build editable books list from response
    const books = (row.books || row.request_books || []).map((b) => ({
      book_id: b.book_id ?? b.book?.id,
      title: b.book?.title || b.title || '',
      author: b.book?.author_name || b.author_name || '—',
      copies: b.copies ?? 1,
    }));
    setViewBooks(books);
    setViewDirty(false);
  };

  /* ─── Inline copies change ─── */
  const handleCopiesChange = (idx, val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setViewBooks((prev) => prev.map((b, i) => (i === idx ? { ...b, copies: num } : b)));
    setViewDirty(true);
  };

  /* ─── Delete a book row from the editable list ─── */
  const handleDeleteBookRow = (idx) => {
    setViewBooks((prev) => prev.filter((_, i) => i !== idx));
    setViewDirty(true);
  };

  /* ─── Save books changes (PUT /requests/:id) ─── */
  const handleSaveBooks = async () => {
    if (!viewRow) return;
    if (viewBooks.length === 0) {
      alert('A request must have at least one book.');
      return;
    }
    setViewSaving(true);
    try {
      await api.put(`/requests/${viewRow.id}`, {
        books: viewBooks.map((b) => ({ book_id: b.book_id, copies: b.copies })),
        remarks: viewRow.remarks,
      });
      setViewDirty(false);
      fetchData();
      alert('Books updated successfully.');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Update failed');
    } finally {
      setViewSaving(false);
    }
  };

  /* ─── Approve ─── */
  const handleApprove = async (row) => {
    if (!window.confirm(`Approve request ${row.request_no}?`)) return;
    setActionLoading((prev) => ({ ...prev, [row.id]: 'approving' }));
    try {
      await api.put(`/requests/${row.id}/approve`);
      setViewRow(null);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Approve failed');
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[row.id]; return n; });
    }
  };

  /* ─── Reject submit ─── */
  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { alert('Please enter a rejection reason.'); return; }
    setActionLoading((prev) => ({ ...prev, [rejectRow.id]: 'rejecting' }));
    try {
      await api.put(`/requests/${rejectRow.id}/reject`, { rejection_reason: rejectReason });
      setRejectRow(null);
      setRejectReason('');
      setViewRow(null);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Reject failed');
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[rejectRow?.id]; return n; });
    }
  };

  /* ─── Table columns ─── */
  const columns = [
    {
      key: 'request_no',
      label: 'Request No',
      render: (val) => <span className="fw-medium">{formatRequestNo(val)}</span>,
    },
    {
      key: 'professor',
      label: 'Professor',
      render: (val, row) => row.professor?.name || '—',
    },
    {
      key: 'college',
      label: 'College',
      render: (_, row) => row.professor?.college_name || row.professor?.college || '—',
    },
    {
      key: 'sales_rep_name',
      label: 'Sales Rep',
      render: (val) => val || '—',
    },
    {
      key: 'books',
      label: 'Books',
      render: (_, row) => {
        const text = formatBooks(row.books || row.request_books || []);
        return (
          <span
            title={text}
            style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {text}
          </span>
        );
      },
    },
    {
      key: 'delivery_type',
      label: 'Delivery',
      render: (val) =>
        val === 'HAND_DELIVERY'
          ? <span className="badge bg-info text-dark">Hand</span>
          : <span className="badge bg-secondary">Dispatch</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => formatDate(val),
    },
  ];

  /* ─── Actions: View | Approve | Reject  (Edit removed) ─── */
  const renderActions = (row) => {
    const busy = actionLoading[row.id];
    return (
      <div className="d-flex gap-1">
        {/* View (now also allows editing books inline) */}
        <button
          className="btn btn-xs btn-outline-primary"
          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          onClick={(e) => { e.stopPropagation(); openView(row); }}
          title="View"
        >
          <i className="bi bi-eye" />
        </button>

        {/* Approve */}
        <button
          className="btn btn-xs btn-outline-success"
          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          onClick={(e) => { e.stopPropagation(); handleApprove(row); }}
          disabled={!!busy}
          title="Approve"
        >
          {busy === 'approving'
            ? <span className="spinner-border spinner-border-sm" />
            : <i className="bi bi-check-lg" />}
        </button>

        {/* Reject */}
        <button
          className="btn btn-xs btn-outline-danger"
          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          onClick={(e) => { e.stopPropagation(); setRejectRow(row); setRejectReason(''); }}
          disabled={!!busy}
          title="Reject"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-hourglass-split me-2" />
          Pending Requests
        </h1>
        <span className="badge bg-warning text-dark">{total} Pending</span>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        actions={renderActions}
        rowKey="id"
        emptyMessage="No pending requests."
      />

      {/* ═══════════════════════════════════════
          View Modal  (books are inline-editable)
          ═══════════════════════════════════════ */}
      {viewRow && (
        <div
          className="modal d-flex align-items-start justify-content-center pt-4"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1055, overflowY: 'auto' }}
        >
          <div className="modal-dialog modal-lg m-0 w-100 mb-4" style={{ maxWidth: 760 }}>
            <div className="modal-content">

              {/* Header */}
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className="bi bi-file-earmark-text me-2" />
                  Request — {formatRequestNo(viewRow.request_no)}
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setViewRow(null)} />
              </div>

              {/* Body */}
              <div className="modal-body">

                {/* Professor / request details */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="small text-muted">Professor</div>
                    <div className="fw-medium">{viewRow.professor?.name || '—'}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted">College</div>
                    <div>{viewRow.professor?.college_name || viewRow.professor?.college || '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Department</div>
                    <div>{viewRow.professor?.department || '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">City</div>
                    <div>{viewRow.professor?.city || '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Mobile</div>
                    <div>{viewRow.professor?.mobile || '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Delivery Type</div>
                    <div>{viewRow.delivery_type === 'HAND_DELIVERY' ? 'Hand Delivery' : 'Office Dispatch'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Address Type</div>
                    <div>{viewRow.address_type === 'residential' ? 'Residential' : 'College'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted">Status</div>
                    <StatusBadge status={viewRow.status} />
                  </div>
                  {viewRow.remarks && (
                    <div className="col-12">
                      <div className="small text-muted">Remarks</div>
                      <div>{viewRow.remarks}</div>
                    </div>
                  )}
                  <div className="col-md-6">
                    <div className="small text-muted">Sales Rep</div>
                    <div>{viewRow.sales_rep_name || '—'}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted">Submitted</div>
                    <div>{formatDate(viewRow.created_at)}</div>
                  </div>
                </div>

                {/* ── Editable Books Table ── */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-semibold mb-0">
                    <i className="bi bi-book me-1" />Books
                  </h6>
                  {viewDirty && (
                    <span className="badge bg-warning text-dark">
                      <i className="bi bi-pencil me-1" />Unsaved changes
                    </span>
                  )}
                </div>

                {viewBooks.length === 0 ? (
                  <div className="alert alert-warning py-2">
                    <i className="bi bi-exclamation-triangle me-1" />
                    No books in this request. Please add at least one book before approving.
                  </div>
                ) : (
                  <table className="table table-sm vni-table mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: '42%' }}>Title</th>
                        <th style={{ width: '32%' }}>Author</th>
                        <th style={{ width: '14%' }} className="text-center">Copies</th>
                        <th style={{ width: '12%' }} className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewBooks.map((b, idx) => (
                        <tr key={idx}>
                          <td className="align-middle fw-medium">{b.title || '—'}</td>
                          <td className="align-middle text-muted">{b.author || '—'}</td>
                          <td className="align-middle text-center">
                            <input
                              type="number"
                              className="form-control form-control-sm text-center"
                              style={{ width: 72, margin: '0 auto' }}
                              min={1}
                              value={b.copies}
                              onChange={(e) => handleCopiesChange(idx, e.target.value)}
                            />
                          </td>
                          <td className="align-middle text-center">
                            <button
                              className="btn btn-xs btn-outline-danger"
                              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                              title="Remove book"
                              onClick={() => handleDeleteBookRow(idx)}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer flex-wrap gap-2">
                {/* Save books changes */}
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleSaveBooks}
                  disabled={!viewDirty || viewSaving || viewBooks.length === 0}
                  title={!viewDirty ? 'No changes to save' : 'Save book changes'}
                >
                  {viewSaving
                    ? <span className="spinner-border spinner-border-sm me-1" />
                    : <i className="bi bi-floppy me-1" />}
                  Save Changes
                </button>

                <div className="ms-auto d-flex gap-2">
                  {/* Approve */}
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => handleApprove(viewRow)}
                    disabled={!!actionLoading[viewRow.id] || viewBooks.length === 0}
                  >
                    {actionLoading[viewRow.id] === 'approving'
                      ? <span className="spinner-border spinner-border-sm me-1" />
                      : <i className="bi bi-check-lg me-1" />}
                    Approve
                  </button>

                  {/* Reject */}
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => { setRejectRow(viewRow); setRejectReason(''); }}
                    disabled={!!actionLoading[viewRow.id]}
                  >
                    <i className="bi bi-x-lg me-1" />Reject
                  </button>

                  {/* Close */}
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setViewRow(null)}>
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════
          Reject Modal
          ═══════════════════ */}
      {rejectRow && (
        <div
          className="modal d-flex align-items-center justify-content-center"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
        >
          <div className="modal-dialog m-0 w-100" style={{ maxWidth: 480 }}>
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle me-2" />Reject Request
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setRejectRow(null)} />
              </div>
              <div className="modal-body">
                <p>
                  You are rejecting <strong>{formatRequestNo(rejectRow.request_no)}</strong>.
                  Please provide a reason:
                </p>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Enter rejection reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setRejectRow(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleRejectSubmit}>
                  <i className="bi bi-x-circle me-1" />Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
