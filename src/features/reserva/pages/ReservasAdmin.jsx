import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { listarReservas } from '../../../services/reservaService';
import { listarQuartos } from '../../quarto/services/QuartoService';
import { listarClientes } from '../../../services/clienteService';
import { maskCPF, maskTelefone } from '../../../utils/validators';
import styles from './ReservasAdmin.module.css';

const RESERVA_STATUS = {
  1: { label: 'Pendente', cls: 'pend' },
  2: { label: 'Confirmada', cls: 'conf' },
  3: { label: 'Cancelada', cls: 'canc' },
  4: { label: 'Realocação', cls: 'realloc' },
};

const PAGAMENTO_STATUS = {
  0: 'Aguardando',
  1: 'Pago',
  2: 'Recusado',
};

const fmtData = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
};
const dateOnly = (s) => (s || '').split('T')[0];
const hoje = () => new Date().toISOString().split('T')[0];
const noites = (ci, co) => {
  if (!ci || !co) return 0;
  return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
};
const PAGAMENTO_CLS = { 0: 'pgAguard', 1: 'pgPago', 2: 'pgRecusado' };

// Período da reserva em relação a hoje
function periodo(reserva) {
  const h = hoje();
  const ci = dateOnly(reserva.reserva_checkin);
  const co = dateOnly(reserva.reserva_checkout);
  if (co <= h) return { label: 'Encerrada', cls: 'encerrada' };
  if (ci > h) return { label: 'Futura', cls: 'futura' };
  return { label: 'Em andamento', cls: 'andamento' };
}

export default function ReservasAdmin() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [reservas, setReservas] = useState([]);
  const [quartoMap, setQuartoMap] = useState({});
  const [clienteMap, setClienteMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState(null);

  const carregar = async () => {
    setLoading(true); setError('');
    try {
      const [reservasData, quartosData, clientesData] = await Promise.all([
        listarReservas(),
        listarQuartos().catch(() => []),
        listarClientes().catch(() => []),
      ]);
      setReservas(Array.isArray(reservasData) ? reservasData : []);
      setQuartoMap(Object.fromEntries((quartosData || []).map((q) => [q.id, q])));
      setClienteMap(Object.fromEntries((clientesData || []).map((c) => [c.cliente_id, c])));
    } catch {
      setError('Não foi possível carregar as reservas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const nomeCliente = (id) => clienteMap[id]?.cliente_nome || (id ? `Cliente #${id}` : '—');
  const labelQuarto = (id) => {
    const q = quartoMap[id];
    if (!q) return id ? `Quarto #${id}` : '—';
    const num = q.numero ? `Nº ${q.numero}` : `#${q.id}`;
    const tipo = q.tipoQuarto?.descricao ? ` · ${q.tipoQuarto.descricao}` : '';
    return `${num}${tipo}`;
  };

  // Estatísticas
  const stats = useMemo(() => {
    const total = reservas.length;
    const confirmadas = reservas.filter((r) => r.reserva_status === 2).length;
    const h = hoje();
    const ocupadosHoje = new Set(
      reservas
        .filter((r) => [1, 2].includes(r.reserva_status))
        .filter((r) => dateOnly(r.reserva_checkin) <= h && h < dateOnly(r.reserva_checkout))
        .map((r) => r.quarto_id)
        .filter(Boolean)
    ).size;
    return { total, confirmadas, ocupadosHoje };
  }, [reservas]);

  // Lista filtrada + ordenada (mais recentes primeiro)
  const lista = useMemo(() => {
    let l = [...reservas];
    if (filtroStatus) l = l.filter((r) => String(r.reserva_status) === filtroStatus);
    if (busca.trim()) {
      const t = busca.trim().toLowerCase();
      l = l.filter((r) =>
        nomeCliente(r.cliente_id).toLowerCase().includes(t) ||
        labelQuarto(r.quarto_id).toLowerCase().includes(t) ||
        String(r.reserva_id).includes(t)
      );
    }
    return l.sort((a, b) => (b.reserva_id || 0) - (a.reserva_id || 0));
  }, [reservas, filtroStatus, busca, quartoMap, clienteMap]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.orb} />
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/admin/quartos')}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>HOTEL LUXE</span>
          <span className={styles.adminTag}>ADMIN</span>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.navLink} onClick={() => navigate('/admin/quartos')}>Quartos</button>
          <button className={styles.navLink} onClick={() => navigate('/admin/tipos-quarto')}>Tipos de quarto</button>
          <button className={`${styles.navLink} ${styles.navLinkActive}`} onClick={() => navigate('/admin/reservas')}>Reservas</button>
        </div>
        <div className={styles.navRight}>
          <span className={styles.userName}>{user?.login || 'Admin'}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sair</button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Painel administrativo</p>
            <h1 className={styles.title}>Reservas</h1>
          </div>
          <button className={styles.refreshBtn} onClick={carregar} title="Atualizar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>

        {!loading && !error && (
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statVal}>{stats.total}</span>
              <span className={styles.statLabel}>Reservas no total</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statVal} ${styles.statConf}`}>{stats.confirmadas}</span>
              <span className={styles.statLabel}>Confirmadas</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statVal} ${styles.statBusy}`}>{stats.ocupadosHoje}</span>
              <span className={styles.statLabel}>Quartos ocupados hoje</span>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className={styles.toolbar}>
            <div className={styles.chips}>
              {[
                { v: '', l: 'Todas' },
                { v: '1', l: 'Pendentes' },
                { v: '2', l: 'Confirmadas' },
                { v: '3', l: 'Canceladas' },
              ].map(({ v, l }) => (
                <button key={v} className={`${styles.chip} ${filtroStatus === v ? styles.chipActive : ''}`} onClick={() => setFiltroStatus(v)}>
                  {l}
                </button>
              ))}
            </div>
            <input
              className={styles.search}
              placeholder="Buscar por cliente, quarto ou nº…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        )}

        {loading && (
          <div className={styles.skeletonList}>
            {[...Array(5)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button className={styles.btnGhost} onClick={carregar}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && lista.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <p className={styles.emptyTitle}>Nenhuma reserva encontrada</p>
            <p className={styles.emptyMsg}>Ajuste o filtro ou aguarde novas reservas.</p>
          </div>
        )}

        {!loading && !error && lista.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Quarto</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Período</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const st = RESERVA_STATUS[r.reserva_status] || { label: `?(${r.reserva_status})`, cls: 'pend' };
                  const per = periodo(r);
                  return (
                    <tr key={r.reserva_id} className={styles.rowClick} onClick={() => setSelecionada(r)}>
                      <td className={styles.numero}>#{r.reserva_id}</td>
                      <td>{nomeCliente(r.cliente_id)}</td>
                      <td className={styles.quarto}>{labelQuarto(r.quarto_id)}</td>
                      <td>{fmtData(r.reserva_checkin)}</td>
                      <td>{fmtData(r.reserva_checkout)}</td>
                      <td><span className={`${styles.periodo} ${styles[per.cls]}`}>{per.label}</span></td>
                      <td><span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span></td>
                      <td className={styles.pgto}>{PAGAMENTO_STATUS[r.pagamento_status] ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selecionada && (() => {
        const r = selecionada;
        const c = clienteMap[r.cliente_id];
        const q = quartoMap[r.quarto_id];
        const st = RESERVA_STATUS[r.reserva_status] || { label: `?(${r.reserva_status})`, cls: 'pend' };
        const per = periodo(r);
        const qn = noites(r.reserva_checkin, r.reserva_checkout);
        const total = q?.preco ? q.preco * qn : null;
        const pgCls = PAGAMENTO_CLS[r.pagamento_status] || 'pgAguard';
        const pgLabel = PAGAMENTO_STATUS[r.pagamento_status] ?? 'Desconhecido';
        return (
          <div className={styles.modalBackdrop} onClick={() => setSelecionada(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setSelecionada(null)}>✕</button>

              <div className={styles.modalHead}>
                <div>
                  <p className={styles.eyebrow}>Reserva #{r.reserva_id}</p>
                  <h2 className={styles.modalTitle}>{labelQuarto(r.quarto_id)}</h2>
                </div>
                <div className={styles.modalBadges}>
                  <span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span>
                  <span className={`${styles.periodo} ${styles[per.cls]}`}>{per.label}</span>
                </div>
              </div>

              {/* Pagamento em destaque */}
              <div className={`${styles.pgBanner} ${styles[pgCls]}`}>
                <span className={styles.pgBannerLabel}>Pagamento</span>
                <span className={styles.pgBannerVal}>
                  {r.pagamento_status === 1 ? '✓ ' : r.pagamento_status === 2 ? '✕ ' : '• '}{pgLabel}
                </span>
              </div>

              {/* Hóspede */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Hóspede</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Nome</span><span className={styles.infoVal}>{c?.cliente_nome || nomeCliente(r.cliente_id)}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Idade</span><span className={styles.infoVal}>{c?.cliente_idade != null ? `${c.cliente_idade} anos` : '—'}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Gênero</span><span className={styles.infoVal}>{c?.cliente_genero || '—'}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>CPF</span><span className={styles.infoVal}>{c?.cliente_cpf ? maskCPF(c.cliente_cpf) : '—'}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Telefone</span><span className={styles.infoVal}>{c?.cliente_telefone ? maskTelefone(c.cliente_telefone) : '—'}</span></div>
                  {!c && <div className={styles.infoItem}><span className={styles.infoLabel}>Obs.</span><span className={styles.infoVal}>Dados do cliente indisponíveis</span></div>}
                </div>
              </div>

              {/* Estadia */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Estadia</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Check-in</span><span className={styles.infoVal}>{fmtData(r.reserva_checkin)}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Check-out</span><span className={styles.infoVal}>{fmtData(r.reserva_checkout)}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Noites</span><span className={styles.infoVal}>{qn || '—'}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Quarto</span><span className={styles.infoVal}>{labelQuarto(r.quarto_id)}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Preço/noite</span><span className={styles.infoVal}>{q?.preco != null ? `R$ ${q.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span></div>
                  <div className={styles.infoItem}><span className={styles.infoLabel}>Total estimado</span><span className={styles.infoVal}>{total != null ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
