import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import FormField, { FormInput, FormSelect, FormTextarea, SubmitButton } from '../../components/FormField.jsx';
import { toast } from '../../components/Toast.jsx';
import { accountantStores } from '../../state/index.js';
import { useStore } from '../../hooks/useStore.js';
import { PAYMENT_METHODS, todayIsoDate } from '../../domain/index.js';

const columns = [
  { key: 'payment_date', label: 'Date', nowrap: true },
  { key: 'stock_request', label: 'Request #', render: (row) => row.stock_request?.request_number || '-' },
  { key: 'amount', label: 'Amount', render: (row) => `$${Number(row.amount || 0).toFixed(2)}` },
  { key: 'payment_method', label: 'Method', render: (row) => row.payment_method?.replace(/_/g, ' ') || '-' },
  { key: 'payment_number', label: 'Payment #' }
];

export default function PaymentsTab() {
  const { rows, meta, loading, error } = useStore(accountantStores.payments);
  const requestState = useStore(accountantStores.stockRequests);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ stock_request_id: '', amount: '', payment_method: 'cash', payment_date: todayIsoDate(), notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    accountantStores.payments.load();
    accountantStores.stockRequests.load({ limit: 100 });
  }, []);

  const openCreate = () => {
    setForm({ stock_request_id: '', amount: '', payment_method: 'cash', payment_date: todayIsoDate(), notes: '' });
    setModalOpen(true);
  };

  const payableRequests = (requestState.rows || []).filter((request) => request.payment_status !== 'cancelled' && Number(request.remaining_amount || 0) > 0);
  const selectedRequest = payableRequests.find((request) => String(request.id) === String(form.stock_request_id));
  const requestOptions = payableRequests.map((request) => ({
    value: request.id,
    label: `${request.request_number} - ${request.driver?.full_name || 'Unknown'} ($${Number(request.remaining_amount || 0).toFixed(2)} due)`
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.stock_request_id) { toast.error('Please select a stock request'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    if (selectedRequest && Number(form.amount) > Number(selectedRequest.remaining_amount || 0)) {
      toast.error('Amount exceeds remaining balance'); return;
    }

    setSaving(true);
    try {
      await accountantStores.payments.create({ ...form, amount: Number(form.amount) });
      toast.success('Payment recorded');
      setModalOpen(false);
      accountantStores.payments.load();
      accountantStores.stockRequests.load({ limit: 100 });
    } catch (err) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        meta={meta}
        loading={loading}
        error={error}
        onLoad={(filters) => accountantStores.payments.load(filters)}
        toolbar={
          <button className="glass-button" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={openCreate}>
            <Plus size={16} /> Record Payment
          </button>
        }
      />

      <Modal open={modalOpen} title="Record Payment" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <FormField label="Stock Request" required>
            <FormSelect value={form.stock_request_id} onChange={(value) => setForm({ ...form, stock_request_id: value, amount: '' })} options={requestOptions} placeholder="Select request" />
          </FormField>
          {selectedRequest && (
            <div style={{ padding: '12px 14px', marginBottom: '16px', background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Remaining balance: <strong style={{ color: 'var(--accent-orange)' }}>${Number(selectedRequest.remaining_amount || 0).toFixed(2)}</strong>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Amount" required>
              <FormInput type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} placeholder="0.00" min="0.01" max={selectedRequest?.remaining_amount} step="0.01" />
            </FormField>
            <FormField label="Method">
              <FormSelect value={form.payment_method} onChange={(value) => setForm({ ...form, payment_method: value })} options={PAYMENT_METHODS.map((method) => ({ value: method, label: method.replace(/_/g, ' ') }))} />
            </FormField>
          </div>
          <FormField label="Payment Date">
            <FormInput type="date" value={form.payment_date} onChange={(value) => setForm({ ...form, payment_date: value })} />
          </FormField>
          <FormField label="Notes">
            <FormTextarea value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} placeholder="Optional notes" rows={2} />
          </FormField>
          <SubmitButton loading={saving}>Record Payment</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
