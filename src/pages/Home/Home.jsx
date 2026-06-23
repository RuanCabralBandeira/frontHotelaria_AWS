import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quartoApi } from '../../services/api';
import { listarReservas } from '../../services/reservaService';
import ReservaModal from './ReservaModal';
import styles from './Home.module.css';

const TIPO_ICONS = {
  'Luxo': '♛',
  'Standard': '◈',
  'Suite': '◆',
  'Executive': '✦',
};

const hoje = () => new Date().toISOString().split('T')[0];
const dateOnly = (s) => (s || '').split('T')[0];
const noites = (ci, co) => {
  if (!ci || !co) return 0;
  return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
};

// Um quarto está ocupado nas datas se houver reserva ativa (status 1 ou 2)
// para o mesmo quarto cujo intervalo se sobrepõe a [ci, co).
// Foto real do quarto (vinda do banco, ligada pelo quarto_id) ou placeholder de fallback
function fotoDoQuarto(quarto) {
  const f = quarto?.fotos?.find((x) => x?.foto_bin) || quarto?.fotos?.[0];
  if (f?.foto_bin) {
    return f.foto_bin.startsWith('data:')
      ? f.foto_bin
      : `data:image/${f.foto_extensao || 'jpeg'};base64,${f.foto_bin}`;
  }
  return placeholderQuarto(quarto);
}

// Placeholder de fallback (sem foto no banco ou base64 quebrada)
function placeholderQuarto(quarto) {
  const ph = ['1631049307264', '1618773928121', '1582719478250', '1544161515-4ab6ce6db874'][(quarto?.id || 0) % 4];
  return `https://images.unsplash.com/photo-${ph}?w=600&q=75`;
}

// Se a imagem (base64) falhar ao carregar, troca pelo placeholder uma única vez
function onImgError(quarto) {
  return (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = placeholderQuarto(quarto);
  };
}

const quartoOcupado = (quartoId, ci, co, reservas) =>
  reservas.some((r) => {
    if (r.quarto_id !== quartoId) return false;
    if (![1, 2].includes(r.reserva_status)) return false;
    const rin = dateOnly(r.reserva_checkin);
    const rout = dateOnly(r.reserva_checkout);
    return ci < rout && rin < co; // sobreposição de intervalos
  });

function QuartoCard({ quarto, qtdNoites, onClick }) {
  const tipoNome = quarto.tipoQuarto?.descricao || 'Quarto';
  const icon = Object.entries(TIPO_ICONS).find(([k]) => tipoNome.includes(k))?.[1] || '◈';

  const placeholder = fotoDoQuarto(quarto);

  return (
    <div className={styles.card} onClick={() => onClick(quarto)}>
      <div className={styles.cardImg}>
        <img src={placeholder} alt={tipoNome} className={styles.cardPhoto} loading="lazy" onError={onImgError(quarto)} />
        <div className={styles.cardImgOverlay} />
        <div className={`${styles.statusBadge} ${styles.statusAvail}`}>
          Livre nas datas
        </div>
        {quarto.numero && (
          <div className={styles.numeroBadge}>Nº {quarto.numero}</div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div>
            <p className={styles.tipoIcon}>{icon}</p>
            <h3 className={styles.tipoNome}>{tipoNome}</h3>
          </div>
          <div className={styles.precoWrapper}>
            <span className={styles.precoLabel}>por noite</span>
            <span className={styles.preco}>
              R$ {quarto.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {qtdNoites > 0 && (
          <p className={styles.cardTotal}>
            {qtdNoites} noite{qtdNoites > 1 ? 's' : ''} · R$ {(quarto.preco * qtdNoites).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}

        <button className={styles.btnReservar}>
          Reservar →
        </button>
      </div>
    </div>
  );
}

function QuartoModal({ quarto, datas, onClose, onReservar }) {
  if (!quarto) return null;
  const tipoNome = quarto.tipoQuarto?.descricao || 'Quarto';
  const qtdNoites = datas ? noites(datas.checkin, datas.checkout) : 0;
  const subtotal = quarto.preco * (qtdNoites || 1);
  const taxas = subtotal * 0.1;
  const placeholder = fotoDoQuarto(quarto);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>
        <div className={styles.modalImg}>
          <img src={placeholder} alt={tipoNome} onError={onImgError(quarto)} />
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <div>
              <p className={styles.eyebrow}>Quarto {quarto.numero || quarto.id}</p>
              <h2 className={styles.modalTitle}>{tipoNome}</h2>
            </div>
            <div className={styles.modalPreco}>
              <span className={styles.precoLabel}>A partir de</span>
              <span className={styles.modalPrecoVal}>
                R$ {quarto.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className={styles.precoUnit}>/noite</span>
            </div>
          </div>

          <div className={styles.modalInfoGrid}>
            <div className={styles.modalInfoItem}>
              <span className={styles.infoIcon}>🛏</span>
              <span>Cama King Size</span>
            </div>
            <div className={styles.modalInfoItem}>
              <span className={styles.infoIcon}>📶</span>
              <span>Wi-Fi incluso</span>
            </div>
            <div className={styles.modalInfoItem}>
              <span className={styles.infoIcon}>🍳</span>
              <span>Café da manhã</span>
            </div>
            <div className={styles.modalInfoItem}>
              <span className={styles.infoIcon}>❄️</span>
              <span>Ar condicionado</span>
            </div>
          </div>

          <div className={styles.modalResumo}>
            <p className={styles.resumoTitle}>Resumo da compra</p>
            {datas && (
              <div className={styles.resumoRow}>
                <span>Período</span>
                <span>
                  {new Date(datas.checkin).toLocaleDateString('pt-BR')} → {new Date(datas.checkout).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <div className={styles.resumoRow}>
              <span>R$ {quarto.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × {qtdNoites || 1} {qtdNoites === 1 ? 'diária' : 'diárias'}</span>
              <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={styles.resumoRow}>
              <span>Taxas e impostos (10%)</span>
              <span>R$ {taxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={`${styles.resumoRow} ${styles.resumoTotal}`}>
              <span>Total</span>
              <span>R$ {(subtotal + taxas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button className={styles.btnReservarModal} onClick={() => onReservar(quarto)}>
            Reservar Agora
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const [quartos, setQuartos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [selectedQuarto, setSelectedQuarto] = useState(null);
  const [reservarQuarto, setReservarQuarto] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchDados = async () => {
    setLoading(true);
    setError('');
    try {
      const [quartosRes, reservasRes] = await Promise.all([
        quartoApi.get('/api/quartos'),
        listarReservas().catch(() => []), // se reservas falhar, segue só com status do quarto
      ]);
      setQuartos(Array.isArray(quartosRes.data) ? quartosRes.data : []);
      setReservas(Array.isArray(reservasRes) ? reservasRes : []);
    } catch (err) {
      setError('Não foi possível carregar os quartos. Verifique se o servidor está ativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const datasValidas = Boolean(checkin && checkout && checkout > checkin);
  const qtdNoites = noites(checkin, checkout);

  const quartosDisponiveis = datasValidas
    ? quartos.filter((q) => q.status === 1 && !quartoOcupado(q.id, checkin, checkout, reservas))
    : [];

  const quartosFiltrados = filtroTipo
    ? quartosDisponiveis.filter((q) => q.tipoQuarto?.descricao?.toLowerCase().includes(filtroTipo.toLowerCase()))
    : quartosDisponiveis;

  const tiposUnicos = [...new Set(quartosDisponiveis.map((q) => q.tipoQuarto?.descricao).filter(Boolean))];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.wrapper}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>HOTEL LUXE</span>
        </div>

        <div className={styles.navCenter}>
          <button className={styles.navLink}>Quartos</button>
          <button className={styles.navLink}>Reservas</button>
          <button className={styles.navLink} onClick={() => navigate('/servicos')}>Serviços</button>
          <button className={styles.navLink} onClick={() => navigate('/contato')}>Contato</button>
        </div>

        <div className={styles.navRight}>
          <div className={styles.userMenu}>
            <button className={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
              <div className={styles.userAvatar}>
                {user?.login?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className={styles.userName}>{user?.login || 'Usuário'}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={() => navigate('/configuracoes')}>Configurações</button>
                <button className={styles.dropdownItem} onClick={() => navigate('/reservas')}>Minhas reservas</button>
                {isAdmin && (
                  <button className={styles.dropdownItem} onClick={() => navigate('/admin/quartos')}>
                    Painel admin
                  </button>
                )}
                <div className={styles.dropdownDivider} />
                <button className={styles.dropdownItem} onClick={handleLogout} style={{ color: '#ff6b6b' }}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero strip */}
      <div className={styles.heroStrip}>
        <div className={styles.heroStripContent}>
          <h1 className={styles.heroTitle}>
            Encontre seu <em>Quarto</em>
          </h1>
          <p className={styles.heroSub}>
            Escolha as datas da sua estadia para ver os quartos disponíveis.
          </p>
        </div>
        <div className={styles.heroOrb} />
      </div>

      {/* Barra de busca por datas */}
      <div className={styles.searchBar}>
        <div className={styles.searchField}>
          <label className={styles.searchLabel}>Check-in</label>
          <input
            type="date"
            className={styles.searchInput}
            min={hoje()}
            value={checkin}
            onChange={(e) => {
              setCheckin(e.target.value);
              if (checkout && e.target.value && checkout <= e.target.value) setCheckout('');
            }}
          />
        </div>
        <div className={styles.searchField}>
          <label className={styles.searchLabel}>Check-out</label>
          <input
            type="date"
            className={styles.searchInput}
            min={checkin || hoje()}
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            disabled={!checkin}
          />
        </div>
        {datasValidas && (
          <div className={styles.searchInfo}>
            <span className={styles.searchNoites}>{qtdNoites} noite{qtdNoites > 1 ? 's' : ''}</span>
            <span className={styles.searchCount}>
              {quartosDisponiveis.length} quarto{quartosDisponiveis.length !== 1 ? 's' : ''} disponíve{quartosDisponiveis.length !== 1 ? 'is' : 'l'}
            </span>
          </div>
        )}
        <button className={styles.refreshBtn} onClick={fetchDados} title="Atualizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

      {/* Filtro por tipo (só quando há datas e quartos) */}
      {datasValidas && tiposUnicos.length > 0 && (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Tipo</span>
            <div className={styles.filterChips}>
              <button className={`${styles.chip} ${filtroTipo === '' ? styles.chipActive : ''}`} onClick={() => setFiltroTipo('')}>
                Todos
              </button>
              {tiposUnicos.map((tipo) => (
                <button
                  key={tipo}
                  className={`${styles.chip} ${filtroTipo === tipo ? styles.chipActive : ''}`}
                  onClick={() => setFiltroTipo(tipo)}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingGrid}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>⚠</span>
            <p className={styles.errorTitle}>Erro ao carregar quartos</p>
            <p className={styles.errorMsg}>{error}</p>
            <button className={styles.btnRetry} onClick={fetchDados}>Tentar novamente</button>
          </div>
        )}

        {/* Sem datas selecionadas → orienta o usuário */}
        {!loading && !error && !datasValidas && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📅</span>
            <p className={styles.emptyTitle}>Selecione as datas da sua estadia</p>
            <p className={styles.emptyMsg}>
              Informe o check-in e o check-out acima para ver os quartos disponíveis no período.
            </p>
          </div>
        )}

        {/* Datas válidas mas nenhum quarto livre */}
        {!loading && !error && datasValidas && quartosFiltrados.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◈</span>
            <p className={styles.emptyTitle}>Nenhum quarto disponível nessas datas</p>
            <p className={styles.emptyMsg}>Tente outro período ou ajuste o filtro de tipo.</p>
          </div>
        )}

        {!loading && !error && datasValidas && quartosFiltrados.length > 0 && (
          <div className={styles.grid}>
            {quartosFiltrados.map((quarto) => (
              <QuartoCard key={quarto.id} quarto={quarto} qtdNoites={qtdNoites} onClick={setSelectedQuarto} />
            ))}
          </div>
        )}
      </main>

      {/* Detalhe do quarto */}
      {selectedQuarto && (
        <QuartoModal
          quarto={selectedQuarto}
          datas={{ checkin, checkout }}
          onClose={() => setSelectedQuarto(null)}
          onReservar={(q) => { setSelectedQuarto(null); setReservarQuarto(q); }}
        />
      )}

      {/* Fluxo de reserva — datas já escolhidas, abre direto no pagamento */}
      {reservarQuarto && (
        <ReservaModal
          quarto={reservarQuarto}
          datasIniciais={{ checkin, checkout }}
          onClose={() => setReservarQuarto(null)}
          onReservaCriada={fetchDados}
        />
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>HOTEL LUXE</span>
        </div>
        <p className={styles.footerCopy}>© 2026 Hotel Luxe. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
