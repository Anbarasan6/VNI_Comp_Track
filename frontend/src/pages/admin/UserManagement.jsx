import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout.jsx';
import DataTable from '../../components/DataTable.jsx';
import api from '../../api/axios.js';
import { getRoleBadgeClass, humanizeRole } from '../../utils/formatters.js';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchUsers = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page, per_page: pagination.per_page };
      if (q) params.search = q;
      const res = await api.get('/users', { params });
      setUsers(res.data.data || res.data || []);
      if (res.data.total !== undefined) {
        setPagination(p => ({
          ...p,
          page: res.data.page || page,
          total: res.data.total,
          total_pages: res.data.total_pages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page, search]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (q) => {
    setSearch(q);
    fetchUsers(1, q);
  };

  const openAddModal = () => {
    setEditUser(null);
    reset({ name: '', email: '', password: '', role: 'sales_rep', is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    reset({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
    });
    setError('');
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        const payload = { name: data.name, role: data.role, is_active: data.is_active };
        if (data.password) payload.password = data.password;
        await api.put(`/users/${editUser.id}`, payload);
      } else {
        await api.post('/users', data);
      }
      setShowModal(false);
      fetchUsers(pagination.page);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (!confirm(`${user.is_active ? 'Deactivate' : 'Activate'} user "${user.name}"?`)) return;
    try {
      await api.put(`/users/${user.id}/toggle-active`);
      fetchUsers(pagination.page);
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (_, row) => (
        <span className={`badge ${getRoleBadgeClass(row.role)}`}>
          {humanizeRole(row.role)}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, row) => (
        <span className={`badge ${row.is_active ? 'bg-success' : 'bg-danger'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => openEditModal(row)}
            id={`edit-user-${row.id}`}
          >
            <i className="bi bi-pencil" />
          </button>
          <button
            className={`btn btn-sm ${row.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
            onClick={() => handleToggleActive(row)}
            id={`toggle-user-${row.id}`}
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            <i className={`bi ${row.is_active ? 'bi-pause-circle' : 'bi-play-circle'}`} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-people me-2" />
          User Management
        </h1>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openAddModal} id="btn-add-user">
          <i className="bi bi-person-plus" />
          Add User
        </button>
      </div>

      <div className="vni-card">
        <div className="vni-card-header">
          <h5>System Users</h5>
        </div>
        <div className="p-3">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            pagination={pagination}
            onPageChange={(p) => fetchUsers(p)}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--vni-primary)', color: '#fff' }}>
                <h5 className="modal-title">
                  <i className="bi bi-person me-2" />
                  {editUser ? 'Edit User' : 'Add New User'}
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                  )}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name *</label>
                    <input
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      {...register('name', { required: 'Name is required' })}
                      id="user-name"
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email *</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                      })}
                      disabled={!!editUser}
                      id="user-email"
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Password {editUser ? '(leave blank to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      {...register('password', {
                        required: !editUser ? 'Password is required' : false,
                        minLength: editUser ? undefined : { value: 6, message: 'Min 6 characters' },
                      })}
                      id="user-password"
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      {...register('role', { required: true })}
                      id="user-role"
                    >
                      <option value="sales_rep">Sales Rep</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {editUser && (
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        {...register('is_active')}
                        id="user-is-active"
                      />
                      <label className="form-check-label" htmlFor="user-is-active">Active</label>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                    {editUser ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
