// Helper utilities for formatting data across the app

/**
 * Format ISO date string to 'DD MMM YYYY'
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO date string to 'DD MMM YYYY HH:MM'
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const date = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${date} ${time}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format books array to readable string
 * books: array of { book: { title, author }, copies }
 */
export function formatBooks(books) {
  if (!books || books.length === 0) return '—';
  return books
    .map((b) => {
      const title = b.book?.title || b.title || '';
      const author = b.book?.author_name || b.author_name || b.book?.author || b.author || '';
      const copies = b.copies || 1;
      const authorPart = author ? ` – ${author}` : '';
      return `${title}${authorPart} (${copies} ${copies === 1 ? 'Copy' : 'Copies'})`;
    })
    .join(', ');
}

/**
 * Return request number as-is (already formatted by backend)
 */
export function formatRequestNo(no) {
  return no || '—';
}

/**
 * Get Bootstrap badge class based on role
 */
export function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin':
      return 'bg-danger';
    case 'manager':
      return 'bg-warning text-dark';
    case 'sales_rep':
      return 'bg-info text-dark';
    default:
      return 'bg-secondary';
  }
}

/**
 * Humanize role label
 */
export function humanizeRole(role) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'sales_rep':
      return 'Sales Rep';
    default:
      return role || 'Unknown';
  }
}
