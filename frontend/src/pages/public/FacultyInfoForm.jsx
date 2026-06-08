import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';

export default function FacultyInfoForm() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const [submitted, setSubmitted] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setDuplicateError(false);
    setServerError('');
    try {
      const payload = { ...data, request_ref: ref };
      const res = await fetch('http://localhost:8000/api/faculty-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSubmitted(true);
        reset();
      } else if (res.status === 409) {
        setDuplicateError(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        setServerError(errData.detail || errData.message || 'Submission failed. Please try again.');
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="faculty-form-page">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="text-center py-5">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#d1fae5',
                marginBottom: '1.5rem',
              }}
            >
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '2.5rem' }} />
            </div>
            <h3 className="fw-bold" style={{ color: 'var(--vni-primary)' }}>
              Thank You!
            </h3>
            <p className="text-muted mt-2">
              Your information has been submitted successfully.
              <br />
              VNI Publications will get in touch with you shortly.
            </p>
            {ref && (
              <div className="badge bg-light text-secondary border mt-2 py-2 px-3">
                Reference: {ref}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-form-page">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div className="faculty-form-header">
          <div className="d-flex align-items-center gap-3">
            <i className="bi bi-book-half" style={{ fontSize: '2rem', color: '#c8a45a' }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>VNI Publications</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Faculty Information Form</div>
            </div>
          </div>
          {ref && (
            <div className="mt-2 small" style={{ opacity: 0.7 }}>
              Reference: {ref}
            </div>
          )}
        </div>

        {/* Form body */}
        <div className="faculty-form-body">
          <p className="text-muted small mb-4">
            Please fill in your details below. Fields marked with <span className="text-danger">*</span> are required.
          </p>

          {duplicateError && (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              A submission with this mobile number already exists. To update your information please contact VNI Publications.
            </div>
          )}
          {serverError && (
            <div className="alert alert-danger">
              <i className="bi bi-x-circle-fill me-2" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="row g-3">
              {/* Professor Name */}
              <div className="col-md-6">
                <label className="form-label fw-medium">
                  Professor / Faculty Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.professor_name ? 'is-invalid' : ''}`}
                  placeholder="Dr. / Prof. Full Name"
                  {...register('professor_name', { required: 'Name is required' })}
                />
                {errors.professor_name && (
                  <div className="invalid-feedback">{errors.professor_name.message}</div>
                )}
              </div>

              {/* Mobile */}
              <div className="col-md-6">
                <label className="form-label fw-medium">
                  Mobile Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
                  placeholder="10-digit mobile number"
                  {...register('mobile', {
                    required: 'Mobile number is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Enter a valid 10-digit Indian mobile number',
                    },
                  })}
                />
                {errors.mobile && (
                  <div className="invalid-feedback">{errors.mobile.message}</div>
                )}
              </div>

              {/* College Name */}
              <div className="col-12">
                <label className="form-label fw-medium">
                  College / Institution Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.college_name ? 'is-invalid' : ''}`}
                  placeholder="Full name of your college or institution"
                  {...register('college_name', { required: 'College name is required' })}
                />
                {errors.college_name && (
                  <div className="invalid-feedback">{errors.college_name.message}</div>
                )}
              </div>

              {/* Department */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Department</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Computer Science, MCA"
                  {...register('department')}
                />
              </div>

              {/* Student Strength */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Student Strength (approx.)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Number of students"
                  min="1"
                  {...register('student_strength', { min: 1 })}
                />
              </div>

              {/* Subjects Handling */}
              <div className="col-12">
                <label className="form-label fw-medium">Subjects You Handle</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Data Structures, DBMS, Operating Systems"
                  {...register('subjects_handling')}
                />
              </div>

              {/* Current Textbook */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Current Textbook in Use</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Title of current textbook"
                  {...register('current_textbook')}
                />
              </div>

              {/* Current Publisher */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Current Publisher</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Oxford, Pearson, McGraw Hill"
                  {...register('current_publisher')}
                />
              </div>

              {/* Remarks */}
              <div className="col-12">
                <label className="form-label fw-medium">Remarks / Additional Information</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Any additional notes or requests..."
                  {...register('remarks')}
                />
              </div>

              {/* Submit */}
              <div className="col-12 mt-2">
                <button
                  type="submit"
                  className="btn px-4 py-2 fw-semibold text-white"
                  style={{ background: 'var(--vni-primary)' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2" />
                      Submit Information
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="text-center mt-3 text-muted small pb-4">
          Your information is kept confidential and used solely by VNI Publications.
        </div>
      </div>
    </div>
  );
}
