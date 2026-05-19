import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import DataTable, { ActionButton, StatusBadge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { driverStore } from '../state/index.js';
import { useStore } from '../hooks/useStore.js';
import { toast } from '../components/Toast.jsx';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const columns = [
  { key: 'request_number', label: 'Order #' },
  { key: 'request_date', label: 'Date' },
  { key: 'request_status', label: 'Status', render: (row) => <StatusBadge status={row.request_status} /> },
  { key: 'payment_status', label: 'Payment', render: (row) => <StatusBadge status={row.payment_status} /> },
  { key: 'total_amount', label: 'Total', render: (row) => money(row.total_amount) },
  { key: 'remaining_amount', label: 'Remaining', render: (row) => money(row.remaining_amount) }
];

export default function DriverPortalPage() {
  const { driver, rows, loading, error } = useStore(driverStore);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    driverStore.loadMe().catch((err) => toast.error(err?.message || 'Failed to load driver profile'));
    driverStore.loadRequests().catch(() => {});
  }, []);

  const openDetail = async (row) => {
    try {
      const result = await driverStore.loadRequest(row.id);
      setDetail(result.data || row);
    } catch (err) {
      toast.error(err?.message || 'Failed to load order');
    }
  };

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{driver?.full_name || 'Driver Orders'}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Accepted and completed orders assigned to your account.</p>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        meta={{ total: rows.length, page: 1, pages: 1 }}
        loading={loading}
        error={error}
        onLoad={() => driverStore.loadRequests()}
        emptyMessage="No accepted orders yet"
        actions={(row) => <ActionButton icon={Eye} label="View" onClick={() => openDetail(row)} />}
      />
      <Modal open={!!detail} title={`Order ${detail?.request_number || ''}`} onClose={() => setDetail(null)} width="720px">
        {detail && <DriverRequestDetail request={detail} />}
      </Modal>
    </>
  );
}

function DriverRequestDetail({ request }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <Info label="Status" value={<StatusBadge status={request.request_status} />} />
        <Info label="Payment" value={<StatusBadge status={request.payment_status} />} />
        <Info label="Total" value={money(request.total_amount)} />
        <Info label="Paid" value={money(request.paid_amount)} />
        <Info label="Remaining" value={money(request.remaining_amount)} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Item', 'Qty', 'Unit Price', 'Total'].map((head) => (
                <th key={head} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px', borderBottom: '1px solid var(--glass-border)' }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(request.items || []).map((line) => (
              <tr key={line.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{line.item?.name || `Item #${line.item_id}`}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{line.quantity}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{money(line.unit_price)}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{money(Number(line.quantity || 0) * Number(line.unit_price || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {request.notes && <Info label="Notes" value={request.notes} />}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '12px' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '14px' }}>{value}</div>
    </div>
  );
}
