import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../api/axios';
import { formatDate, formatBooks, formatRequestNo } from '../../utils/formatters';

const STATUS_OPTIONS = ['APPROVED', 'DISPATCHED', 'DELIVERED'];

export default function ApprovedRequests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = statusFilter || 'APPROVED,DISPATCHED,DELIVERED';
      const res = await api.get('/requests', {
        params: {
          status: statuses,
          page,
          per_page: perPage,
          search: search || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      const d = res.data;
      setData(d.items || d.data || []);
      setTotal(d.total || 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      key: 'request_no',
      label: 'Request No',
      render: (val) => <span className="fw-medium">{formatRequestNo(val)}</span>,
    },
    {
      key: 'professor',
      label: 'Professor',
      render: (_, row) => row.professor?.name || '—',
    },
    {
      key: 'college',
      label: 'College',
      render: (_, row) => row.professor?.college_name || row.professor?.college || '—',
    },
    {
      key: 'sales_rep_name',
      label: 'Sales Rep',
      render: (val) => val || '—',
    },
    {
      key: 'books',
      label: 'Books',
      render: (_, row) => {
        const text = formatBooks(row.books || row.request_books || []);
        return <span title={text} style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>;
      },
    },
    {
      key: 'delivery_type',
      label: 'Delivery',
      render: (val) => val === 'HAND_DELIVERY'
        ? <span className="badge bg-info text-dark">Hand</span>
        : <span className="badge bg-secondary">Dispatch</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'approved_at',
      label: 'Approved',
      render: (val) => formatDate(val),
    },
    {
      key: 'dispatch_date',
      label: 'Dispatched',
      render: (val) => formatDate(val),
    },
    {
      key: 'delivery_date',
      label: 'Delivered',
      render: (val) => formatDate(val),
    },
  ];

  const filters = (
    <div className="d-flex gap-2 flex-wrap">
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 160 }}
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
      >
        <option value="">All (Approved+)</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        type="date"
        className="form-control form-control-sm"
        style={{ maxWidth: 150 }}
        value={dateFrom}
        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        title="Date from"
      />
      <input
        type="date"
        className="form-control form-control-sm"
        style={{ maxWidth: 150 }}
        value={dateTo}
        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        title="Date to"
      />
    </div>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <i className="bi bi-check-circle me-2" />
          Approved Requests
        </h1>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page, perPage, total, onPageChange: setPage }}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        filters={filters}
        rowKey="id"
        emptyMessage="No approved requests found."
      />
    </Layout>
  );
}
