import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { listarQuartos, excluirQuarto } from '../services/QuartoService';
import styles from './Quartos.module.css';

const STATUS_MAP = {
  1: { label: 'Disponível', cls: 'avail' },
  2: { label: 'Ocupado',    cls: 'busy'  },
  3: { label: 'Manutenção', cls: 'maint' },
};

function fotoSrc(foto) {
  if (!foto) return null;
  if (foto.foto_bin?.startsWith('data:')) return foto.foto_bin;
  return `data:image/${foto.foto_extensao || 'jpeg'};base64,${foto.foto_bin}`;
}

export default function Quartos() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [quartos, setQuartos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetch = async () => {
    setLoading(true); setError('');
    try {
      const data = await listarQuartos();
      setQuartos(Array.isArray(data) ? data : []);
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

  const handleLogout = () => { logout(); navigate('/'); };

  const total       = quartos.length;
  const disponiveis = quartos.filter((q) => q.status === 1).length;
  const ocupados    = quartos.filter((q) => q.status === 2).length;
  const manutencao  = quartos.filter((q) => q.status === 3).length;

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
              <span className={styles.statLabel}>Ocupados</span>
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
                  const st = STATUS_MAP[q.status] || STATUS_MAP[1];
                  const primeiraFoto = q.fotos?.[0];
                  return (
                    <tr key={q.id}>
                      <td className={styles.tdFoto}>
                        {primeiraFoto ? (
                          <img
                            className={styles.thumb}
                            src={fotoSrc(primeiraFoto)}
                            alt="foto"
                          />
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
                            <button
                              className={styles.btnDanger}
                              disabled={deleting === q.id}
                              onClick={() => handleDelete(q.id)}
                            >
                              {deleting === q.id ? '…' : 'Sim'}
                            </button>
                            <button className={styles.btnMini} onClick={() => setConfirm(null)}>Não</button>
                          </span>
                        ) : (
                          <span className={styles.actionsCell}>
                            <button className={styles.btnMini} onClick={() => navigate(`/admin/quartos/${q.id}/editar`)}>
                              Editar
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
