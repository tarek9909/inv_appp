import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, CreditCard, ShoppingCart, RefreshCw, AlertTriangle } from 'lucide-react';
import { reportStore } from '../state/index.js';
import { useStore } from '../hooks/useStore.js';
import { StatusBadge } from '../components/DataTable.jsx';

export default function ReportsPage() {
  const { inventorySummary, driverBalances, paymentSummary, purchaseSummary, loading, error } = useStore(reportStore);

  const loadAll = () => {
    reportStore.loadInventorySummary().catch(() => {});
    reportStore.loadDriverBalances().catch(() => {});
    reportStore.loadPaymentSummary().catch(() => {});
    reportStore.loadPurchaseSummary().catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  if (error && !inventorySummary && !driverBalances) {
    return (
      <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
        <AlertTriangle size={32} color="var(--accent-red)" style={{ marginBottom: '16px' }} />
        <h3 style={{ marginBottom: '8px' }}>Failed to load reports</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>{error?.message || 'Something went wrong'}</p>
        <button onClick={loadAll} className="glass-button" style={{ display: 'inline-flex' }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Inventory Summary */}
      <ReportSection title="Inventory Summary" icon={BarChart3} loading={loading && !inventorySummary}>
        {inventorySummary && Array.isArray(inventorySummary) && inventorySummary.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'SKU', 'Stock', 'Min Stock', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventorySummary.map((item, idx) => {
                  const low = item.current_stock <= (item.minimum_stock || 0);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '14px' }}>{item.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{item.sku || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '14px', color: low ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: low ? '600' : '400' }}>{item.current_stock}</td>
                      <td style={{ padding: '10px 14px', fontSize: '14px' }}>{item.minimum_stock}</td>
                      <td style={{ padding: '10px 14px' }}>{low ? <StatusBadge status="low stock" colorMap={{ 'low stock': 'var(--accent-red)' }} /> : <StatusBadge status="ok" colorMap={{ ok: 'var(--accent-green)' }} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </ReportSection>

      {/* Driver Balances */}
      <ReportSection title="Driver Balances" icon={Users} loading={loading && !driverBalances}>
        {driverBalances && Array.isArray(driverBalances) && driverBalances.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Driver', 'Phone', 'Status', 'Balance'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driverBalances.map((d, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '14px' }}>{d.full_name}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{d.phone || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={d.status} /></td>
                    <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: '600', color: Number(d.balance || d.remaining_amount || 0) > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>${Number(d.balance || d.remaining_amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </ReportSection>

      {/* Payment Summary */}
      <ReportSection title="Payment Summary" icon={CreditCard} loading={loading && !paymentSummary}>
        {paymentSummary && Array.isArray(paymentSummary) && paymentSummary.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Total Amount'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentSummary.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '14px' }}>{p.date || p.payment_date || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: '600' }}>${Number(p.total || p.total_amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </ReportSection>

      {/* Purchase Summary */}
      <ReportSection title="Purchase Summary" icon={ShoppingCart} loading={loading && !purchaseSummary}>
        {purchaseSummary && Array.isArray(purchaseSummary) && purchaseSummary.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {purchaseSummary.map((s, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                <StatusBadge status={s.status} />
                <div style={{ marginTop: '12px', fontSize: '24px', fontWeight: '700' }}>{s.count || 0}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>orders • ${Number(s.total_amount || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </ReportSection>
    </div>
  );
}

function ReportSection({ title, icon: Icon, loading, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon size={18} color="var(--accent-blue)" />
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{title}</h3>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: '20px', borderRadius: '4px', background: 'var(--surface-subtle)', animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : children}
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No records available</p>;
}
