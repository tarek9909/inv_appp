import React, { useEffect, useState } from 'react';
import { Plus, CheckCircle, XCircle, Eye, Edit, Printer } from 'lucide-react';
import DataTable, { ActionButton, StatusBadge } from '../../components/DataTable.jsx';
import Modal, { ConfirmModal } from '../../components/Modal.jsx';
import FormField, { FormInput, FormSelect, FormTextarea, SubmitButton } from '../../components/FormField.jsx';
import { toast } from '../../components/Toast.jsx';
import { accountantStores, inventoryStores, authStore, settingsStore } from '../../state/index.js';
import { useStore } from '../../hooks/useStore.js';
import { createStockRequestDraft, calculateStockRequestTotals, REQUEST_TYPES } from '../../domain/index.js';
import { qzPrintService } from '../../services/qzPrintService.js';

const columns = [
  { key: 'request_number', label: 'Request #', nowrap: true },
  { key: 'driver', label: 'Driver', render: (row) => row.driver?.full_name || '-' },
  { key: 'request_type', label: 'Type', render: (row) => <StatusBadge status={row.request_type} /> },
  { key: 'request_status', label: 'Request Status', render: (row) => <StatusBadge status={row.request_status} /> },
  { key: 'payment_status', label: 'Payment Status', render: (row) => <StatusBadge status={row.payment_status} /> },
  { key: 'total_amount', label: 'Total', render: (row) => `$${Number(row.total_amount || 0).toFixed(2)}` },
  { key: 'remaining_amount', label: 'Remaining', render: (row) => `$${Number(row.remaining_amount || 0).toFixed(2)}` }
];

const editableStatuses = ['draft', 'pending'];

export default function StockRequestsTab() {
  const { rows, meta, loading, error } = useStore(accountantStores.stockRequests);
  const driverState = useStore(accountantStores.drivers);
  const itemState = useStore(inventoryStores.items);
  const { user } = useStore(authStore);
  const { settings } = useStore(settingsStore);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(createStockRequestDraft());
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ notes: '', request_status: 'pending' });
  const [editSaving, setEditSaving] = useState(false);
  const [printModal, setPrintModal] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [printStatus, setPrintStatus] = useState('');

  useEffect(() => {
    accountantStores.stockRequests.load();
    accountantStores.drivers.load();
    inventoryStores.items.load();
    settingsStore.load().catch(() => {});
  }, []);

  useEffect(() => {
    setPrinterName(settings.qz_default_printer || '');
  }, [settings.qz_default_printer]);

  const openCreate = () => {
    setDraft(createStockRequestDraft());
    setFormOpen(true);
  };

  const addLineItem = () => {
    setDraft({ ...draft, items: [...draft.items, { item_id: '', quantity: '', unit_price: '' }] });
  };

  const updateLineItem = (idx, field, value) => {
    const items = [...draft.items];
    items[idx] = { ...items[idx], [field]: value };
    setDraft({ ...draft, items });
  };

  const removeLineItem = (idx) => {
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  };

  const totals = calculateStockRequestTotals(draft);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.driver_id) { toast.error('Please select a driver'); return; }
    if (!draft.items.length) { toast.error('Add at least one line item'); return; }
    for (const item of draft.items) {
      if (!item.item_id || !item.quantity || Number(item.quantity) <= 0) {
        toast.error('All line items must have an item and valid quantity'); return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...draft, ...totals, items: draft.items.map((i) => ({ item_id: Number(i.item_id), quantity: Number(i.quantity), unit_price: Number(i.unit_price) || 0 })) };
      await accountantStores.stockRequests.create(payload);
      toast.success('Stock request created');
      setFormOpen(false);
      accountantStores.stockRequests.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmAction.type === 'complete') {
        await accountantStores.stockRequests.complete(confirmAction.row.id);
        toast.success('Request completed');
      } else if (confirmAction.type === 'accept') {
        await accountantStores.stockRequests.accept(confirmAction.row.id);
        toast.success('Request accepted');
      } else {
        await accountantStores.stockRequests.cancel(confirmAction.row.id);
        toast.success('Request cancelled');
      }
      accountantStores.stockRequests.load();
    } catch (err) {
      toast.error(err?.message || 'Action failed');
    }
    setConfirmAction(null);
  };

  const openDetail = async (row) => {
    try {
      const result = await accountantStores.stockRequests.loadOne(row.id);
      setDetail(result.data || row);
    } catch (err) {
      toast.error(err?.message || 'Failed to load request');
    }
  };

  const openEdit = (row) => {
    setEditModal(row);
    setEditForm({ notes: row.notes || '', request_status: row.request_status || 'pending' });
  };

  const openPrint = async (row) => {
    try {
      const result = await accountantStores.stockRequests.loadOne(row.id);
      setPrintModal(result.data || row);
      setPrintStatus('');
    } catch (err) {
      toast.error(err?.message || 'Failed to load printable order');
    }
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setEditSaving(true);
    try {
      await accountantStores.stockRequests.update(editModal.id, editForm);
      toast.success('Stock request updated');
      setEditModal(null);
      accountantStores.stockRequests.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to update request');
    } finally {
      setEditSaving(false);
    }
  };

  const driverOptions = (driverState.rows || []).filter((d) => d.status === 'active').map((d) => ({ value: d.id, label: d.full_name }));
  const itemOptions = (itemState.rows || []).filter((i) => i.status !== 'inactive').map((i) => ({ value: i.id, label: `${i.name} (${i.sku || 'no SKU'})` }));

  const can = (permission) => user?.role?.code === 'admin' || (user?.permissions || []).includes(permission);
  const canComplete = (row) => row.request_status === 'approved';
  const canCancel = (row) => !['completed', 'cancelled'].includes(row.request_status);
  const canAccept = (row) => ['draft', 'pending'].includes(row.request_status);
  const printEnabled = ['print', 'both'].includes(settings.accepted_request_fulfillment_mode || 'both') && settings.qz_tray_enabled !== 'false';
  const canPrint = (row) => printEnabled && ['approved', 'completed'].includes(row.request_status);

  const handlePrint = async () => {
    if (!printModal) return;
    setPrinting(true);
    setPrintStatus('Connecting to QZ Tray...');
    try {
      const result = await qzPrintService.printRequest({ request: printModal, printerName });
      await accountantStores.stockRequests.print(printModal.id, { printer_name: result.printer, qz_version: result.qzVersion, status: 'success' });
      setPrintStatus(`Printed on ${result.printer}`);
      toast.success('Order printed');
    } catch (err) {
      await accountantStores.stockRequests.print(printModal.id, { printer_name: printerName, status: 'failed', error_message: err?.message || 'Print failed' }).catch(() => {});
      setPrintStatus(err?.message || 'Print failed');
      toast.error(err?.message || 'Print failed');
    } finally {
      setPrinting(false);
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
        onLoad={(filters) => accountantStores.stockRequests.load(filters)}
        toolbar={
          can('stock_requests.create') && <button className="glass-button" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={openCreate}>
            <Plus size={16} /> Create Request
          </button>
        }
        actions={(row) => (
          <>
            <ActionButton icon={Eye} label="View" onClick={() => openDetail(row)} />
            {can('stock_requests.update') && editableStatuses.includes(row.request_status) && <ActionButton icon={Edit} label="Edit" onClick={() => openEdit(row)} color="var(--accent-blue)" />}
            {can('stock_requests.accept') && canAccept(row) && <ActionButton icon={CheckCircle} label="Accept" onClick={() => setConfirmAction({ type: 'accept', row })} color="var(--accent-blue)" />}
            {can('stock_requests.complete') && canComplete(row) && <ActionButton icon={CheckCircle} label="Complete" onClick={() => setConfirmAction({ type: 'complete', row })} color="var(--accent-green)" />}
            {can('stock_requests.print') && canPrint(row) && <ActionButton icon={Printer} label="Print Order" onClick={() => openPrint(row)} color="var(--accent-orange)" />}
            {can('stock_requests.cancel') && canCancel(row) && <ActionButton icon={XCircle} label="Cancel" onClick={() => setConfirmAction({ type: 'cancel', row })} color="var(--accent-red)" />}
          </>
        )}
      />

      <Modal open={formOpen} title="Create Stock Request" onClose={() => setFormOpen(false)} width="620px">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <FormField label="Driver" required>
              <FormSelect value={draft.driver_id} onChange={(v) => setDraft({ ...draft, driver_id: v })} options={driverOptions} placeholder="Select driver" />
            </FormField>
            <FormField label="Type">
              <FormSelect value={draft.request_type} onChange={(v) => setDraft({ ...draft, request_type: v })} options={REQUEST_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
            </FormField>
            <FormField label="Date">
              <FormInput type="date" value={draft.request_date} onChange={(v) => setDraft({ ...draft, request_date: v })} />
            </FormField>
          </div>

          <LineItems draft={draft} itemOptions={itemOptions} addLineItem={addLineItem} updateLineItem={updateLineItem} removeLineItem={removeLineItem} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <FormField label="Discount">
              <FormInput type="number" value={draft.discount_amount} onChange={(v) => setDraft({ ...draft, discount_amount: v })} min="0" step="0.01" />
            </FormField>
            <FormField label="Total">
              <div style={{ padding: '12px 16px', background: 'var(--surface-subtle)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', color: 'var(--accent-green)' }}>
                ${totals.total_amount.toFixed(2)}
              </div>
            </FormField>
          </div>

          <FormField label="Notes">
            <FormTextarea value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} placeholder="Optional notes" rows={2} />
          </FormField>
          <SubmitButton loading={saving}>Create Request</SubmitButton>
        </form>
      </Modal>

      <Modal open={!!detail} title={`Stock Request ${detail?.request_number || ''}`} onClose={() => setDetail(null)} width="720px">
        {detail && <StockRequestDetail request={detail} />}
      </Modal>

      <Modal open={!!editModal} title={`Edit ${editModal?.request_number || ''}`} onClose={() => setEditModal(null)} width="480px">
        <form onSubmit={handleEdit}>
          <FormField label="Request Status">
            <FormSelect value={editForm.request_status} onChange={(v) => setEditForm({ ...editForm, request_status: v })} options={editableStatuses.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Notes">
            <FormTextarea value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} rows={3} />
          </FormField>
          <SubmitButton loading={editSaving}>Update Request</SubmitButton>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === 'complete' ? 'Complete Request' : confirmAction?.type === 'accept' ? 'Accept Request' : 'Cancel Request'}
        message={`Are you sure you want to ${confirmAction?.type} request ${confirmAction?.row?.request_number}?`}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      <Modal open={!!printModal} title={`Print ${printModal?.request_number || ''}`} onClose={() => setPrintModal(null)} width="520px">
        <FormField label="Printer Name">
          <FormInput value={printerName} onChange={setPrinterName} placeholder="Leave empty for default printer" />
        </FormField>
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
          QZ Tray will verify the local print service and use signed backend requests before printing.
        </div>
        {printStatus && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>{printStatus}</div>}
        <button className="glass-button" disabled={printing} onClick={handlePrint} style={{ width: '100%' }}>
          <Printer size={16} /> {printing ? 'Printing...' : 'Print Order'}
        </button>
      </Modal>
    </>
  );
}

function LineItems({ draft, itemOptions, addLineItem, updateLineItem, removeLineItem }) {
  return (
    <>
      <div style={{ marginTop: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: '600' }}>Line Items</span>
        <button type="button" onClick={addLineItem} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--accent-blue)', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>+ Add Item</button>
      </div>
      {draft.items.map((item, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
          <FormField label={idx === 0 ? 'Item' : undefined}>
            <FormSelect value={item.item_id} onChange={(v) => updateLineItem(idx, 'item_id', v)} options={itemOptions} placeholder="Select item" />
          </FormField>
          <FormField label={idx === 0 ? 'Qty' : undefined}>
            <FormInput type="number" value={item.quantity} onChange={(v) => updateLineItem(idx, 'quantity', v)} placeholder="0" min="1" />
          </FormField>
          <FormField label={idx === 0 ? 'Unit Price' : undefined}>
            <FormInput type="number" value={item.unit_price} onChange={(v) => updateLineItem(idx, 'unit_price', v)} placeholder="0.00" min="0" step="0.01" />
          </FormField>
          <button type="button" onClick={() => removeLineItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '8px', marginBottom: '16px' }}>x</button>
        </div>
      ))}
    </>
  );
}

function StockRequestDetail({ request }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <Info label="Driver" value={request.driver?.full_name || '-'} />
        <Info label="Request Status" value={<StatusBadge status={request.request_status} />} />
        <Info label="Payment Status" value={<StatusBadge status={request.payment_status} />} />
        <Info label="Total" value={`$${Number(request.total_amount || 0).toFixed(2)}`} />
        <Info label="Paid" value={`$${Number(request.paid_amount || 0).toFixed(2)}`} />
        <Info label="Remaining" value={`$${Number(request.remaining_amount || 0).toFixed(2)}`} />
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
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>${Number(line.unit_price || 0).toFixed(2)}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>${(Number(line.quantity || 0) * Number(line.unit_price || 0)).toFixed(2)}</td>
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
