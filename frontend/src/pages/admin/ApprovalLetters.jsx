import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import LetterEditorModal from '../../components/LetterEditorModal.jsx';
import api from '../../api/axios.js';
import { formatDate } from '../../utils/formatters.js';

export default function ApprovalLetters() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const fetchRequests = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pagination.per_page,
        status: 'APPROVED',
        delivery_type: 'OFFICE_DISPATCH',
      };
      if (q) params.search = q;
      const res = await api.get('/requests', { params });
      setRequests(res.data.data || []);
      setPagination(p => ({
        ...p,
        page: res.data.page,
        total: res.data.total,
        total_pages: res.data.total_pages,
      }));
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, search]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSearch = (q) => {
    setSearch(q);
    fetchRequests(1, q);
  };

  const handleOpenEditor = (req) => {
    setSelectedRequest(req);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    fetchRequests(pagination.page);
  };

  const formatBooks = (books) => {
    if (!books || books.length === 0) return '—';
    return books.map(b => {
      const title = b.book?.title || '';
      const author = b.book?.author_name || '';
      return `${title}${author ? ' – ' + author : ''}${b.copies > 1 ? ` (${b.copies} Copies)` : ''}`;
    }).join('; ');
  };

  const columns = [
    { key: 'request_no', label: 'Request No' },
    {
      key: 'professor',
      label: 'Professor',
      render: (_, row) => row.professor?.name || '—',
    },
    {
      key: 'college',
      label: 'College',
      render: (_, row) => row.professor?.college_name || '—',
    },
    {
      key: 'books',
      label: 'Books',
      render: (_, row) => (
        <span style={{ fontSize: '0.8rem' }}>{formatBooks(row.books)}</span>
      ),
    },
    {
      key: 'approved_at',
      label: 'Approved On',
      render: (_, row) => formatDate(row.approved_at),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          className="btn btn-sm btn-primary d-flex align-items-center gap-1"
          onClick={() => handleOpenEditor(row)}
          id={`open-letter-${row.id}`}
        >
          <i className="bi bi-envelope-paper" />
          Open Letter Editor
        </button>
      ),
    },
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-envelope-paper me-2" />
          Approval Letters
        </h1>
      </div>

      <div className="vni-card">
        <div className="vni-card-header">
          <h5>Approved Office Dispatch Requests — Ready for Letter Generation</h5>
        </div>
        <div className="p-3">
          <DataTable
            columns={columns}
            data={requests}
            loading={loading}
            pagination={pagination}
            onPageChange={(p) => fetchRequests(p)}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {showEditor && selectedRequest && (
        <LetterEditorModal
          show={showEditor}
          onHide={handleEditorClose}
          requestId={selectedRequest.id}
          requestData={selectedRequest}
        />
      )}
    </Layout>
  );
}
