import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import api from '../../api/axios';

/**
 * FacultyDatabase - shared by manager (read-only) and admin (with delete + export)
 * Props: isAdmin (bool)
 */
export default function FacultyDatabase({ isAdmin = false }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [colleges, setColleges] = useState([]);
  const [cities, setCities] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/professors', {
        params: {
          page,
          per_page: perPage,
          search: search || undefined,
          college: collegeFilter || undefined,
          department: deptFilter || undefined,
          city: cityFilter || undefined,
        },
      });
      const d = res.data;
      const items = d.items || d.data || [];
      setData(items);
      setTotal(d.total || 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, collegeFilter, deptFilter, cityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load filter options
  useEffect(() => {
    api.get('/professors/colleges').then((res) => {
      setColleges(res.data || []);
    }).catch(() => {});
    api.get('/professors/cities').then((res) => {
      setCities(res.data || []);
    }).catch(() => {});
  }, []);

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete professor "${row.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/professors/${row.id}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/professors/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'faculty_database.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (val) => <span className="fw-medium">{val}</span> },
    { key: 'college_name', label: 'College', render: (val, row) => val || row.college || '—' },
    { key: 'department', label: 'Department' },
    { key: 'city', label: 'City' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    {
      key: 'sales_rep',
      label: 'Sales Rep',
      render: (val, row) => row.sales_rep?.name || row.assigned_to?.name || '—',
    },
  ];

  const filters = (
    <div className="d-flex gap-2 flex-wrap">
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 200 }}
        value={collegeFilter}
        onChange={(e) => { setCollegeFilter(e.target.value); setPage(1); }}
      >
        <option value="">All Colleges</option>
        {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="text"
        className="form-control form-control-sm"
        style={{ maxWidth: 160 }}
        placeholder="Department..."
        value={deptFilter}
        onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
      />
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 150 }}
        value={cityFilter}
        onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
      >
        <option value="">All Cities</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );

  const renderActions = isAdmin
    ? (row) => (
        <button
          className="btn btn-xs btn-outline-danger"
          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
          title="Delete"
        >
          <i className="bi bi-trash" />
        </button>
      )
    : undefined;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-people me-2" />
          Faculty Database
        </h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        filters={filters}
        actions={isAdmin ? renderActions : undefined}
        exportCsv={isAdmin ? { onExport: handleExportCsv, label: 'Export CSV' } : undefined}
        rowKey="id"
        emptyMessage="No professors in database."
      />
    </Layout>
  );
}
