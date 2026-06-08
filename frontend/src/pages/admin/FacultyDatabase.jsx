import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import api from '../../api/axios.js';

/**
 * Admin Faculty Database — same as manager but with delete + export CSV
 */
export default function FacultyDatabase() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, perPage: 20, total: 0 });
  const [search, setSearch] = useState('');
  const [colleges, setColleges] = useState([]);
  const [cities, setCities] = useState([]);
  const [filters, setFilters] = useState({ college: '', city: '', department: '' });

  const fetchData = useCallback(async (page = 1, q = search, f = filters) => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (q) params.search = q;
      if (f.college) params.college = f.college;
      if (f.city) params.city = f.city;
      if (f.department) params.department = f.department;
      const res = await api.get('/professors', { params });
      setData(res.data.data || res.data.items || []);
      setPagination(p => ({
        ...p,
        page: res.data.page || page,
        total: res.data.total || 0,
      }));
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    api.get('/professors/colleges').then(r => setColleges(r.data || [])).catch(() => {});
    api.get('/professors/cities').then(r => setCities(r.data || [])).catch(() => {});
  }, []);

  const handleDelete = async (row) => {
    if (!confirm(`Delete professor "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/professors/${row.id}`);
      fetchData(pagination.page);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/professors/export-csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'faculty_database.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
  };

  const handleFilterChange = (key, value) => {
    const newF = { ...filters, [key]: value };
    setFilters(newF);
    fetchData(1, search, newF);
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="fw-medium">{v}</span> },
    { key: 'college_name', label: 'College' },
    { key: 'department', label: 'Department', render: v => v || '—' },
    { key: 'city', label: 'City', render: v => v || '—' },
    { key: 'mobile', label: 'Mobile', render: v => v || '—' },
    { key: 'email', label: 'Email', render: v => v || '—' },
    {
      key: 'sales_rep_name',
      label: 'Sales Rep',
      render: (v, row) => v || row.sales_person?.name || '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => handleDelete(row)}
          id={`delete-prof-${row.id}`}
        >
          <i className="bi bi-trash" />
        </button>
      ),
    },
  ];

  const filterBar = (
    <div className="d-flex gap-2 flex-wrap align-items-center">
      <select
        className="form-select form-select-sm"
        style={{ width: 'auto', minWidth: 160 }}
        value={filters.college}
        onChange={e => handleFilterChange('college', e.target.value)}
      >
        <option value="">All Colleges</option>
        {colleges.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select
        className="form-select form-select-sm"
        style={{ width: 'auto', minWidth: 130 }}
        value={filters.city}
        onChange={e => handleFilterChange('city', e.target.value)}
      >
        <option value="">All Cities</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="text"
        className="form-control form-control-sm"
        style={{ width: 'auto', minWidth: 150 }}
        placeholder="Department..."
        value={filters.department}
        onChange={e => handleFilterChange('department', e.target.value)}
      />
      <button
        className="btn btn-sm btn-outline-secondary ms-auto"
        onClick={handleExportCsv}
        id="btn-export-professors"
      >
        <i className="bi bi-download me-1" />Export CSV
      </button>
    </div>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-people me-2" />
          Faculty Database
        </h1>
      </div>
      <div className="vni-card">
        <div className="vni-card-header">
          <h5>All Professors / Faculty</h5>
        </div>
        <div className="p-3">
          <div className="mb-3">{filterBar}</div>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            pagination={{
              page: pagination.page,
              perPage: pagination.perPage,
              total: pagination.total,
              onPageChange: (p) => fetchData(p),
            }}
            onSearch={(q) => { setSearch(q); fetchData(1, q); }}
            emptyMessage="No professors found."
          />
        </div>
      </div>
    </Layout>
  );
}
