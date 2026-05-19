import React, { useEffect, useState } from 'react';
import { Plus, Edit, Shield, KeyRound } from 'lucide-react';
import DataTable, { ActionButton, StatusBadge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import FormField, { FormInput, FormSelect, SubmitButton } from '../components/FormField.jsx';
import { toast } from '../components/Toast.jsx';
import { adminStores } from '../state/index.js';
import { useStore } from '../hooks/useStore.js';
import { USER_STATUSES } from '../domain/index.js';

const columns = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (row) => row.role?.name || '-' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
];

export default function TeamPage() {
  const { rows, meta, loading, error } = useStore(adminStores.users);
  const rolesState = useStore(adminStores.roles);
  const permissionsState = useStore(adminStores.permissions);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '' });
  const [rolePermissions, setRolePermissions] = useState([]);
  const [roleSaving, setRoleSaving] = useState(false);

  useEffect(() => {
    adminStores.users.load();
    adminStores.roles.load();
    adminStores.permissions.load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: '', email: '', password: '', role_id: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ full_name: row.full_name || '', email: row.email || '', role_id: row.role_id || '' });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.full_name?.trim()) errs.full_name = 'Name is required';
    if (!form.email?.trim()) errs.email = 'Email is required';
    if (!editing && (!form.password || form.password.length < 6)) errs.password = 'Min 6 characters';
    if (!form.role_id) errs.role_id = 'Role is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (editing) {
        await adminStores.users.update(editing.id, { full_name: form.full_name, email: form.email, role_id: form.role_id });
        toast.success('User updated');
      } else {
        await adminStores.users.create(form);
        toast.success('User created');
      }
      setModalOpen(false);
      adminStores.users.load();
    } catch (err) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await adminStores.users.setStatus(statusModal.id, status);
      toast.success(`User status changed to ${status}`);
      adminStores.users.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to change status');
    }
    setStatusModal(null);
  };

  const openRoleModal = async (role = null) => {
    setRoleModal(role || { id: null });
    setRoleForm(role ? { name: role.name || '', code: role.code || '', description: role.description || '' } : { name: '', code: '', description: '' });
    if (role?.id) {
      try {
        const result = await adminStores.roles.getPermissions(role.id);
        setRolePermissions(result.data?.permissions || []);
      } catch (err) {
        toast.error(err?.message || 'Failed to load role permissions');
        setRolePermissions([]);
      }
    } else {
      setRolePermissions([]);
    }
  };

  const handleRoleSubmit = async (event) => {
    event.preventDefault();
    setRoleSaving(true);
    try {
      let role = roleModal;
      if (roleModal?.id) {
        const result = await adminStores.roles.update(roleModal.id, roleForm);
        role = result.data;
      } else {
        const result = await adminStores.roles.create(roleForm);
        role = result.data;
      }
      if (role?.id && role.code !== 'admin') await adminStores.roles.updatePermissions(role.id, rolePermissions);
      toast.success('Role saved');
      setRoleModal(null);
      adminStores.roles.load();
    } catch (err) {
      toast.error(err?.message || 'Failed to save role');
    } finally {
      setRoleSaving(false);
    }
  };

  const togglePermission = (key) => {
    setRolePermissions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const roleOptions = (rolesState.rows || []).map((r) => ({ value: r.id, label: r.name }));
  const groupedPermissions = (permissionsState.rows || []).reduce((groups, permission) => {
    const module = permission.module || 'Other';
    const feature = permission.feature || 'General';
    groups[module] = groups[module] || {};
    groups[module][feature] = groups[module][feature] || [];
    groups[module][feature].push(permission);
    return groups;
  }, {});

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        meta={meta}
        loading={loading}
        error={error}
        onLoad={(filters) => adminStores.users.load(filters)}
        toolbar={
          <button className="glass-button" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={openCreate}>
            <Plus size={16} /> Add User
          </button>
        }
        actions={(row) => (
          <>
            <ActionButton icon={Edit} label="Edit" onClick={() => openEdit(row)} />
            <ActionButton icon={Shield} label="Change Status" onClick={() => setStatusModal(row)} color="var(--accent-purple)" />
          </>
        )}
      />

      <div className="glass-card" style={{ marginTop: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Roles & Permissions</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Control access to tabs, flows, actions, and subfeatures.</p>
          </div>
          <button className="glass-button" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => openRoleModal()}>
            <Plus size={16} /> Add Role
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {(rolesState.rows || []).map((role) => (
            <div key={role.id} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontWeight: 700 }}>{role.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 12px' }}>{role.code}</div>
              <button type="button" onClick={() => openRoleModal(role)} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--accent-blue)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={14} /> Permissions
              </button>
            </div>
          ))}
        </div>
      </div>

      <Modal open={modalOpen} title={editing ? 'Edit User' : 'Add User'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <FormField label="Full Name" required error={errors.full_name}>
            <FormInput value={form.full_name} onChange={(v) => { setForm({ ...form, full_name: v }); setErrors({ ...errors, full_name: null }); }} placeholder="Full name" />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <FormInput type="email" value={form.email} onChange={(v) => { setForm({ ...form, email: v }); setErrors({ ...errors, email: null }); }} placeholder="Email" />
          </FormField>
          {!editing && (
            <FormField label="Password" required error={errors.password}>
              <FormInput type="password" value={form.password} onChange={(v) => { setForm({ ...form, password: v }); setErrors({ ...errors, password: null }); }} placeholder="Min 6 characters" />
            </FormField>
          )}
          <FormField label="Role" required error={errors.role_id}>
            <FormSelect value={form.role_id} onChange={(v) => { setForm({ ...form, role_id: v }); setErrors({ ...errors, role_id: null }); }} options={roleOptions} placeholder="Select role" />
          </FormField>
          <SubmitButton loading={saving}>{editing ? 'Update' : 'Create'}</SubmitButton>
        </form>
      </Modal>

      <Modal open={!!statusModal} title={`Change Status - ${statusModal?.full_name || ''}`} onClose={() => setStatusModal(null)} width="360px">
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Select new status:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {USER_STATUSES.map((status) => (
            <button key={status} onClick={() => handleStatusChange(status)} disabled={statusModal?.status === status} style={{ background: statusModal?.status === status ? 'var(--surface-muted)' : 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '10px 16px', borderRadius: '10px', cursor: statusModal?.status === status ? 'default' : 'pointer', textAlign: 'left', fontSize: '14px', textTransform: 'capitalize', opacity: statusModal?.status === status ? 0.5 : 1 }}>
              {status} {statusModal?.status === status && '(current)'}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!roleModal} title={roleModal?.id ? `Role: ${roleForm.name}` : 'Add Role'} onClose={() => setRoleModal(null)} width="760px">
        <form onSubmit={handleRoleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Role Name" required><FormInput value={roleForm.name} onChange={(v) => setRoleForm({ ...roleForm, name: v })} disabled={roleForm.code === 'admin'} /></FormField>
            <FormField label="Role Code" required><FormInput value={roleForm.code} onChange={(v) => setRoleForm({ ...roleForm, code: v })} disabled={roleForm.code === 'admin'} placeholder="custom_role" /></FormField>
          </div>
          <FormField label="Description"><FormInput value={roleForm.description} onChange={(v) => setRoleForm({ ...roleForm, description: v })} /></FormField>
          {roleForm.code === 'admin' ? (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Admin always has all permissions.</p>
          ) : (
            <div style={{ maxHeight: '420px', overflow: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              {Object.entries(groupedPermissions).map(([module, features]) => (
                <div key={module} style={{ marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>{module}</h3>
                  {Object.entries(features).map(([feature, permissions]) => (
                    <div key={feature} style={{ marginBottom: '10px', paddingLeft: '8px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{feature}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                        {permissions.map((permission) => (
                          <label key={permission.permission_key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={rolePermissions.includes(permission.permission_key)} onChange={() => togglePermission(permission.permission_key)} />
                            <span><strong>{permission.permission_key}</strong><div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{permission.description}</div></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <SubmitButton loading={roleSaving}>Save Role</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
