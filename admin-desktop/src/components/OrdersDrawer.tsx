import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SnackOrder } from '../types';

interface OrdersDrawerProps {
  onClose: () => void;
  onOrderUpdated: () => void;
}

export default function OrdersDrawer({ onClose, onOrderUpdated }: OrdersDrawerProps) {
  const [orders, setOrders] = useState<SnackOrder[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('PENDING');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const data = await api.fetchOrders();
      setOrders(data);
    } catch (err) {
      console.warn('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    const ok = await api.updateOrderStatus(orderId, status);
    if (ok) {
      loadOrders();
      onOrderUpdated();
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🍔</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#00f0ff' }} className="font-orbitron">
                SNACK BAR ORDERS
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {pendingCount} Pending Delivery
              </span>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterBar}>
          {(['PENDING', 'DELIVERED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                borderBottomColor: filter === f ? '#00f0ff' : 'transparent',
                color: filter === f ? '#00f0ff' : '#94a3b8',
              }}
            >
              {f} {f === 'PENDING' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div style={styles.list}>
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
              <div>No {filter.toLowerCase()} orders at the moment.</div>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isPending = order.status === 'PENDING';
              return (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderCardHeader}>
                    <span style={styles.stationBadge}>📍 {order.pc_id.toUpperCase()}</span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: isPending ? '#f59e0b' : '#10b981',
                      border: `1px solid ${isPending ? '#f59e0b' : '#10b981'}`,
                    }}>
                      {order.status}
                    </span>
                  </div>

                  <div style={styles.orderItems}>
                    {order.description || (Array.isArray(order.items) ? order.items.map(i => `${i.name} x${i.quantity}`).join(', ') : 'Assorted Snacks')}
                  </div>

                  <div style={styles.orderFooter}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff88' }} className="font-orbitron">
                      {order.amount_kzt.toLocaleString()} ₸
                    </div>
                    {isPending ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                          className="cyber-button"
                          style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          ✓ DELIVERED
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          className="cyber-button secondary"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 16, 0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  drawer: {
    width: '460px',
    maxWidth: '90vw',
    height: '100vh',
    backgroundColor: '#0d1226',
    borderLeft: '1px solid var(--border-neon)',
    boxShadow: '-10px 0 35px rgba(0, 240, 255, 0.2)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: '#090d1e',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  filterBar: {
    display: 'flex',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(7, 9, 19, 0.5)',
  },
  filterBtn: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  orderItems: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: 1.4,
  },
  orderFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '10px',
  },
};
