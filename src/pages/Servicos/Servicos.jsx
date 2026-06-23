import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Servicos.module.css';

const SERVICOS = [
  {
    icon: '◈',
    titulo: 'Spa & Bem-Estar',
    descricao: 'Massagens terapêuticas, aromaterapia e tratamentos faciais com produtos premium. Reserve sua sessão com antecedência.',
  },
  {
    icon: '✦',
    titulo: 'Restaurante Gourmet',
    descricao: 'Culinária internacional assinada pelo Chef Rafael Monteiro. Café da manhã incluso, almoço e jantar à la carte.',
  },
  {
    icon: '◆',
    titulo: 'Piscina Panorâmica',
    descricao: 'Piscina aquecida no rooftop com vista para o mar. Serviço de drinks e petiscos disponível das 8h às 22h.',
  },
  {
    icon: '♛',
    titulo: 'Academia 24h',
    descricao: 'Equipamentos de última geração com personal trainer disponível mediante agendamento prévio.',
  },
  {
    icon: '◈',
    titulo: 'Room Service',
    descricao: 'Cardápio completo disponível 24 horas por dia, 7 dias por semana. Tempo médio de entrega de 25 minutos.',
  },
  {
    icon: '✦',
    titulo: 'Concierge',
    descricao: 'Equipe especializada para reservas em restaurantes, passeios turísticos, ingressos e transporte personalizado.',
  },
  {
    icon: '◆',
    titulo: 'Transfer Aeroporto',
    descricao: 'Serviço de transfer executivo entre o hotel e os aeroportos do Galeão e Santos Dumont. Agendamento antecipado.',
  },
  {
    icon: '♛',
    titulo: 'Bar Lounge',
    descricao: 'Bar climatizado com carta de vinhos selecionados, coquetéis exclusivos e petiscos de alto padrão. Aberto até às 2h.',
  },
];

export default function Servicos() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>HOTEL LUXE</span>
        </div>

        <div className={styles.navCenter}>
          <button className={styles.navLink} onClick={() => navigate('/home')}>Quartos</button>
          <button className={styles.navLink} onClick={() => navigate('/reservas')}>Reservas</button>
          <button className={`${styles.navLink} ${styles.navLinkActive}`}>Serviços</button>
          <button className={styles.navLink} onClick={() => navigate('/contato')}>Contato</button>
        </div>

        <div className={styles.navRight}>
          {user ? (
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
          ) : (
            <div className={styles.navActions}>
              <button className={styles.btnGhost} onClick={() => navigate('/login')}>Entrar</button>
              <button className={styles.btnPrimary} onClick={() => navigate('/cadastro')}>Cadastrar</button>
            </div>
          )}
        </div>
      </nav>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>O QUE OFERECEMOS</p>
        <h1 className={styles.title}>Serviços exclusivos<br />para sua estadia</h1>
        <p className={styles.subtitle}>Cada detalhe pensado para proporcionar uma experiência inesquecível.</p>
      </header>

      <section className={styles.grid}>
        {SERVICOS.map((s, i) => (
          <div key={i} className={styles.card} style={{ animationDelay: `${i * 0.07}s` }}>
            <span className={styles.cardIcon}>{s.icon}</span>
            <h3 className={styles.cardTitle}>{s.titulo}</h3>
            <p className={styles.cardDesc}>{s.descricao}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
