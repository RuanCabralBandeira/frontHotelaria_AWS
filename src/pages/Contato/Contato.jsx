import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Contato.module.css';

export default function Contato() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', mensagem: '' });
  const [enviado, setEnviado] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setEnviado(true);
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
          <button className={styles.navLink} onClick={() => navigate('/servicos')}>Serviços</button>
          <button className={`${styles.navLink} ${styles.navLinkActive}`}>Contato</button>
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
        <p className={styles.eyebrow}>FALE CONOSCO</p>
        <h1 className={styles.title}>Estamos aqui<br />para você</h1>
        <p className={styles.subtitle}>Nossa equipe está disponível 24 horas por dia para atender todas as suas necessidades.</p>
      </header>

      <section className={styles.content}>
        <div className={styles.infoCol}>
          <div className={styles.infoBlock}>
            <span className={styles.infoIcon}>◆</span>
            <div>
              <h3 className={styles.infoLabel}>Endereço</h3>
              <p className={styles.infoText}>Av. Atlântica, 1702 — Copacabana<br />Rio de Janeiro — RJ, 22021-001</p>
            </div>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoIcon}>◈</span>
            <div>
              <h3 className={styles.infoLabel}>Telefone</h3>
              <p className={styles.infoText}>(21) 3040-7200<br />WhatsApp: (21) 99988-7200</p>
            </div>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoIcon}>✦</span>
            <div>
              <h3 className={styles.infoLabel}>E-mail</h3>
              <p className={styles.infoText}>reservas@hotelluxe.com.br<br />contato@hotelluxe.com.br</p>
            </div>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoIcon}>♛</span>
            <div>
              <h3 className={styles.infoLabel}>Horário de atendimento</h3>
              <p className={styles.infoText}>Recepção: 24h / 7 dias<br />Reservas: seg–sex 08h–20h</p>
            </div>
          </div>

          {!enviado ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <h3 className={styles.formTitle}>Envie uma mensagem</h3>
              <input
                className={styles.input}
                type="text"
                placeholder="Seu nome"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                required
              />
              <input
                className={styles.input}
                type="email"
                placeholder="Seu e-mail"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              <textarea
                className={styles.textarea}
                placeholder="Sua mensagem..."
                rows={4}
                value={form.mensagem}
                onChange={e => setForm({ ...form, mensagem: e.target.value })}
                required
              />
              <button type="submit" className={styles.btnSubmit}>Enviar mensagem</button>
            </form>
          ) : (
            <div className={styles.sucessoCard}>
              <span className={styles.sucessoIcon}>✦</span>
              <p>Mensagem enviada! Retornaremos em até 24 horas.</p>
            </div>
          )}
        </div>

        <div className={styles.mapCol}>
          <div className={styles.mapWrapper}>
            <iframe
              title="Localização Hotel Luxe"
              src="https://maps.google.com/maps?q=Av.+Atl%C3%A2ntica+1702+Copacabana+Rio+de+Janeiro+RJ+Brasil&output=embed&z=16"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className={styles.mapLabel}>
            <span className={styles.mapPin}>◆</span>
            Hotel Luxe — Av. Atlântica, 1702, Copacabana, Rio de Janeiro
          </div>
        </div>
      </section>
    </div>
  );
}
