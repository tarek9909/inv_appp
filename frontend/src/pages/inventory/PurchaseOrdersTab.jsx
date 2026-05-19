import React, { useEffect, useState } from 'react';
import { Plus, Eye, CheckCircle, XCircle, Edit } from 'lucide-react';
import DataTable, { ActionButton, StatusBadge } from '../../components/DataTable.jsx';
import Modal, { ConfirmModal } from '../../components/Modal.jsx';
import FormField, { FormInput, FormSelect, FormTextarea, SubmitButton } from '../../components/FormField.jsx';
import { toast } from '../../components/Toast.jsx';
import { inventoryStores } from '../../state/index.js';
import { useStore } from '../../hooks/useStore.js';
import { createPurchaseOrderDraft, calculatePurchaseOrderTotals, PURCHASE_ORDER_STATUSES, todayIsoDate } from '../../domain/index.js';

const columns = [
  { key: 'po_number', label: 'PO #', nowrap: true },
  { key: 'supplier', label: 'Supplier', render: (row) => row.supplier?.name || '-' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'total_amount', label: 'Total', render: (row) => `$${Number(row.total_amount || 0).toFixed(2)}` },
  { key: 'order_date', label: 'Date', nowrap: true }
];

export default function PurchaseOrdersTab() {
  const { rows, meta, loading, error } = useStore(inventoryStores.purchaseOrders);
  const supState = useStore(inventoryStores.suppliers);
  const itemState = useStore(inventoryStores.items);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(createPurchaseOrderDraft());
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [receiveModal, setReceiveModal] = useState(null);
  const [receiveForm, setReceiveForm] = useState([]);
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    inventoryStores.purchaseOrders.load();
    inventoryStores.suppliers.load();
    inventoryStores.items.load();
  }, []);

  const openCreate = () => {
    setDraft(createPurchaseOrderDraft());
    setFormOpen(true);
  };

  const addLineItem = () => {
    setDraft({ ...draft, items: [...draft.items, { item_id: '', ordered_quantity: '', unit_cost: '' }] });
  };

  const updateLineItem = (idx, field, value) => {
    const items = [...draft.items];
    items[idx] = { ...items[idx], [field]: value };
    setDraft({ ...draft, items });
  };

  const removeLineItem = (idx) => {
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  };

  const totals = calculatePurchaseOrderTotals(draft);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.supplier_id) { toast.error('Please select a supplier'); return; }
    if (!draft.items.length) { toast.error('Add at least one line item'); return; }
    for (const item of draft.items) {
      if (!item.item_id || !item.ordered_quantity || Number(item.ordered_quantity) <= 0) {
        toast.error('All line items must have an item and valid quantity'); return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...draft, ...totals, items: draft.items.map((i) => ({ item_id: Number(i.item_id), ordered_quantity: Number(i.ordered_quantity), unit_cost: Number(i.unit_cost) || 0 })) };
      await inventoryStores.purchaseOrders.create(payload);
      toast.success('Purchase order created');
      setFormOpen(false);
      inventoryStores.purchaseOrders.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      await inventoryStores.purchaseOrders.cancel(confirmCancel.id);
      toast.success('Order cancelled');
      inventoryStores.purchaseOrders.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel');
    }
    setConfirmCancel(null);
  };

  const openDetail = async (order) => {
    try {
      const result = await inventoryStores.purchaseOrders.loadOne(order.id);
      setDetail(result.data || order);
    } catch (err) {
      toast.error(err?.message || 'Failed to load purchase order');
    }
  };

  const openReceive = (order) => {
    setReceiveModal(order);
    setReceiveForm((order.items || []).map((line) => ({
      purchase_order_item_id: line.id,
      item_name: line.item?.name || `Item #${line.item_id}`,
      ordered_quantity: Number(line.ordered_quantity || 0),
      received_quantity_current: Number(line.received_quantity || 0),
      received_quantity: ''
    })));
  };

  const handleReceive = async (event) => {
    event.preventDefault();
    const invalid = receiveForm.find((line) => {
      const remaining = line.ordered_quantity - line.received_quantity_current;
      return Number(line.received_quantity || 0) > remaining;
    });
    if (invalid) { toast.error(`Received quantity exceeds remaining for ${invalid.item_name}`); return; }

    const items = receiveForm
      .filter((line) => Number(line.received_quantity) > 0)
      .map((line) => ({ purchase_order_item_id: line.purchase_order_item_id, received_quantity: Number(line.received_quantity) }));
    if (!items.length) { toast.error('Enter at least one received quantity'); return; }

    setReceiveSaving(true);
    try {
      await inventoryStores.purchaseOrders.receive(receiveModal.id, { received_date: todayIsoDate(), items });
      toast.success('Stock received');
      setReceiveModal(null);
      inventoryStores.purchaseOrders.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to receive');
    } finally {
      setReceiveSaving(false);
    }
  };

  const openEdit = (order) => {
    setEditModal(order);
    setEditForm({
      expected_delivery_date: order.expected_delivery_date || '',
      status: order.status || 'pending',
      discount_amount: order.discount_amount ?? 0,
      tax_amount: order.tax_amount ?? 0,
      notes: order.notes || ''
    });
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setEditSaving(true);
    try {
      await inventoryStores.purchaseOrders.update(editModal.id, {
        ...editForm,
        expected_delivery_date: editForm.expected_delivery_date || null,
        discount_amount: Number(editForm.discount_amount) || 0,
        tax_amount: Number(editForm.tax_amount) || 0
      });
      toast.success('Purchase order updated');
      setEditModal(null);
      inventoryStores.purchaseOrders.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to update order');
    } finally {
      setEditSaving(false);
    }
  };

  const supplierOptions = (supState.rows || []).filter((s) => s.status !== 'inactive').map((s) => ({ value: s.id, label: s.name }));
  const itemOptions = (itemState.rows || []).filter((i) => i.status !== 'inactive').map((i) => ({ value: i.id, label: `${i.name} (${i.sku || 'no SKU'})` }));

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        meta={meta}
        loading={loading}
        error={error}
        onLoad={(filters) => inventoryStores.purchaseOrders.load(filters)}
        toolbar={
          <button className="glass-button" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={openCreate}>
            <Plus size={16} /> Create Order
          </button>
        }
        actions={(row) => (
          <>
            <ActionButton icon={Eye} label="View" onClick={() => openDetail(row)} />
            {!['received', 'cancelled'].includes(row.status) && <ActionButton icon={Edit} label="Edit" onClick={() => openEdit(row)} color="var(--accent-blue)" />}
            {['draft', 'pending', 'partially_received'].includes(row.status) && <ActionButton icon={CheckCircle} label="Receive" onClick={() => openReceive(row)} color="var(--accent-green)" />}
            {['draft', 'pending'].includes(row.status) && <ActionButton icon={XCircle} label="Cancel" onClick={() => setConfirmCancel(row)} color="var(--accent-red)" />}
          </>
        )}
      />

      <Modal open={formOpen} title="Create Purchase Order" onClose={() => setFormOpen(false)} width="640px">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Supplier" required>
              <FormSelect value={draft.supplier_id} onChange={(v) => setDraft({ ...draft, supplier_id: v })} options={supplierOptions} placeholder="Select supplier" />
            </FormField>
            <FormField label="Order Date">
              <FormInput type="date" value={draft.order_date} onChange={(v) => setDraft({ ...draft, order_date: v })} />
            </FormField>
          </div>
          <FormField label="Expected Delivery">
            <FormInput type="date" value={draft.expected_delivery_date || ''} onChange={(v) => setDraft({ ...draft, expected_delivery_date: v || null })} />
          </FormField>

          <LineItems draft={draft} itemOptions={itemOptions} addLineItem={addLineItem} updateLineItem={updateLineItem} removeLineItem={removeLineItem} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <FormField label="Discount">
              <FormInput type="number" value={draft.discount_amount} onChange={(v) => setDraft({ ...draft, discount_amount: v })} min="0" step="0.01" />
            </FormField>
            <FormField label="Tax">
              <FormInput type="number" value={draft.tax_amount} onChange={(v) => setDraft({ ...draft, tax_amount: v })} min="0" step="0.01" />
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
          <SubmitButton loading={saving}>Create Order</SubmitButton>
        </form>
      </Modal>

      <Modal open={!!detail} title={`Purchase Order ${detail?.po_number || ''}`} onClose={() => setDetail(null)} width="720px">
        {detail && <PurchaseOrderDetail order={detail} />}
      </Modal>

      <Modal open={!!editModal} title={`Edit ${editModal?.po_number || ''}`} onClose={() => setEditModal(null)} width="480px">
        <form onSubmit={handleEdit}>
          <FormField label="Expected Delivery">
            <FormInput type="date" value={editForm.expected_delivery_date} onChange={(v) => setEditForm({ ...editForm, expected_delivery_date: v })} />
          </FormField>
          <FormField label="Status">
            <FormSelect value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })} options={PURCHASE_ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Discount">
              <FormInput type="number" value={editForm.discount_amount} onChange={(v) => setEditForm({ ...editForm, discount_amount: v })} min="0" step="0.01" />
            </FormField>
            <FormField label="Tax">
              <FormInput type="number" value={editForm.tax_amount} onChange={(v) => setEditForm({ ...editForm, tax_amount: v })} min="0" step="0.01" />
            </FormField>
          </div>
          <FormField label="Notes">
            <FormTextarea value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} rows={2} />
          </FormField>
          <SubmitButton loading={editSaving}>Update Order</SubmitButton>
        </form>
      </Modal>

      <Modal open={!!receiveModal} title={`Receive ${receiveModal?.po_number || ''}`} onClose={() => setReceiveModal(null)} width="560px">
        <form onSubmit={handleReceive}>
          {receiveForm.map((line, idx) => {
            const remaining = line.ordered_quantity - line.received_quantity_current;
            return (
              <div key={line.purchase_order_item_id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px' }}>
                  <div>{line.item_name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ordered {line.ordered_quantity}, received {line.received_quantity_current}, remaining {remaining}</div>
                </div>
                <FormInput type="number" value={receiveForm[idx]?.received_quantity} onChange={(v) => { const next = [...receiveForm]; next[idx] = { ...next[idx], received_quantity: v }; setReceiveForm(next); }} placeholder="0" min="0" max={remaining} step="0.01" />
              </div>
            );
          })}
          <SubmitButton loading={receiveSaving}>Confirm Receive</SubmitButton>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmCancel}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${confirmCancel?.po_number}? This action cannot be undone.`}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(null)}
      />
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
            <FormInput type="number" value={item.ordered_quantity} onChange={(v) => updateLineItem(idx, 'ordered_quantity', v)} placeholder="0" min="1" />
          </FormField>
          <FormField label={idx === 0 ? 'Unit Cost' : undefined}>
            <FormInput type="number" value={item.unit_cost} onChange={(v) => updateLineItem(idx, 'unit_cost', v)} placeholder="0.00" min="0" step="0.01" />
          </FormField>
          <button type="button" onClick={() => removeLineItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '8px', marginBottom: '16px' }}>x</button>
        </div>
      ))}
    </>
  );
}

function PurchaseOrderDetail({ order }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <Info label="Supplier" value={order.supplier?.name || '-'} />
        <Info label="Status" value={<StatusBadge status={order.status} />} />
        <Info label="Order Date" value={order.order_date || '-'} />
        <Info label="Expected" value={order.expected_delivery_date || '-'} />
        <Info label="Total" value={`$${Number(order.total_amount || 0).toFixed(2)}`} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Item', 'Ordered', 'Received', 'Remaining', 'Unit Cost'].map((head) => (
                <th key={head} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px', borderBottom: '1px solid var(--glass-border)' }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((line) => (
              <tr key={line.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{line.item?.name || `Item #${line.item_id}`}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{line.ordered_quantity}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{line.received_quantity}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>{Number(line.ordered_quantity || 0) - Number(line.received_quantity || 0)}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)' }}>${Number(line.unit_cost || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {order.notes && <Info label="Notes" value={order.notes} />}
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
