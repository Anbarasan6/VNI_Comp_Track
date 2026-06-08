import React, { useState, useCallback, useRef } from 'react';

/**
 * DataTable - reusable Bootstrap table with search, pagination, loading
 *
 * Props:
 *   columns: [{key, label, render?}]
 *   data: array of row objects
 *   loading: boolean
 *   pagination: {page, perPage, total, onPageChange}
 *   onSearch: (query) => void
 *   filters: optional ReactNode slot above the table
 *   actions: optional ReactNode per row - pass as function(row) => ReactNode
 *   exportCsv: optional { onExport: fn, label: string }
 *   rowKey: field name to use as row key (default: 'id')
 *   onRowClick: optional function(row)
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  pagination,
  onPageChange,   // top-level alias for pagination.onPageChange
  onSearch,
  filters,
  actions,
  exportCsv,
  rowKey = 'id',
  onRowClick,
  emptyMessage = 'No records found.',
}) {
  // Normalize pagination object — support both {page,perPage,total,total_pages,onPageChange}
  // and passing onPageChange as a top-level prop
  const pag = pagination ? {
    ...pagination,
    onPageChange: pagination.onPageChange || onPageChange,
    perPage: pagination.perPage || pagination.per_page || 20,
    total: pagination.total || 0,
    page: pagination.page || 1,
  } : null;
  const [searchValue, setSearchValue] = useState('');
  const debounceTimer = useRef(null);

  const handleSearchChange = useCallback(
    (e) => {
      const val = e.target.value;
      setSearchValue(val);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (onSearch) onSearch(val);
      }, 400);
    },
    [onSearch]
  );

  const totalPages = pag
    ? Math.ceil((pag.total || 0) / (pag.perPage || 20))
    : 1;
  const currentPage = pag?.page || 1;

  const renderPagination = () => {
    if (!pag || totalPages <= 1) return null;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) pages.push(i);
    const goTo = pag.onPageChange || (() => {});

    return (
      <div className="d-flex align-items-center justify-content-between mt-3">
        <span className="text-muted small">
          Showing {pag.total === 0 ? 0 : Math.min((currentPage - 1) * pag.perPage + 1, pag.total)}–
          {Math.min(currentPage * pag.perPage, pag.total)} of {pag.total}
        </span>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>
              <i className="bi bi-chevron-left" />
            </button>
          </li>
          {start > 1 && (
            <>
              <li className="page-item"><button className="page-link" onClick={() => goTo(1)}>1</button></li>
              {start > 2 && <li className="page-item disabled"><span className="page-link">…</span></li>}
            </>
          )}
          {pages.map((p) => (
            <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
              <button className="page-link" onClick={() => goTo(p)}>{p}</button>
            </li>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}
              <li className="page-item"><button className="page-link" onClick={() => goTo(totalPages)}>{totalPages}</button></li>
            </>
          )}
          <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages}>
              <i className="bi bi-chevron-right" />
            </button>
          </li>
        </ul>
      </div>
    );
  };

  const hasActions = !!actions;
  const effectiveColumns = hasActions
    ? [...columns, { key: '__actions__', label: 'Actions' }]
    : columns;

  return (
    <div className="vni-card">
      {/* Top bar: filters + search + export */}
      <div className="vni-card-header">
        <div className="d-flex align-items-start gap-2 flex-wrap">
          <div className="flex-grow-1">
            {filters && <div className="mb-2">{filters}</div>}
          </div>
          <div className="d-flex gap-2 align-items-center">
            {onSearch && (
              <div className="search-bar-wrapper">
                <div className="input-group input-group-sm">
                  <span className="input-group-text border-end-0 bg-white">
                    <i className="bi bi-search text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Search..."
                    value={searchValue}
                    onChange={handleSearchChange}
                    style={{ minWidth: '160px' }}
                  />
                </div>
              </div>
            )}
            {exportCsv && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={exportCsv.onExport}
                title="Export CSV"
              >
                <i className="bi bi-download me-1" />
                {exportCsv.label || 'Export'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive" style={{ position: 'relative', minHeight: '120px' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div className="spinner-border spinner-border-sm" style={{ color: 'var(--vni-primary)' }} />
          </div>
        )}
        <table className="table table-hover vni-table mb-0">
          <thead>
            <tr>
              {effectiveColumns.map((col) => (
                <th key={col.key} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={effectiveColumns.length}>
                  <div className="empty-state">
                    <i className="bi bi-inbox" />
                    <p className="mb-0">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
            {data.map((row, idx) => (
              <tr
                key={row[rowKey] ?? idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {effectiveColumns.map((col) => (
                  <td key={col.key}>
                    {col.key === '__actions__'
                      ? actions(row)
                      : col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pag && (
        <div className="p-3 border-top">{renderPagination()}</div>
      )}
    </div>
  );
}
