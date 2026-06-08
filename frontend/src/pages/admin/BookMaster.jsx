import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import api from '../../api/axios';

export default function BookMaster() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/books', {
        params: {
          page, per_page: perPage,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      const d = res.data;
      setData(d.items || d.data || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditBook(null); reset({ status: 'ACTIVE' }); setShowModal(true); };
  const openEdit = (book) => { setEditBook(book); reset(book); setShowModal(true); };

  const onModalSubmit = async (formData) => {
    setModalSaving(true);
    try {
      const payload = {
        book_code: formData.book_code || null,
        title: formData.title,
        author_name: formData.author_name || null,
        status: formData.status,
      };
      if (editBook) {
        await api.put(`/books/${editBook.id}`, payload);
      } else {
        await api.post('/books', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Save failed');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete book "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/books/${row.id}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed');
    }
  };

  /* ── Bulk CSV Import ── */
  const handleImportCsv = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    api.post('/books/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => {
        const { created, skipped, errors: errs } = res.data;
        alert(
          `Import done!\nCreated: ${created}  |  Skipped: ${skipped}` +
          (errs?.length ? `\nErrors:\n${errs.slice(0, 5).join('\n')}` : '')
        );
        fetchData();
      })
      .catch((err) => alert(err?.response?.data?.detail || 'Import failed'));
    e.target.value = '';
  };

  /* ── CSV Export ── */
  const handleExportCsv = async () => {
    try {
      const res = await api.get('/books/export-csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'books.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  };

  /* ── Table columns: ISBN Number | Title | Author | Status ── */
  const columns = [
    {
      key: 'book_code',
      label: 'ISBN Number',
      render: (v) => (
        <span className="badge bg-light text-secondary border">{v || '—'}</span>
      ),
    },
    { key: 'title', label: 'Title', render: (v) => <span className="fw-medium">{v}</span> },
    { key: 'author_name', label: 'Author', render: (v) => v || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (v) =>
        v === 'ACTIVE'
          ? <span className="badge bg-success">Active</span>
          : <span className="badge bg-secondary">Inactive</span>,
    },
  ];

  const renderActions = (row) => (
    <div className="d-flex gap-1">
      <button
        className="btn btn-xs btn-outline-secondary"
        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
        onClick={(e) => { e.stopPropagation(); openEdit(row); }}
        title="Edit"
      >
        <i className="bi bi-pencil" />
      </button>
      <button
        className="btn btn-xs btn-outline-danger"
        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
        onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
        title="Delete"
      >
        <i className="bi bi-trash" />
      </button>
    </div>
  );

  const filters = (
    <div className="d-flex gap-2 flex-wrap align-items-center">
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 150 }}
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
      >
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>

      <div className="ms-auto d-flex gap-2 align-items-center">
        {/* Download sample CSV template */}
        <button
          className="btn btn-sm btn-outline-secondary"
          title="Download CSV Template"
          onClick={() => {
            const csvContent = 'ISBN Number,Title,Author,Status\n978-0000000001,Sample Book Title,Author Name,ACTIVE\n';
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'books_template.csv'; link.click();
            URL.revokeObjectURL(url);
          }}
        >
          <i className="bi bi-file-earmark-arrow-down me-1" />Template
        </button>

        {/* Import CSV */}
        <label className="btn btn-sm btn-outline-secondary mb-0" title="Bulk Upload CSV">
          <i className="bi bi-upload me-1" />Import CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
        </label>

        {/* Export CSV */}
        <button className="btn btn-sm btn-outline-secondary" onClick={handleExportCsv}>
          <i className="bi bi-download me-1" />Export CSV
        </button>

        {/* Add single book */}
        <button
          className="btn btn-sm"
          style={{ background: 'var(--vni-primary)', color: '#fff' }}
          onClick={openAdd}
        >
          <i className="bi bi-plus-lg me-1" />Add Book
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title"><i className="bi bi-book me-2" />Book Master</h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        filters={filters}
        actions={renderActions}
        rowKey="id"
        emptyMessage="No books found."
      />

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div
          className="modal d-flex align-items-center justify-content-center"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog m-0 w-100" style={{ maxWidth: 520 }}>
            <form className="modal-content" onSubmit={handleSubmit(onModalSubmit)} noValidate>
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className={`bi ${editBook ? 'bi-pencil-square' : 'bi-book-half'} me-2`} />
                  {editBook ? 'Edit Book' : 'Add Book'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  {/* ISBN Number */}
                  <div className="col-12">
                    <label className="form-label fw-medium">ISBN Number</label>
                    <input
                      className="form-control"
                      {...register('book_code')}
                      placeholder="e.g. 978-0-13-468599-1"
                    />
                    <div className="form-text">Optional — leave blank if no ISBN.</div>
                  </div>

                  {/* Title */}
                  <div className="col-12">
                    <label className="form-label fw-medium">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                      {...register('title', { required: 'Title is required' })}
                      placeholder="Book title"
                    />
                    {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                  </div>

                  {/* Author */}
                  <div className="col-md-8">
                    <label className="form-label fw-medium">Author</label>
                    <input
                      className="form-control"
                      {...register('author_name')}
                      placeholder="Author name"
                    />
                  </div>

                  {/* Status */}
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Status</label>
                    <select className="form-select" {...register('status')}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white"
                  style={{ background: 'var(--vni-primary)' }}
                  disabled={modalSaving}
                >
                  {modalSaving
                    ? <span className="spinner-border spinner-border-sm me-1" />
                    : <i className="bi bi-floppy me-1" />}
                  {editBook ? 'Save Changes' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
