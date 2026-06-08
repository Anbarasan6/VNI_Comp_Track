import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import api from '../../api/axios.js';
import { formatDate, formatDateTime } from '../../utils/formatters.js';

export default function FacultyInfoForms() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchSubmissions = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page, per_page: pagination.per_page };
      if (q) params.search = q;
      const res = await api.get('/faculty-info', { params });
      setSubmissions(res.data.data || []);
      setPagination(p => ({
        ...p,
        page: res.data.page,
        total: res.data.total,
        total_pages: res.data.total_pages,
      }));
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, search]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSearch = (q) => {
    setSearch(q);
    fetchSubmissions(1, q);
  };

  const columns = [
    { key: 'professor_name', label: 'Professor Name' },
    { key: 'college_name', label: 'College' },
    { key: 'department', label: 'Department', render: (v) => v || '—' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'student_strength', label: 'Student Strength', render: (v) => v || '—' },
    { key: 'current_textbook', label: 'Current Textbook', render: (v) => v ? v.substring(0, 40) + (v.length > 40 ? '...' : '') : '—' },
    {
      key: 'submitted_at',
      label: 'Submitted At',
      render: (v) => formatDateTime(v),
    },
    {
      key: 'actions',
      label: 'Details',
      render: (_, row) => (
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => setSelected(row)}
          id={`view-faculty-${row.id}`}
        >
          <i className="bi bi-eye me-1" />
          View
        </button>
      ),
    },
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-person-lines-fill me-2" />
          Faculty Info Form Submissions
        </h1>
      </div>

      <div className="vni-card">
        <div className="vni-card-header d-flex justify-content-between align-items-center">
          <h5>All Faculty Information Form Submissions</h5>
          <span className="badge bg-secondary">{pagination.total} submissions</span>
        </div>
        <div className="p-3">
          <DataTable
            columns={columns}
            data={submissions}
            loading={loading}
            pagination={pagination}
            onPageChange={(p) => fetchSubmissions(p)}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className="bi bi-person-lines-fill me-2" />
                  Faculty Information — {selected.professor_name}
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setSelected(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Professor Name</label>
                    <p className="mb-0">{selected.professor_name}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Mobile</label>
                    <p className="mb-0">{selected.mobile}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">College</label>
                    <p className="mb-0">{selected.college_name}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Department</label>
                    <p className="mb-0">{selected.department || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Student Strength</label>
                    <p className="mb-0">{selected.student_strength || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Request Reference</label>
                    <p className="mb-0">{selected.request_ref || '—'}</p>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-muted small">Subjects Handling</label>
                    <p className="mb-0">{selected.subjects_handling || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Current Textbook</label>
                    <p className="mb-0">{selected.current_textbook || '—'}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted small">Current Publisher</label>
                    <p className="mb-0">{selected.current_publisher || '—'}</p>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-muted small">Remarks</label>
                    <p className="mb-0">{selected.remarks || '—'}</p>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-muted small">Submitted At</label>
                    <p className="mb-0">{formatDateTime(selected.submitted_at)}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
