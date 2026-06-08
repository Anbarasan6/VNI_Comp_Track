import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';

/**
 * ProfessorSearchModal – search existing professors OR add a new one inline.
 *
 * Props:
 *   show: boolean
 *   onHide: fn
 *   onSelect: fn(professor)
 */
export default function ProfessorSearchModal({ show, onHide, onSelect }) {
  const [view, setView] = useState('search'); // 'search' | 'add'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (show) {
      setView('search');
      setQuery('');
      setResults([]);
      setError('');
      setAddError('');
      reset({});
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [show]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/professors', { params: { search: q, per_page: 20 } });
      setResults(res.data?.items || res.data?.data || res.data || []);
    } catch {
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleSelect = (prof) => { onSelect(prof); onHide(); };

  const cleanPayload = (raw) => {
    const allowed = ['title', 'initial', 'name', 'designation', 'department', 'university',
      'college_name', 'address_line_1', 'address_line_2', 'city', 'pincode', 'mobile', 'email'];
    const clean = {};
    allowed.forEach((key) => {
      const val = raw[key];
      clean[key] = (val === '' || val === null || val === undefined) ? null : val;
    });
    const required = ['title', 'name', 'college_name', 'mobile'];
    Object.keys(clean).forEach(k => { if (clean[k] === null && !required.includes(k)) delete clean[k]; });
    return clean;
  };

  const onAddSubmit = async (data) => {
    setAddSaving(true);
    setAddError('');
    try {
      const res = await api.post('/professors', cleanPayload(data));
      onSelect(res.data);
      onHide();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setAddError(Array.isArray(detail) ? detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join('; ') : detail || 'Save failed');
    } finally {
      setAddSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="modal d-flex align-items-start justify-content-center pt-3"
      style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1055, overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onHide(); }}
    >
      <div className="modal-dialog modal-lg w-100 m-0 mb-4" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header py-3" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
            <h5 className="modal-title fw-semibold">
              <i className={`bi ${view === 'search' ? 'bi-search' : 'bi-person-plus'} me-2`} />
              {view === 'search' ? 'Search Professor' : 'Add New Professor'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide} />
          </div>

          {/* Tab switcher */}
          <div className="d-flex border-bottom">
            <button
              className={`btn btn-sm px-4 py-2 rounded-0 fw-medium ${view === 'search' ? 'text-white' : 'btn-outline-secondary border-0'}`}
              style={view === 'search' ? { background: 'var(--vni-primary)' } : {}}
              onClick={() => setView('search')}
            >
              <i className="bi bi-search me-1" />Search Existing
            </button>
            <button
              className={`btn btn-sm px-4 py-2 rounded-0 fw-medium ${view === 'add' ? 'text-white' : 'btn-outline-secondary border-0'}`}
              style={view === 'add' ? { background: 'var(--vni-gold, #c8a45a)' } : {}}
              onClick={() => setView('add')}
            >
              <i className="bi bi-plus-lg me-1" />Add New Professor
            </button>
          </div>

          {/* ── SEARCH VIEW ── */}
          {view === 'search' && (
            <div className="modal-body p-3">
              <div className="input-group mb-3">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="form-control"
                  placeholder="Search by name, college, department, city, mobile..."
                  value={query}
                  onChange={handleQueryChange}
                  autoComplete="off"
                />
                {loading && (
                  <span className="input-group-text bg-white">
                    <div className="spinner-border spinner-border-sm text-secondary" />
                  </span>
                )}
              </div>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {!loading && results.length === 0 && query.length > 0 && (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-inbox fs-3 d-block mb-2" />
                    No professors found for "{query}"
                    <div className="mt-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setView('add')}>
                        <i className="bi bi-plus-lg me-1" />Add New Professor
                      </button>
                    </div>
                  </div>
                )}
                {results.length === 0 && query.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-person-search fs-3 d-block mb-2" />
                    Type to search for a professor
                  </div>
                )}
                {results.length > 0 && (
                  <table className="table table-hover vni-table mb-0">
                    <thead>
                      <tr><th>Name</th><th>College</th><th>Department</th><th>City</th><th>Mobile</th></tr>
                    </thead>
                    <tbody>
                      {results.map(prof => (
                        <tr key={prof.id} style={{ cursor: 'pointer' }} onClick={() => handleSelect(prof)}>
                          <td className="fw-medium">{prof.name}</td>
                          <td>{prof.college_name || prof.college}</td>
                          <td>{prof.department || '—'}</td>
                          <td>{prof.city || '—'}</td>
                          <td>{prof.mobile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── ADD NEW PROFESSOR VIEW ── */}
          {view === 'add' && (
            <form onSubmit={handleSubmit(onAddSubmit)} noValidate>
              <div className="modal-body p-3">
                {addError && <div className="alert alert-danger py-2 small mb-3">{addError}</div>}
                <div className="row g-3">
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
                    <input className="form-control" placeholder="Landmark / PO Box" {...register('address_line_2')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">City</label>
                    <input className="form-control" {...register('city')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Pincode</label>
                    <input className="form-control" {...register('pincode')} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setView('search')}>
                  <i className="bi bi-arrow-left me-1" />Back to Search
                </button>
                <button type="submit" className="btn btn-sm text-white" style={{ background: 'var(--vni-primary)' }} disabled={addSaving}>
                  {addSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-person-check me-1" />}
                  Save &amp; Select
                </button>
              </div>
            </form>
          )}

          {view === 'search' && (
            <div className="modal-footer py-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={onHide}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
