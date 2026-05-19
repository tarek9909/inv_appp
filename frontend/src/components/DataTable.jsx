import React, { useState, useRef, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function DataTable({ columns, rows, meta = {}, loading, error, onLoad, emptyMessage = 'No records found', actions, toolbar }) {
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onLoad?.({ search: value, page: 1 });
    }, 300);
  }, [onLoad]);

  const goToPage = (page) => {
    onLoad?.({ page });
  };

  const { page = 1, pages = 1, total = 0 } = meta;

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className="glass-input"
            style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '13px' }}
          />
        </div>
        {toolbar && <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>{toolbar}</div>}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
              {actions && <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: '14px 16px' }}>
                      <div style={{ height: '16px', borderRadius: '4px', background: 'var(--surface-subtle)', animation: 'pulse 1.5s infinite' }} />
                    </td>
                  ))}
                  {actions && <td style={{ padding: '14px 16px' }}><div style={{ height: '16px', width: '60px', borderRadius: '4px', background: 'var(--surface-subtle)' }} /></td>}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{error?.message || 'Failed to load data'}</span>
                    <button onClick={() => onLoad?.({})} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <RefreshCw size={14} /> Retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: col.nowrap ? 'nowrap' : 'normal' }}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && rows.length > 0 && (
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>{total} record{total !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px', borderRadius: '8px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {pages}</span>
            <button onClick={() => goToPage(page + 1)} disabled={page >= pages} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px', borderRadius: '8px', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActionButton({ icon: Icon, label, onClick, color = 'var(--text-secondary)' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color, padding: '8px', minWidth: '36px', minHeight: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon size={20} />
    </button>
  );
}

export function StatusBadge({ status, colorMap = {} }) {
  const defaultColors = {
    active: 'var(--accent-green)',
    inactive: 'var(--accent-orange)',
    blocked: 'var(--accent-red)',
    draft: 'var(--text-muted)',
    pending: 'var(--accent-orange)',
    approved: 'var(--accent-green)',
    partially_received: 'var(--accent-blue)',
    received: 'var(--accent-green)',
    completed: 'var(--accent-green)',
    cancelled: 'var(--accent-red)',
    paid: 'var(--accent-green)',
    partially_paid: 'var(--accent-blue)',
    stock_out: 'var(--accent-orange)',
    stock_return: 'var(--accent-blue)'
  };
  const color = colorMap[status] || defaultColors[status] || 'var(--text-secondary)';
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `color-mix(in srgb, ${color} 15%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, textTransform: 'capitalize' }}>
      {status?.replace(/_/g, ' ') || '—'}
    </span>
  );
}
