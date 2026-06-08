import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      // Redirect based on role
      switch (user.role) {
        case 'admin':
          navigate('/admin/professors');
          break;
        case 'manager':
          navigate('/manager/pending');
          break;
        case 'sales_rep':
        default:
          navigate('/sales/create-request');
          break;
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card shadow">
        {/* Header */}
        <div className="login-header">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--vni-primary)',
              marginBottom: '1rem',
            }}
          >
            <i className="bi bi-book-half text-white fs-3" />
          </div>
          <div className="brand-title">VNI Publications</div>
          <div className="brand-subtitle mt-1">Complimentary Copy Tracking System</div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger py-2 small mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-3">
            <label className="form-label fw-medium text-dark">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-envelope text-muted" />
              </span>
              <input
                type="email"
                className={`form-control border-start-0 ps-0 ${errors.email ? 'is-invalid' : ''}`}
                placeholder="your@email.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <div className="invalid-feedback">{errors.email.message}</div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-medium text-dark">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-lock text-muted" />
              </span>
              <input
                type="password"
                className={`form-control border-start-0 ps-0 ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 1, message: 'Password is required' },
                })}
              />
              {errors.password && (
                <div className="invalid-feedback">{errors.password.message}</div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn w-100 fw-semibold text-white"
            style={{
              background: 'var(--vni-primary)',
              border: 'none',
              padding: '0.6rem',
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Signing In...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4 text-muted small">
          <i className="bi bi-shield-lock me-1" />
          Secure login — authorized personnel only
        </div>
      </div>
    </div>
  );
}
