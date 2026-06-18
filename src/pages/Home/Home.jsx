import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quartoApi } from '../../services/api';
import ReservaModal from './ReservaModal';
import styles from './Home.module.css';

const STATUS_MAP = { 1: 'Disponível', 2: 'Ocupado', 3: 'Manutenção' };
const TIPO_ICONS = {
  'Luxo': '♛',
  'Standard': '◈',
  'Suite': '◆',
  'Executive': '✦',
};

function QuartoCard({ quarto, onClick }) {
  const statusLabel = STATUS_MAP[quarto.status] || 'Disponível';
  const isAvailable = quarto.status === 1;
  const tipoNome = quarto.tipoQuarto?.descricao || 'Quarto';
  const icon = Object.entries(TIPO_ICONS).find(([k]) => tipoNome.includes(k))?.[1] || '◈';

  const placeholder = `https://images.unsplash.com/photo-${
    ['1631049307264', '1618773928121', '1582719478250', '1544161515-4ab6ce6db874'][quarto.id % 4]
  }?w=600&q=75`;

  return (
    <div className={`${styles.card} ${!isAvailable ? styles.cardUnavailable : ''}`} onClick={() => isAvailable && onClick(quarto)}>
      <div className={styles.cardImg}>
        <img src={placeholder} alt={tipoNome} className={styles.cardPhoto} loading="lazy" />
        <div className={styles.cardImgOverlay} />
        <div className={`${styles.statusBadge} ${isAvailable ? styles.statusAvail : styles.statusBusy}`}>
          {statusLabel}
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

        {isAvailable ? (
          <button className={styles.btnReservar}>
            Ver Oferta →
          </button>
        ) : (
          <div className={styles.indisponivel}>Quarto indisponível</div>
        )}
      </div>
    </div>
  );
}

function QuartoModal({ quarto, onClose, onReservar }) {
  if (!quarto) return null;
  const tipoNome = quarto.tipoQuarto?.descricao || 'Quarto';
  const placeholder = `https://images.unsplash.com/photo-${
    ['1631049307264', '1618773928121', '1582719478250', '1544161515-4ab6ce6db874'][quarto.id % 4]
  }?w=900&q=80`;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>
        <div className={styles.modalImg}>
          <img src={placeholder} alt={tipoNome} />
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
            <div className={styles.resumoRow}>
              <span>1 quarto × 2 diárias</span>
              <span>R$ {(quarto.preco * 2)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={styles.resumoRow}>
              <span>Taxas e impostos</span>
              <span>R$ {(quarto.preco * 0.25)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={`${styles.resumoRow} ${styles.resumoTotal}`}>
              <span>Total</span>
              <span>R$ {(quarto.preco * 2.25)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [selectedQuarto, setSelectedQuarto] = useState(null);
  const [reservarQuarto, setReservarQuarto] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchQuartos = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      const { data } = await quartoApi.get('/api/quartos', { params });
      setQuartos(data);
    } catch (err) {
      setError('Não foi possível carregar os quartos. Verifique se o servidor está ativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuartos();
  }, [filtroStatus]);

  const quartosFiltrados = filtroTipo
    ? quartos.filter(q => q.tipoQuarto?.descricao?.toLowerCase().includes(filtroTipo.toLowerCase()))
    : quartos;

  const tiposUnicos = [...new Set(quartos.map(q => q.tipoQuarto?.descricao).filter(Boolean))];

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
          <button className={styles.navLink}>Serviços</button>
          <button className={styles.navLink}>Contato</button>
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
            Nossos <em>Quartos</em>
          </h1>
          <p className={styles.heroSub}>
            {quartos.length > 0 ? `${quartos.filter(q => q.status === 1).length} quartos disponíveis agora` : 'Carregando disponibilidade...'}
          </p>
        </div>
        <div className={styles.heroOrb} />
      </div>

      {/* Filtros */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Disponibilidade</span>
          <div className={styles.filterChips}>
            {[
              { v: '', l: 'Todos' },
              { v: '1', l: 'Disponível' },
              { v: '2', l: 'Ocupado' },
              { v: '3', l: 'Manutenção' },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.chip} ${filtroStatus === v ? styles.chipActive : ''}`}
                onClick={() => setFiltroStatus(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {tiposUnicos.length > 0 && (
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
        )}

        <button className={styles.refreshBtn} onClick={fetchQuartos} title="Atualizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

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
            <button className={styles.btnRetry} onClick={fetchQuartos}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && quartosFiltrados.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◈</span>
            <p className={styles.emptyTitle}>Nenhum quarto encontrado</p>
            <p className={styles.emptyMsg}>Tente ajustar os filtros ou volte mais tarde.</p>
          </div>
        )}

        {!loading && !error && quartosFiltrados.length > 0 && (
          <div className={styles.grid}>
            {quartosFiltrados.map((quarto) => (
              <QuartoCard key={quarto.id} quarto={quarto} onClick={setSelectedQuarto} />
            ))}
          </div>
        )}
      </main>

      {/* Detalhe do quarto */}
      {selectedQuarto && (
        <QuartoModal
          quarto={selectedQuarto}
          onClose={() => setSelectedQuarto(null)}
          onReservar={(q) => { setSelectedQuarto(null); setReservarQuarto(q); }}
        />
      )}

      {/* Fluxo de reserva */}
      {reservarQuarto && (
        <ReservaModal
          quarto={reservarQuarto}
          onClose={() => setReservarQuarto(null)}
          onReservaCriada={fetchQuartos}
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
