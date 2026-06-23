import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { listarQuartos, excluirQuarto, editarParcialQuarto } from '../services/QuartoService';
import { listarReservas } from '../../../services/reservaService';
import styles from './Quartos.module.css';

const BADGE = {
  disponivel: { label: 'Disponível', cls: 'avail' },
  ocupado:    { label: 'Ocupado',    cls: 'busy'  },
  manutencao: { label: 'Manutenção', cls: 'maint' },
};

const hoje = () => new Date().toISOString().split('T')[0];
const dateOnly = (s) => (s || '').split('T')[0];

// Quarto está ocupado HOJE se houver reserva ativa (status 1 ou 2) cobrindo a data atual.
function ocupadoHoje(quartoId, reservas) {
  const h = hoje();
  return reservas.some(
    (r) =>
      r.quarto_id === quartoId &&
      [1, 2].includes(r.reserva_status) &&
      dateOnly(r.reserva_checkin) <= h &&
      h < dateOnly(r.reserva_checkout)
  );
}

// Status "efetivo": manutenção (manual) > ocupado (manual ou por reserva de hoje) > disponível.
function statusEfetivo(quarto, reservas) {
  if (quarto.status === 3) return 'manutencao';
  if (quarto.status === 2 || ocupadoHoje(quarto.id, reservas)) return 'ocupado';
  return 'disponivel';
}

function fotoSrc(foto) {
  if (!foto) return null;
  if (foto.foto_bin?.startsWith('data:')) return foto.foto_bin;
  return `data:image/${foto.foto_extensao || 'jpeg'};base64,${foto.foto_bin}`;
}

export default function Quartos() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [quartos, setQuartos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [mudandoStatus, setMudandoStatus] = useState(null);

  const fetch = async () => {
    setLoading(true); setError('');
    try {
      const [quartosData, reservasData] = await Promise.all([
        listarQuartos(),
        listarReservas().catch(() => []),
      ]);
      setQuartos(Array.isArray(quartosData) ? quartosData : []);
      setReservas(Array.isArray(reservasData) ? reservasData : []);
    } catch {
      setError('Não foi possível carregar os quartos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await excluirQuarto(id);
      setQuartos((qs) => qs.filter((q) => q.id !== id));
      setConfirm(null);
    } catch {
      setError('Erro ao excluir o quarto.');
    } finally {
      setDeleting(null);
    }
  };

  // Coloca em manutenção (status 3) ou reativa (status 1). Em manutenção, some da Home (que filtra status 1).
  const toggleManutencao = async (q) => {
    const novo = q.status === 3 ? 1 : 3;
    setMudandoStatus(q.id); setError('');
    try {
      await editarParcialQuarto(q.id, { status: novo });
      setQuartos((qs) => qs.map((x) => (x.id === q.id ? { ...x, status: novo } : x)));
    } catch {
      setError('Não foi possível alterar o status do quarto.');
    } finally {
      setMudandoStatus(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const efetivos = quartos.map((q) => statusEfetivo(q, reservas));
  const total       = quartos.length;
  const disponiveis = efetivos.filter((s) => s === 'disponivel').length;
  const ocupados    = efetivos.filter((s) => s === 'ocupado').length;
  const manutencao  = efetivos.filter((s) => s === 'manutencao').length;

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
          <button className={`${styles.navLink} ${styles.navLinkActive}`} onClick={() => navigate('/admin/quartos')}>Quartos</button>
          <button className={styles.navLink} onClick={() => navigate('/admin/tipos-quarto')}>Tipos de quarto</button>
          <button className={styles.navLink} onClick={() => navigate('/admin/reservas')}>Reservas</button>
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
            <h1 className={styles.title}>Gerenciar Quartos</h1>
          </div>
          <button className={styles.btnPrimary} onClick={() => navigate('/admin/quartos/novo')}>
            + Novo quarto
          </button>
        </div>

        {!loading && !error && (
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statVal}>{total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statVal} ${styles.statAvail}`}>{disponiveis}</span>
              <span className={styles.statLabel}>Disponíveis</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statVal} ${styles.statBusy}`}>{ocupados}</span>
              <span className={styles.statLabel}>Ocupados hoje</span>
            </div>
            <div className={styles.statCard}>
              <span className={`${styles.statVal} ${styles.statMaint}`}>{manutencao}</span>
              <span className={styles.statLabel}>Manutenção</span>
            </div>
          </div>
        )}

        {loading && (
          <div className={styles.skeletonList}>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button className={styles.btnGhost} onClick={fetch}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && quartos.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◈</span>
            <p className={styles.emptyTitle}>Nenhum quarto cadastrado</p>
            <button className={styles.btnPrimary} onClick={() => navigate('/admin/quartos/novo')}>
              Cadastrar o primeiro
            </button>
          </div>
        )}

        {!loading && !error && quartos.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thFoto}>Foto</th>
                  <th>Nº</th>
                  <th>Tipo</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th className={styles.right}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {quartos.map((q) => {
                  const ef = statusEfetivo(q, reservas);
                  const st = BADGE[ef];
                  const emManutencao = q.status === 3;
                  const primeiraFoto = q.fotos?.[0];
                  return (
                    <tr key={q.id}>
                      <td className={styles.tdFoto}>
                        {primeiraFoto ? (
                          <img className={styles.thumb} src={fotoSrc(primeiraFoto)} alt="foto" />
                        ) : (
                          <div className={styles.thumbPlaceholder}>◈</div>
                        )}
                      </td>
                      <td className={styles.numero}>{q.numero || `#${q.id}`}</td>
                      <td>{q.tipoQuarto?.descricao || '—'}</td>
                      <td className={styles.preco}>
                        R$ {q.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span>
                      </td>
                      <td className={styles.right}>
                        {confirm === q.id ? (
                          <span className={styles.confirmRow}>
                            <span className={styles.confirmTxt}>Excluir?</span>
                            <button className={styles.btnDanger} disabled={deleting === q.id} onClick={() => handleDelete(q.id)}>
                              {deleting === q.id ? '…' : 'Sim'}
                            </button>
                            <button className={styles.btnMini} onClick={() => setConfirm(null)}>Não</button>
                          </span>
                        ) : (
                          <span className={styles.actionsCell}>
                            <button className={styles.btnMini} onClick={() => navigate(`/admin/quartos/${q.id}/editar`)}>
                              Editar
                            </button>
                            <button
                              className={emManutencao ? styles.btnMini : styles.btnMiniWarn}
                              disabled={mudandoStatus === q.id}
                              onClick={() => toggleManutencao(q)}
                              title={emManutencao ? 'Reativar (volta a aparecer para reserva)' : 'Colocar em manutenção (some da listagem de reserva)'}
                            >
                              {mudandoStatus === q.id ? '…' : emManutencao ? 'Reativar' : 'Manutenção'}
                            </button>
                            <button className={styles.btnMiniDanger} onClick={() => setConfirm(q.id)}>
                              Excluir
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
