import React, { useEffect, useState } from 'react';
import api from '../api/axios';

/**
 * BookSelectorTable – Select books and set copies count.
 *
 * Props:
 *   selectedBooks: [{book_id, copies}]
 *   onChange: (newSelectedBooks) => void
 */
export default function BookSelectorTable({ selectedBooks = [], onChange }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/books', { params: { per_page: 500 } })   // fetch all books (no status filter)
      .then((res) => {
        setBooks(res.data?.data || res.data?.items || res.data || []);
      })
      .catch(() => setError('Failed to load books. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const isSelected = (bookId) => selectedBooks.some((sb) => sb.book_id === bookId);

  const getCopies = (bookId) => {
    const sb = selectedBooks.find((s) => s.book_id === bookId);
    return sb ? sb.copies : 1;
  };

  const handleCheck = (book, checked) => {
    if (checked) {
      onChange([...selectedBooks, { book_id: book.id, copies: 1 }]);
    } else {
      onChange(selectedBooks.filter((sb) => sb.book_id !== book.id));
    }
  };

  const handleCopies = (bookId, val) => {
    const n = Math.max(1, parseInt(val, 10) || 1);
    onChange(selectedBooks.map((sb) => sb.book_id === bookId ? { ...sb, copies: n } : sb));
  };

  const PAGE_SIZE = 10;
  const [bookPage, setBookPage] = useState(1);

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.title?.toLowerCase().includes(q) ||
      b.author_name?.toLowerCase().includes(q) ||
      b.book_code?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((bookPage - 1) * PAGE_SIZE, bookPage * PAGE_SIZE);

  // Reset to page 1 when search changes
  React.useEffect(() => { setBookPage(1); }, [search]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" style={{ color: 'var(--vni-primary)' }} />
        <span className="ms-2 text-muted">Loading books...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger py-2 small">{error}</div>;
  }

  return (
    <div>
      {/* Search bar */}
      <div className="d-flex gap-2 align-items-center mb-3">
        <div className="input-group input-group-sm" style={{ maxWidth: '320px' }}>
          <span className="input-group-text bg-white">
            <i className="bi bi-search text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder="Search by title, author or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setSearch('')}>
              <i className="bi bi-x" />
            </button>
          )}
        </div>
        {selectedBooks.length > 0 && (
          <span className="badge rounded-pill ms-2" style={{ background: 'var(--vni-primary)', color: '#fff', fontSize: '0.82rem', padding: '5px 12px' }}>
            <i className="bi bi-check2-circle me-1" />
            {selectedBooks.length} selected
          </span>
        )}
      </div>

      {/* Books list */}
      <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
        {filtered.length === 0 && (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-book fs-3 d-block mb-2" />
            {books.length === 0 ? 'No books in database.' : `No books matching "${search}"`}
          </div>
        )}

        {paginated.map((book) => {
          const selected = isSelected(book.id);
          const isActive = book.status === 'ACTIVE';
          return (
            <div
              key={book.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 1rem',
                borderBottom: '1px solid #f0f0f0',
                background: selected ? '#eef4fb' : '#fff',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => handleCheck(book, !selected)}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                className="form-check-input mt-0 flex-shrink-0"
                id={`book-${book.id}`}
                checked={selected}
                onChange={(e) => { e.stopPropagation(); handleCheck(book, e.target.checked); }}
                style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
              />

              {/* Book info */}
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                    {book.title}
                  </span>
                  {/* Active / Inactive badge */}
                  <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}
                    style={{ fontSize: '0.68rem' }}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-muted d-flex align-items-center gap-2 mt-1 flex-wrap" style={{ fontSize: '0.8rem' }}>
                  {book.author_name && (
                    <span><i className="bi bi-person me-1" />{book.author_name}</span>
                  )}
                  {book.book_code && (
                    <span className="badge bg-light text-secondary border" style={{ fontSize: '0.72rem' }}>
                      ISBN: {book.book_code}
                    </span>
                  )}
                </div>
              </div>

              {/* Copies input — only show when selected */}
              {selected && (
                <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <label className="form-label mb-0 small text-muted d-block" style={{ fontSize: '0.72rem' }}>
                    Copies
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm text-center fw-semibold"
                    min="1"
                    value={getCopies(book.id)}
                    onChange={(e) => handleCopies(book.id, e.target.value)}
                    style={{ width: '70px', borderColor: 'var(--vni-primary)' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: count + pagination */}
      <div className="d-flex align-items-center justify-content-between mt-2">
        <div className="text-muted small">
          Showing <strong>{Math.min((bookPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(bookPage * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> books
          {selectedBooks.length > 0 && <span className="ms-2 text-primary fw-medium">• {selectedBooks.length} selected</span>}
        </div>
        {totalPages > 1 && (
          <div className="d-flex align-items-center gap-1">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setBookPage(p => Math.max(1, p - 1))} disabled={bookPage === 1}>
              <i className="bi bi-chevron-left" />
            </button>
            <span className="small px-2">{bookPage} / {totalPages}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setBookPage(p => Math.min(totalPages, p + 1))} disabled={bookPage === totalPages}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
