import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import BookSelectorTable from '../../components/BookSelectorTable';

/* ─── Inline Add-New-Professor form ─────────────────────────────────────── */
function AddProfessorForm({ onSaved, onCancel, onSearchInstead }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [savedProf, setSavedProf] = useState(null);

  const onSubmit = async (data) => {
    setSaving(true); setErr('');
    const payload = {
      title: data.title,
      name: data.name?.trim(),
      mobile: data.mobile?.trim(),
      college_name: data.college_name?.trim(),
    };
    const optionals = ['initial','designation','department','university','address_line_1','address_line_2','city','pincode','email'];
    optionals.forEach(k => { if (data[k]?.trim()) payload[k] = data[k].trim(); });

    try {
      const res = await api.post('/professors', payload);
      setSavedProf(res.data);   // show success step first
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 409) {
        // Duplicate mobile or email
        setIsDuplicate(true);
        setErr(typeof detail === 'string' ? detail : 'A professor with this mobile number already exists.');
      } else if (Array.isArray(detail)) {
        setErr(detail.map(x => `${x.field || ''}: ${x.msg || x.message || ''}`).join(' | '));
      } else if (typeof detail === 'string') {
        setErr(detail);
      } else {
        setErr(`HTTP ${status || 'error'} — Save failed. Please check your inputs.`);
      }
    } finally { setSaving(false); }
  };

  // Show success screen with a "Continue" button
  if (savedProf) {
    return (
      <div className="p-4 rounded text-center" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
        <i className="bi bi-person-check-fill text-success d-block mb-2" style={{ fontSize: '2.5rem' }} />
        <div className="fw-bold text-success mb-1" style={{ fontSize: '1.1rem' }}>Professor Saved Successfully!</div>
        <div className="text-muted small mb-3">
          <strong>{savedProf.name}</strong>
          {savedProf.college_name ? ` — ${savedProf.college_name}` : ''}
          {savedProf.mobile ? ` | ${savedProf.mobile}` : ''}
        </div>
        <button
          type="button"
          className="btn btn-success px-4"
          onClick={() => onSaved(savedProf)}
        >
          <i className="bi bi-arrow-right-circle me-1" />
          Use This Professor &amp; Continue
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Duplicate error: show special banner with search suggestion */}
      {isDuplicate && (
        <div className="alert alert-warning mb-3">
          <div className="fw-semibold mb-1"><i className="bi bi-exclamation-triangle-fill me-1" />Already Registered</div>
          <div className="small mb-2">{err}</div>
          <div className="small text-muted">Use <strong>Search Professor</strong> to find and select the existing record.</div>
          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn btn-sm btn-warning" onClick={onSearchInstead || onCancel}>
              <i className="bi bi-search me-1" />Search Instead
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary"
              onClick={() => { setIsDuplicate(false); setErr(''); }}>
              Change Mobile &amp; Try Again
            </button>
          </div>
        </div>
      )}
      {/* General error */}
      {!isDuplicate && err && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="bi bi-exclamation-triangle-fill me-1" />{err}
        </div>
      )}
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label fw-medium">Title <span className="text-danger">*</span></label>
          <select className={`form-select ${errors.title ? 'is-invalid' : ''}`} {...register('title', { required: 'Required' })}>
            <option value="">Select</option>
            {['Mr','Mrs','Ms','Dr','Prof'].map(t => <option key={t} value={t}>{t}</option>)}
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
        <div className="col-12 d-flex gap-2 justify-content-end mt-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-sm text-white" style={{ background: 'var(--vni-primary)' }} disabled={saving}
            onClick={handleSubmit(onSubmit)}>
            {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-person-check me-1" />}
            Save Professor
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Search Professor inline ────────────────────────────────────────────── */
function SearchProfessorInline({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      // Search ALL professors (no sales_rep filter) — backend returns all
      const res = await api.get('/professors', { params: { search: q, per_page: 20 } });
      setResults(res.data?.data || res.data?.items || res.data || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const v = e.target.value; setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 400);
  };

  const handleSelect = async (prof) => {
    // Only claim if professor has NO assigned sales rep yet
    try {
      const me = JSON.parse(localStorage.getItem('vni_user') || '{}');
      if (me?.id && !prof.sales_person_id) {
        // Professor is unassigned — claim them for this sales rep
        const updated = await api.put(`/professors/${prof.id}`, { sales_person_id: me.id });
        prof = { ...prof, ...updated.data };
      }
    } catch { /* non-critical — proceed with select even if claim fails */ }
    onSelect(prof);
  };

  return (
    <div>
      <div className="input-group mb-2">
        <span className="input-group-text bg-white"><i className="bi bi-search text-muted" /></span>
        <input ref={inputRef} type="text" className="form-control"
          placeholder="Search by name, college, department, mobile..."
          value={query} onChange={handleChange} autoComplete="off" />
        {loading && <span className="input-group-text bg-white"><div className="spinner-border spinner-border-sm text-secondary" /></span>}
      </div>

      {query && results.length === 0 && !loading && (
        <div className="text-muted small py-2 text-center">No professors found for "{query}"</div>
      )}
      {!query && (
        <div className="text-muted small py-2 text-center"><i className="bi bi-person-search me-1" />Type to search professors</div>
      )}

      {results.length > 0 && (
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table className="table table-hover table-sm vni-table mb-0">
            <thead>
              <tr><th>Name</th><th>College</th><th>Department</th><th>Mobile</th><th>Sales Rep</th></tr>
            </thead>
            <tbody>
              {results.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handleSelect(p)}>
                  <td className="fw-medium">{p.title} {p.initial} {p.name}</td>
                  <td>{p.college_name || '—'}</td>
                  <td>{p.department || '—'}</td>
                  <td>{p.mobile}</td>
                  <td><span className="text-muted small">{p.sales_rep_name || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function CreateRequest() {
  const [professor, setProfessor]       = useState(null);
  const [profMode, setProfMode]         = useState('none'); // 'none' | 'search' | 'add'
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [addressType, setAddressType]   = useState('COLLEGE');
  const [deliveryType, setDeliveryType] = useState('OFFICE_DISPATCH');
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(null);
  const [error, setError]               = useState('');

  // College address editable fields (pre-filled from professor)
  const [colDesignation, setColDesignation] = useState('');
  const [colDepartment, setColDepartment]   = useState('');
  const [colCollege, setColCollege]         = useState('');
  const [colCity, setColCity]               = useState('');
  const [colPincode, setColPincode]         = useState('');

  // Residential address editable fields
  const [resAddr1, setResAddr1] = useState('');
  const [resAddr2, setResAddr2] = useState('');
  const [resCity, setResCity]   = useState('');
  const [resPincode, setResPincode] = useState('');

  const { register, handleSubmit, reset } = useForm();

  const fillFromProfessor = (prof) => {
    setProfessor(prof);
    setProfMode('none');
    setAddressType('COLLEGE');
    setColDesignation(prof.designation || '');
    setColDepartment(prof.department || '');
    setColCollege(prof.college_name || '');
    setColCity(prof.city || '');
    setColPincode(prof.pincode || '');
    setResAddr1(prof.address_line_1 || '');
    setResAddr2(prof.address_line_2 || '');
    setResCity(prof.city || '');
    setResPincode(prof.pincode || '');
  };

  const onSubmit = async (data) => {
    if (!professor) { setError('Please select a professor.'); return; }
    if (selectedBooks.length === 0) { setError('Please select at least one book.'); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = {
        professor_id: professor.id,
        books: selectedBooks,
        delivery_type: deliveryType,
        address_type: addressType,
        remarks: data.remarks?.trim() || null,
      };
      const res = await api.post('/requests', payload);
      const requestId = res.data?.id;

      // 4. HAND_DELIVERY → immediately mark as DELIVERED
      if (deliveryType === 'HAND_DELIVERY' && requestId) {
        await api.put(`/requests/${requestId}/deliver`, {
          delivery_date: new Date().toISOString(),
        });
        setSuccess(`${res.data?.request_no} — Hand Delivery marked as Delivered!`);
      } else {
        setSuccess(res.data?.request_no || 'Request submitted!');
      }

      // Reset
      setProfessor(null); setProfMode('none');
      setSelectedBooks([]);
      setAddressType('COLLEGE'); setDeliveryType('OFFICE_DISPATCH');
      setColDesignation(''); setColDepartment(''); setColCollege(''); setColCity(''); setColPincode('');
      setResAddr1(''); setResAddr2(''); setResCity(''); setResPincode('');
      reset();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title"><i className="bi bi-plus-circle me-2" />Create Complimentary Request</h1>
      </div>

      {success && (
        <div className="alert alert-success d-flex align-items-center justify-content-between">
          <span><i className="bi bi-check-circle-fill me-2" />Request submitted! <strong>{success}</strong></span>
          <button className="btn-close" onClick={() => setSuccess(null)} />
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span><i className="bi bi-exclamation-triangle-fill me-2" />{error}</span>
          <button className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Section 1: Professor / Faculty ─────────────────────────────── */}
        <div className="vni-card mb-4">
          <div className="vni-card-header">
            <h5><i className="bi bi-person-circle me-2 text-muted" />Professor / Faculty</h5>
          </div>
          <div className="p-3">

            {/* Two separate action buttons */}
            {profMode === 'none' && (
              <div className="d-flex gap-2 mb-3">
                <button type="button" className="btn btn-sm"
                  style={{ background: 'var(--vni-primary)', color: '#fff' }}
                  onClick={() => setProfMode('search')}>
                  <i className="bi bi-search me-1" />{professor ? 'Change Professor' : 'Search Professor'}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary"
                  onClick={() => setProfMode('add')}>
                  <i className="bi bi-person-plus me-1" />Add New Professor
                </button>
              </div>
            )}

            {/* Search inline */}
            {profMode === 'search' && (
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-medium small text-primary"><i className="bi bi-search me-1" />Search Professor</span>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setProfMode('none')}>
                    <i className="bi bi-x" /> Close
                  </button>
                </div>
                <SearchProfessorInline onSelect={fillFromProfessor} />
              </div>
            )}

            {/* Add new inline */}
            {profMode === 'add' && (
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="fw-medium small" style={{ color: 'var(--vni-primary)' }}>
                    <i className="bi bi-person-plus me-1" />Add New Professor
                  </span>
                </div>
                <AddProfessorForm
                  onSaved={fillFromProfessor}
                  onCancel={() => setProfMode('none')}
                  onSearchInstead={() => setProfMode('search')}
                />
              </div>
            )}

            {/* Selected professor card */}
            {professor && profMode === 'none' && (
              <div className="p-3 rounded" style={{ background: '#f0f7ff', border: '1px solid #c3dafe' }}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="badge" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                    <i className="bi bi-person-check me-1" />Professor Selected
                  </span>
                  <button type="button" className="btn btn-xs btn-outline-secondary" style={{ fontSize: '0.7rem', padding: '1px 8px' }}
                    onClick={() => { setProfessor(null); }}>
                    <i className="bi bi-x" /> Clear
                  </button>
                </div>
                <div className="row g-2">
                  <div className="col-md-6"><div className="small text-muted">Name</div><div className="fw-semibold">{professor.name}</div></div>
                  <div className="col-md-6"><div className="small text-muted">College</div><div>{professor.college_name || '—'}</div></div>
                  <div className="col-md-4"><div className="small text-muted">Department</div><div>{professor.department || '—'}</div></div>
                  <div className="col-md-4"><div className="small text-muted">City</div><div>{professor.city || '—'}</div></div>
                  <div className="col-md-4"><div className="small text-muted">Mobile</div><div>{professor.mobile || '—'}</div></div>
                  {professor.email && <div className="col-12"><div className="small text-muted">Email</div><div>{professor.email}</div></div>}
                </div>
              </div>
            )}

            {!professor && profMode === 'none' && (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-person-search fs-2 d-block mb-2" />
                Use <strong>Search Professor</strong> to find an existing professor, or <strong>Add New Professor</strong> to create one.
              </div>
            )}
          </div>
        </div>

        {/* ── Section 2: Books ─────────────────────────────────────────────── */}
        <div className="vni-card mb-4">
          <div className="vni-card-header">
            <h5><i className="bi bi-book me-2 text-muted" />Select Books</h5>
          </div>
          <div className="p-3">
            <BookSelectorTable selectedBooks={selectedBooks} onChange={setSelectedBooks} />
          </div>
        </div>

        {/* ── Section 3: Delivery Details ──────────────────────────────────── */}
        <div className="vni-card mb-4">
          <div className="vni-card-header">
            <h5><i className="bi bi-truck me-2 text-muted" />Delivery Details</h5>
          </div>
          <div className="p-3">
            <div className="row g-4">

              {/* Delivery Type */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Delivery Type</label>
                <div className="d-flex gap-4 mt-1">
                  {[
                    { val: 'HAND_DELIVERY',  label: 'Hand Delivery',  icon: 'bi-hand-index-thumb' },
                    { val: 'OFFICE_DISPATCH', label: 'Office Dispatch', icon: 'bi-truck' },
                  ].map(opt => (
                    <div key={opt.val} className="form-check">
                      <input type="radio" className="form-check-input" id={`dt-${opt.val}`}
                        name="deliveryType" value={opt.val} checked={deliveryType === opt.val}
                        onChange={() => setDeliveryType(opt.val)} />
                      <label className="form-check-label" htmlFor={`dt-${opt.val}`}>
                        <i className={`bi ${opt.icon} me-1`} />{opt.label}
                      </label>
                    </div>
                  ))}
                </div>
                {deliveryType === 'HAND_DELIVERY' && (
                  <div className="mt-2 p-2 rounded small" style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
                    <i className="bi bi-info-circle me-1 text-warning" />
                    Hand Delivery will be marked as <strong>Delivered</strong> immediately on submit.
                  </div>
                )}
              </div>

              {/* Address Type */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Address Type</label>
                <select className="form-select" value={addressType} onChange={e => setAddressType(e.target.value)}>
                  <option value="COLLEGE">College Address</option>
                  <option value="RESIDENTIAL">Residential Address</option>
                </select>
              </div>

              {/* College Address — editable */}
              {addressType === 'COLLEGE' && (
                <>
                  <div className="col-12">
                    <label className="form-label fw-medium small text-muted">
                      <i className="bi bi-building me-1" />Delivery Address (College) — editable
                    </label>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Designation</label>
                    <input className="form-control" value={colDesignation}
                      onChange={e => setColDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Department</label>
                    <input className="form-control" value={colDepartment}
                      onChange={e => setColDepartment(e.target.value)}
                      placeholder="e.g. Department of Commerce" />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">College Name</label>
                    <input className="form-control" value={colCollege}
                      onChange={e => setColCollege(e.target.value)}
                      placeholder="College name" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">City</label>
                    <input className="form-control" value={colCity}
                      onChange={e => setColCity(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Pincode</label>
                    <input className="form-control" value={colPincode}
                      onChange={e => setColPincode(e.target.value)} />
                  </div>
                </>
              )}

              {/* Residential Address — editable */}
              {addressType === 'RESIDENTIAL' && (
                <>
                  <div className="col-12">
                    <label className="form-label fw-medium small text-muted">
                      <i className="bi bi-house me-1" />Residential Address — editable
                    </label>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Address Line 1</label>
                    <input className="form-control" value={resAddr1}
                      onChange={e => setResAddr1(e.target.value)} placeholder="Street / Area" />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium">Address Line 2</label>
                    <input className="form-control" value={resAddr2}
                      onChange={e => setResAddr2(e.target.value)} placeholder="Landmark / PO Box" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">City</label>
                    <input className="form-control" value={resCity} onChange={e => setResCity(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Pincode</label>
                    <input className="form-control" value={resPincode} onChange={e => setResPincode(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 4: Remarks ───────────────────────────────────────────── */}
        <div className="vni-card mb-4">
          <div className="vni-card-header">
            <h5><i className="bi bi-chat-left-text me-2 text-muted" />Remarks (Optional)</h5>
          </div>
          <div className="p-3">
            <textarea className="form-control" rows={3}
              placeholder="Any additional notes or special instructions..."
              {...register('remarks')} />
          </div>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────────── */}
        <div className="d-flex justify-content-end gap-3">
          <button type="button" className="btn btn-outline-secondary"
            onClick={() => { setProfessor(null); setProfMode('none'); setSelectedBooks([]); reset(); setError(''); }}>
            <i className="bi bi-x-circle me-1" />Reset
          </button>
          <button type="submit" className="btn text-white px-4"
            style={{ background: 'var(--vni-primary)' }} disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2" />Submitting...</>
              : <><i className="bi bi-send me-2" />
                {deliveryType === 'HAND_DELIVERY' ? 'Submit & Mark Delivered' : 'Submit Request'}
              </>}
          </button>
        </div>
      </form>
    </Layout>
  );
}
