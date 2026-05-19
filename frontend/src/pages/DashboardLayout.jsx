import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Package, Truck, Users, Activity, FileText, BarChart3, UserCog, Settings, ClipboardList } from 'lucide-react';
import { authStore } from '../state/index.js';
import { useStore } from '../hooks/useStore.js';
import { motion } from 'framer-motion';

export default function DashboardLayout() {
  const { user } = useStore(authStore);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { label: 'Inventory', path: '/dashboard/inventory', icon: Package, permission: 'inventory.view' },
    { label: 'Fleet & Dispatch', path: '/dashboard/fleet', icon: Truck, permission: 'fleet.view' },
    { label: 'Driver Portal', path: '/dashboard/driver', icon: ClipboardList, permission: 'driver_portal.view' },
    { label: 'Team', path: '/dashboard/team', icon: Users, permission: 'team.view' },
    { label: 'Configuration', path: '/dashboard/configuration', icon: Settings, permission: 'settings.manage' },
    { label: 'Audit Logs', path: '/dashboard/audit', icon: Activity, permission: 'audit_logs.view' },
    { label: 'Reports', path: '/dashboard/reports', icon: BarChart3, permission: 'reports.view' },
    { label: 'Profile', path: '/dashboard/profile', icon: UserCog }
  ];

  const canAccess = (item, currentUser = user) => !item.permission || currentUser.role?.code === 'admin' || (currentUser.permissions || []).includes(item.permission);
  const defaultPathFor = (currentUser) => navItems.find((item) => canAccess(item, currentUser))?.path || '/';

  useEffect(() => {
    if (!user) {
      authStore.loadCurrentUser().then((loadedUser) => {
        if (!loadedUser) navigate('/');
      }).catch(() => navigate('/'));
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const activeItem = navItems.find((item) => location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)));
    if (activeItem && !canAccess(activeItem)) {
      navigate(defaultPathFor(user), { replace: true });
    }
  }, [user, location.pathname, navigate]);

  if (!user) return null;

  const activeItem = navItems.find((item) => location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path)));
  if (activeItem && !canAccess(activeItem)) return null;

  const handleLogout = () => {
    authStore.logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', padding: '20px', gap: '24px' }}>
      {/* Sidebar */}
      <motion.aside 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel"
        style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Stock Driver</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Logistics System</p>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.filter(item => canAccess(item)).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <div 
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.18)' : '1px solid transparent'
                }}
              >
                <item.icon size={20} color={isActive ? 'var(--accent-blue)' : 'currentColor'} />
                <span style={{ fontWeight: isActive ? '500' : '400' }}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' }}>
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{user.full_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.role?.name}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
            <LogOut size={20} />
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        <header className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>{navItems.find(i => location.pathname === i.path || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.label || 'Dashboard'}</h1>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Welcome back, {user.full_name.split(' ')[0]}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
