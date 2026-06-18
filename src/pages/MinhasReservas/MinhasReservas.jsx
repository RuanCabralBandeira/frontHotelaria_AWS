import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listarReservas } from '../../services/reservaService';
import styles from './MinhasReservas.module.css';

const STATUS_MAP = {
  1: { label: 'Pendente',   color: '#f59e0b' },
  2: { label: 'Confirmada', color: '#22c55e' },
  3: { label: 'Cancelada',  color: '#ef4444' },
};

export default function MinhasReservas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listarReservas()
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        const minhas = user?.clienteId
          ? lista.filter(r => r.cliente_id === user.clienteId)
          : lista;
        setReservas(minhas);
      })
      .catch(() => setError('Não foi possível carregar suas reservas.'))
      .finally(() => setLoading(false));
  }, [user?.clienteId]);

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
  const noites = (ci, co) => {
    if (!ci || !co) return '—';
    return Math.round((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span>◆</span> <span>HOTEL LUXE</span>
        </div>
        <button className={styles.btnVoltar} onClick={() => navigate('/home')}>← Quartos</button>
      </nav>

      <div className={styles.container}>
        <h1 className={styles.titulo}>Minhas Reservas</h1>
        <p className={styles.sub}>{reservas.length} reserva{reservas.length !== 1 ? 's' : ''} encontrada{reservas.length !== 1 ? 's' : ''}</p>

        {loading && (
          <div className={styles.loadingList}>
            {[...Array(3)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!loading && error && (
          <div className={styles.empty}>
            <span>⚠</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && reservas.length === 0 && (
          <div className={styles.empty}>
            <span>📋</span>
            <p>Você ainda não tem reservas.</p>
            <button className={styles.btnNova} onClick={() => navigate('/home')}>Ver quartos disponíveis</button>
          </div>
        )}

        {!loading && !error && reservas.length > 0 && (
          <div className={styles.lista}>
            {reservas.map(r => {
              const st = STATUS_MAP[r.reserva_status] || STATUS_MAP[1];
              const n = noites(r.reserva_checkin, r.reserva_checkout);
              return (
                <div key={r.reserva_id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.reservaId}>Reserva #{r.reserva_id}</span>
                    <span className={styles.status} style={{ color: st.color, borderColor: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Check-in</span>
                      <span className={styles.infoVal}>{fmt(r.reserva_checkin)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Check-out</span>
                      <span className={styles.infoVal}>{fmt(r.reserva_checkout)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Noites</span>
                      <span className={styles.infoVal}>{n}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Quarto</span>
                      <span className={styles.infoVal}>{r.quarto_id ? `#${r.quarto_id}` : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
