import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Truck, ClipboardList, DollarSign, RefreshCw } from 'lucide-react';
import { reportStore } from '../state/index.js';
import { useStore } from '../hooks/useStore.js';

const METRICS = [
  { key: 'total_items', label: 'Total Items', icon: Package, color: 'var(--accent-blue)' },
  { key: 'low_stock_items', label: 'Low Stock Items', icon: AlertTriangle, color: 'var(--accent-orange)' },
  { key: 'active_drivers', label: 'Active Drivers', icon: Truck, color: 'var(--accent-green)' },
  { key: 'pending_stock_requests', label: 'Pending Requests', icon: ClipboardList, color: 'var(--accent-purple)' },
  { key: 'unpaid_requests', label: 'Unpaid Requests', icon: DollarSign, color: 'var(--accent-red)' }
];

export default function DashboardHome() {
  const { dashboard, loading, error } = useStore(reportStore);

  useEffect(() => {
    reportStore.loadDashboard().catch(() => {});
  }, []);

  if (error && !dashboard) {
    return (
      <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
        <AlertTriangle size={32} color="var(--accent-red)" style={{ marginBottom: '16px' }} />
        <h3 style={{ marginBottom: '8px' }}>Failed to load dashboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>{error?.message || 'Something went wrong'}</p>
        <button onClick={() => reportStore.loadDashboard()} className="glass-button" style={{ display: 'inline-flex' }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {METRICS.map((metric, idx) => {
          const Icon = metric.icon;
          const value = dashboard?.[metric.key];
          return (
            <motion.div
              key={metric.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card"
              style={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{metric.label}</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `color-mix(in srgb, ${metric.color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={metric.color} />
                </div>
              </div>
              {loading || value === undefined ? (
                <div style={{ height: '32px', width: '80px', borderRadius: '6px', background: 'var(--surface-subtle)', animation: 'pulse 1.5s infinite' }} />
              ) : (
                <div style={{ fontSize: '28px', fontWeight: '700' }}>{value?.toLocaleString?.() ?? value}</div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
