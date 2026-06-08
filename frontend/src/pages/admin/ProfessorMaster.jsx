import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import api from '../../api/axios';

const ROLE_OPTIONS = ['sales_rep', 'manager', 'admin'];
const ROLE_LABELS = { sales_rep: 'Sales Rep', manager: 'Manager', admin: 'Admin' };
const ROLE_BADGE = { sales_rep: 'bg-info text-dark', manager: 'bg-warning text-dark', admin: 'bg-danger' };

export default function ProfessorMaster() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [colleges, setColleges] = useState([]);
  const [cities, setCities] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editProf, setEditProf] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/professors', {
        params: {
          page, per_page: perPage,
          search: search || undefined,
          college: collegeFilter || undefined,
          department: deptFilter || undefined,
          city: cityFilter || undefined,
          sales_rep_id: salesRepFilter || undefined,
        },
      });
      const d = res.data;
      setData(d.items || d.data || []);
      setTotal(d.total || 0);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, search, collegeFilter, deptFilter, cityFilter, salesRepFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/professors/colleges').then((r) => {
      setColleges(r.data || []);
    }).catch(() => {});
    api.get('/professors/cities').then((r) => {
      setCities(r.data || []);
    }).catch(() => {});
  }, []);

  const openAdd = () => { setEditProf(null); reset({}); setShowModal(true); };
  const openEdit = (prof) => { setEditProf(prof); reset(prof); setShowModal(true); };

  const cleanPayload = (raw) => {
    // Backend-accepted fields only; convert "" to null for optional fields
    const allowed = [
      'title', 'initial', 'name', 'designation', 'department', 'university',
      'college_name', 'address_line_1', 'address_line_2', 'city', 'pincode',
      'mobile', 'email',
    ];
    const clean = {};
    allowed.forEach((key) => {
      const val = raw[key];
      if (val === '' || val === null || val === undefined) {
        clean[key] = null;
      } else if (key === 'sales_person_id') {
        clean[key] = parseInt(val, 10) || null;
      } else {
        clean[key] = val;
      }
    });
    // Remove null optionals to keep payload minimal (keep required fields)
    const required = ['title', 'name', 'college_name', 'mobile'];
    Object.keys(clean).forEach((k) => {
      if (clean[k] === null && !required.includes(k)) delete clean[k];
    });
    return clean;
  };

  const onModalSubmit = async (data) => {
    setModalSaving(true);
    try {
      const payload = cleanPayload(data);
      if (editProf) {
        await api.put(`/professors/${editProf.id}`, payload);
      } else {
        await api.post('/professors', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join('\n')
        : detail || 'Save failed';
      alert(msg);
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete professor "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/professors/${row.id}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed');
    }
  };

  const handleImportCsv = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    api.post('/professors/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => {
        const { created, skipped, errors } = res.data;
        alert(`Import done! Created: ${created}, Skipped: ${skipped}${errors?.length ? '\nErrors: ' + errors.slice(0, 3).join('; ') : ''}`);
        fetchData();
      })
      .catch((err) => alert(err?.response?.data?.detail || 'Import failed'));
    e.target.value = '';
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/professors/export-csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url; link.download = 'professors.csv'; link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="fw-medium">{v}</span> },
    { key: 'college_name', label: 'College', render: (v, r) => v || r.college || '—' },
    { key: 'department', label: 'Department', render: v => v || '—' },
    { key: 'city', label: 'City', render: v => v || '—' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email', render: v => v || '—' },
    { key: 'sales_rep_name', label: 'Sales Rep', render: (v, r) => v || r.sales_person?.name || '—' },
  ];

  const renderActions = (row) => (
    <div className="d-flex gap-1">
      <button className="btn btn-xs btn-outline-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}
        onClick={(e) => { e.stopPropagation(); openEdit(row); }} title="Edit">
        <i className="bi bi-pencil" />
      </button>
      <button className="btn btn-xs btn-outline-danger" style={{ fontSize: '0.75rem', padding: '2px 8px' }}
        onClick={(e) => { e.stopPropagation(); handleDelete(row); }} title="Delete">
        <i className="bi bi-trash" />
      </button>
    </div>
  );

  const filters = (
    <div className="d-flex gap-2 flex-wrap align-items-center">
      <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={collegeFilter} onChange={(e) => { setCollegeFilter(e.target.value); setPage(1); }}>
        <option value="">All Colleges</option>
        {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="text" className="form-control form-control-sm" style={{ maxWidth: 160 }} placeholder="Department..." value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} />
      <select className="form-select form-select-sm" style={{ maxWidth: 150 }} value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}>
        <option value="">All Cities</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="ms-auto d-flex gap-2">
        <label className="btn btn-sm btn-outline-secondary mb-0">
          <i className="bi bi-upload me-1" />Import CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
        </label>
        <button className="btn btn-sm" style={{ background: 'var(--vni-primary)', color: '#fff' }} onClick={openAdd}>
          <i className="bi bi-plus-lg me-1" />Add Professor
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title"><i className="bi bi-person-lines-fill me-2" />Professor Master</h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        filters={filters}
        actions={renderActions}
        exportCsv={{ onExport: handleExportCsv, label: 'Export CSV' }}
        rowKey="id"
        emptyMessage="No professors found."
      />

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal d-flex align-items-start justify-content-center pt-4" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1055, overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg m-0 w-100 mb-4" style={{ maxWidth: 800 }}>
            <form className="modal-content" onSubmit={handleSubmit(onModalSubmit)} noValidate>
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title">{editProf ? 'Edit Professor' : 'Add Professor'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                              <div className="row g-3">
                  {/* Title */}
                  <div className="col-md-3">
                    <label className="form-label fw-medium">Title <span className="text-danger">*</span></label>
                    <select className={`form-select ${errors.title ? 'is-invalid' : ''}`} {...register('title', { required: 'Required' })}>
                      <option value="">Select</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                      <option value="Prof">Prof</option>
                    </select>
                    {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                  </div>
                  {/* Initial */}
                  <div className="col-md-3">
                    <label className="form-label fw-medium">Initial</label>
                    <input className="form-control" placeholder="e.g. K" {...register('initial')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Name <span className="text-danger">*</span></label>
                    <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: 'Required' })} />
                    {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Mobile <span className="text-danger">*</span></label>
                    <input className={`form-control ${errors.mobile ? 'is-invalid' : ''}`} {...register('mobile', { required: 'Required' })} />
                    {errors.mobile && <div className="invalid-feedback">{errors.mobile.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email</label>
                    <input type="email" className="form-control" {...register('email')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Designation</label>
                    <input className="form-control" placeholder="e.g. Assistant Professor" {...register('designation')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">College Name <span className="text-danger">*</span></label>
                    <input className={`form-control ${errors.college_name ? 'is-invalid' : ''}`} {...register('college_name', { required: 'Required' })} />
                    {errors.college_name && <div className="invalid-feedback">{errors.college_name.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Department</label>
                    <input className="form-control" {...register('department')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">University</label>
                    <input className="form-control" {...register('university')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Address Line 1</label>
                    <input className="form-control" placeholder="Street / Area" {...register('address_line_1')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Address Line 2</label>
                    <input className="form-control" placeholder="Landmark / PO" {...register('address_line_2')} />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-medium">City</label>
                    <input className="form-control" {...register('city')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Pincode</label>
                    <input className="form-control" {...register('pincode')} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm text-white" style={{ background: 'var(--vni-primary)' }} disabled={modalSaving}>
                  {modalSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-floppy me-1" />}
                  {editProf ? 'Save Changes' : 'Add Professor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
