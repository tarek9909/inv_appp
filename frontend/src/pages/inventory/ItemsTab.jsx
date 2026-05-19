import React, { useEffect, useState } from 'react';
import { Plus, Edit, PackagePlus, ArrowUpDown, Archive, RotateCcw, Trash2, AlertTriangle, List } from 'lucide-react';
import DataTable, { ActionButton, StatusBadge } from '../../components/DataTable.jsx';
import Modal, { ConfirmModal } from '../../components/Modal.jsx';
import FormField, { FormInput, FormSelect, SubmitButton } from '../../components/FormField.jsx';
import { toast } from '../../components/Toast.jsx';
import { authStore, inventoryStores } from '../../state/index.js';
import { useStore } from '../../hooks/useStore.js';
import { ACTIVE_STATUSES, STOCK_ADJUSTMENT_TYPES, todayIsoDate } from '../../domain/index.js';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'sku', label: 'SKU', nowrap: true },
  { key: 'category', label: 'Category', render: (row) => row.category?.name || '-' },
  { key: 'current_stock', label: 'Stock', render: (row) => {
    const low = Number(row.current_stock || 0) <= Number(row.minimum_stock || 0);
    return <span style={{ color: low ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: low ? '600' : '400' }}>{row.current_stock ?? 0}</span>;
  }},
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'purchase_price', label: 'Purchase Price', render: (row) => row.purchase_price != null ? `$${Number(row.purchase_price).toFixed(2)}` : '-' },
  { key: 'selling_price', label: 'Selling Price', render: (row) => row.selling_price != null ? `$${Number(row.selling_price).toFixed(2)}` : '-' }
];

export default function ItemsTab() {
  const { rows, meta, loading, error } = useStore(inventoryStores.items);
  const { user } = useStore(authStore);
  const catState = useStore(inventoryStores.categories);
  const supState = useStore(inventoryStores.suppliers);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [stockForm, setStockForm] = useState({});
  const [stockSaving, setStockSaving] = useState(false);
  const [lowStockMode, setLowStockMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    inventoryStores.items.load();
    inventoryStores.categories.load();
    inventoryStores.suppliers.load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', sku: '', category_id: '', supplier_id: '', unit: 'piece', purchase_price: '', selling_price: '', minimum_stock: '0', status: 'active' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      sku: row.sku || '',
      category_id: row.category_id || '',
      supplier_id: row.supplier_id || '',
      unit: row.unit || 'piece',
      purchase_price: row.purchase_price ?? '',
      selling_price: row.selling_price ?? '',
      minimum_stock: row.minimum_stock ?? '0',
      status: row.status || 'active'
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = { ...form, purchase_price: Number(form.purchase_price) || 0, selling_price: Number(form.selling_price) || 0, minimum_stock: Number(form.minimum_stock) || 0 };
    setSaving(true);
    try {
      if (editing) {
        await inventoryStores.items.update(editing.id, payload);
        toast.success('Item updated');
      } else {
        await inventoryStores.items.create(payload);
        toast.success('Item created');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const openStockEntry = (row) => {
    setStockModal('entry');
    setStockForm({ item_id: row.id, item_name: row.name, supplier_id: row.supplier_id || '', quantity: '', unit_cost: '', entry_date: todayIsoDate(), notes: '' });
  };

  const openStockAdjustment = (row) => {
    setStockModal('adjustment');
    setStockForm({ item_id: row.id, item_name: row.name, quantity: '', adjustment_type: 'adjustment_in', notes: '' });
  };

  const handleStockSubmit = async (event) => {
    event.preventDefault();
    const qty = Number(stockForm.quantity);
    if (!qty || qty <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (stockModal === 'entry' && !stockForm.entry_date) { toast.error('Entry date is required'); return; }

    setStockSaving(true);
    try {
      if (stockModal === 'entry') {
        await inventoryStores.stockEntries.submit({
          item_id: stockForm.item_id,
          supplier_id: stockForm.supplier_id || null,
          quantity: qty,
          unit_cost: Number(stockForm.unit_cost) || 0,
          entry_date: stockForm.entry_date,
          notes: stockForm.notes
        });
      } else {
        await inventoryStores.stockAdjustments.submit({ item_id: stockForm.item_id, quantity: qty, adjustment_type: stockForm.adjustment_type, notes: stockForm.notes });
      }
      toast.success(stockModal === 'entry' ? 'Stock entry recorded' : 'Stock adjustment recorded');
      setStockModal(null);
      inventoryStores.items.load();
    } catch (err) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setStockSaving(false);
    }
  };

  const categoryOptions = (catState.rows || []).filter((c) => c.status !== 'inactive').map((c) => ({ value: c.id, label: c.name }));
  const supplierOptions = (supState.rows || []).filter((s) => s.status !== 'inactive').map((s) => ({ value: s.id, label: s.name }));

  const reloadItems = () => {
    setLowStockMode(false);
    inventoryStores.items.load();
  };

  const loadLowStock = async () => {
    try {
      const result = await inventoryStores.items.loadLowStock();
      const data = Array.isArray(result.data) ? result.data : [];
      inventoryStores.items.setState({ rows: data, meta: { page: 1, pages: 1, total: data.length } });
      setLowStockMode(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to load low-stock items');
    }
  };

  const toggleArchive = async (row) => {
    try {
      await inventoryStores.items.update(row.id, { status: row.status === 'inactive' ? 'active' : 'inactive' });
      toast.success(row.status === 'inactive' ? 'Item restored' : 'Item archived');
      inventoryStores.items.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to update item status');
    }
  };

  const confirmDelete = async () => {
    try {
      await inventoryStores.items.delete(deleteTarget.id);
      toast.success('Item permanently deleted');
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        meta={meta}
        loading={loading}
        error={error}
        onLoad={(filters) => { setLowStockMode(false); inventoryStores.items.load(filters); }}
        toolbar={
          <>
            <button onClick={lowStockMode ? reloadItems : loadLowStock} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: lowStockMode ? 'var(--accent-blue)' : 'var(--text-secondary)', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              {lowStockMode ? <List size={16} /> : <AlertTriangle size={16} />} {lowStockMode ? 'All Items' : 'Low Stock'}
            </button>
            <button className="glass-button" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={openCreate}>
              <Plus size={16} /> Add Item
            </button>
          </>
        }
        actions={(row) => (
          <>
            <ActionButton icon={Edit} label="Edit" onClick={() => openEdit(row)} />
            <ActionButton icon={PackagePlus} label="Stock Entry" onClick={() => openStockEntry(row)} color="var(--accent-green)" />
            <ActionButton icon={ArrowUpDown} label="Adjustment" onClick={() => openStockAdjustment(row)} color="var(--accent-orange)" />
            <ActionButton icon={row.status === 'inactive' ? RotateCcw : Archive} label={row.status === 'inactive' ? 'Restore' : 'Archive'} onClick={() => toggleArchive(row)} color="var(--accent-purple)" />
            {user?.role?.code === 'admin' && <ActionButton icon={Trash2} label="Delete Permanently" onClick={() => setDeleteTarget(row)} color="var(--accent-red)" />}
          </>
        )}
      />

      <Modal open={modalOpen} title={editing ? 'Edit Item' : 'Add Item'} onClose={() => setModalOpen(false)} width="540px">
        <form onSubmit={handleSubmit}>
          <FormField label="Name" required error={errors.name}>
            <FormInput value={form.name} onChange={(v) => { setForm({ ...form, name: v }); setErrors({ ...errors, name: null }); }} placeholder="Item name" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="SKU">
              <FormInput value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="SKU" />
            </FormField>
            <FormField label="Unit">
              <FormInput value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="piece" />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Category">
              <FormSelect value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })} options={categoryOptions} placeholder="Select category" />
            </FormField>
            <FormField label="Supplier">
              <FormSelect value={form.supplier_id} onChange={(v) => setForm({ ...form, supplier_id: v })} options={supplierOptions} placeholder="Select supplier" />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <FormField label="Purchase Price">
              <FormInput type="number" value={form.purchase_price} onChange={(v) => setForm({ ...form, purchase_price: v })} placeholder="0.00" min="0" step="0.01" />
            </FormField>
            <FormField label="Selling Price">
              <FormInput type="number" value={form.selling_price} onChange={(v) => setForm({ ...form, selling_price: v })} placeholder="0.00" min="0" step="0.01" />
            </FormField>
            <FormField label="Min Stock">
              <FormInput type="number" value={form.minimum_stock} onChange={(v) => setForm({ ...form, minimum_stock: v })} placeholder="0" min="0" />
            </FormField>
          </div>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={ACTIVE_STATUSES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <SubmitButton loading={saving}>{editing ? 'Update' : 'Create'}</SubmitButton>
        </form>
      </Modal>

      <Modal open={!!stockModal} title={stockModal === 'entry' ? `Stock Entry - ${stockForm.item_name}` : `Stock Adjustment - ${stockForm.item_name}`} onClose={() => setStockModal(null)} width="420px">
        <form onSubmit={handleStockSubmit}>
          <FormField label="Quantity" required>
            <FormInput type="number" value={stockForm.quantity} onChange={(v) => setStockForm({ ...stockForm, quantity: v })} placeholder="0" min="0.01" step="0.01" />
          </FormField>
          {stockModal === 'entry' && (
            <>
              <FormField label="Supplier">
                <FormSelect value={stockForm.supplier_id} onChange={(v) => setStockForm({ ...stockForm, supplier_id: v })} options={supplierOptions} placeholder="Select supplier" />
              </FormField>
              <FormField label="Entry Date" required>
                <FormInput type="date" value={stockForm.entry_date} onChange={(v) => setStockForm({ ...stockForm, entry_date: v })} />
              </FormField>
              <FormField label="Unit Cost">
                <FormInput type="number" value={stockForm.unit_cost} onChange={(v) => setStockForm({ ...stockForm, unit_cost: v })} placeholder="0.00" min="0" step="0.01" />
              </FormField>
            </>
          )}
          {stockModal === 'adjustment' && (
            <FormField label="Type" required>
              <FormSelect value={stockForm.adjustment_type} onChange={(v) => setStockForm({ ...stockForm, adjustment_type: v })} options={STOCK_ADJUSTMENT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
            </FormField>
          )}
          <FormField label="Notes">
            <FormInput value={stockForm.notes} onChange={(v) => setStockForm({ ...stockForm, notes: v })} placeholder="Optional notes" />
          </FormField>
          <SubmitButton loading={stockSaving}>Submit</SubmitButton>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Permanently Delete Item"
        message={`Delete ${deleteTarget?.name}? This only works when the item has no stock, purchase, request, or movement history.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
