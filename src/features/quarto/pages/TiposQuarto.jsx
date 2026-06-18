import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  listarTiposQuarto,
  criarTipoQuarto,
  atualizarTipoQuarto,
  excluirTipoQuarto,
} from '../services/QuartoService';
import styles from './TiposQuarto.module.css';

export default function TiposQuarto() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Novo tipo
  const [novoDesc, setNovoDesc] = useState('');
  const [criando, setCriando] = useState(false);
  const [erroNovo, setErroNovo] = useState('');

  // Edição inline
  const [editId, setEditId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Exclusão
  const [confirm, setConfirm] = useState(null);
  const [deletando, setDeletando] = useState(null);

  const fetch = async () => {
    setLoading(true); setError('');
    try {
      const data = await listarTiposQuarto();
      setTipos(Array.isArray(data) ? data : []);
    } catch {
      setError('Não foi possível carregar os tipos de quarto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!novoDesc.trim()) { setErroNovo('Informe uma descrição.'); return; }
    setCriando(true); setErroNovo('');
    try {
      const novo = await criarTipoQuarto({ descricao: novoDesc.trim(), status: 1 });
      setTipos((t) => [...t, novo]);
      setNovoDesc('');
    } catch {
      setErroNovo('Erro ao criar tipo. Tente novamente.');
    } finally {
      setCriando(false);
    }
  };

  const startEdit = (tipo) => {
    setEditId(tipo.id);
    setEditDesc(tipo.descricao);
    setConfirm(null);
  };

  const handleSalvar = async (id) => {
    if (!editDesc.trim()) return;
    setSalvando(true);
    try {
      const atualizado = await atualizarTipoQuarto(id, { descricao: editDesc.trim() });
      setTipos((t) => t.map((tp) => (tp.id === id ? { ...tp, descricao: atualizado.descricao ?? editDesc.trim() } : tp)));
      setEditId(null);
    } catch {
      setError('Erro ao salvar alterações.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id) => {
    setDeletando(id);
    try {
      await excluirTipoQuarto(id);
      setTipos((t) => t.filter((tp) => tp.id !== id));
      setConfirm(null);
    } catch {
      setError('Erro ao excluir o tipo. Verifique se não há quartos vinculados a ele.');
    } finally {
      setDeletando(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

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
          <button className={`${styles.navLink} ${styles.navLinkActive}`} onClick={() => navigate('/admin/tipos-quarto')}>Tipos de quarto</button>
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
            <h1 className={styles.title}>Tipos de Quarto</h1>
          </div>
        </div>

        {/* Formulário de criação */}
        <div className={styles.createCard}>
          <p className={styles.createTitle}>Novo tipo</p>
          <form onSubmit={handleCriar} className={styles.createForm}>
            <input
              className={styles.input}
              placeholder="Ex: Suite Presidencial"
              value={novoDesc}
              onChange={(e) => { setNovoDesc(e.target.value); setErroNovo(''); }}
              maxLength={45}
            />
            <button type="submit" className={styles.btnPrimary} disabled={criando}>
              {criando ? 'Criando…' : '+ Criar'}
            </button>
          </form>
          {erroNovo && <p className={styles.erroNovo}>{erroNovo}</p>}
        </div>

        {loading && (
          <div className={styles.skeletonList}>
            {[...Array(3)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button className={styles.btnGhost} onClick={fetch}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && tipos.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◈</span>
            <p className={styles.emptyTitle}>Nenhum tipo cadastrado</p>
            <p className={styles.emptyMsg}>Use o formulário acima para criar o primeiro tipo de quarto.</p>
          </div>
        )}

        {!loading && !error && tipos.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descrição</th>
                  <th className={styles.right}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td className={styles.tdId}>#{t.id}</td>
                    <td>
                      {editId === t.id ? (
                        <input
                          className={styles.inputInline}
                          value={editDesc}
                          maxLength={45}
                          onChange={(e) => setEditDesc(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSalvar(t.id); if (e.key === 'Escape') setEditId(null); }}
                          autoFocus
                        />
                      ) : (
                        <span className={styles.descricao}>{t.descricao}</span>
                      )}
                    </td>
                    <td className={styles.right}>
                      {editId === t.id ? (
                        <span className={styles.actionsCell}>
                          <button className={styles.btnMini} onClick={() => setEditId(null)}>Cancelar</button>
                          <button className={styles.btnPrimaryMini} disabled={salvando} onClick={() => handleSalvar(t.id)}>
                            {salvando ? '…' : 'Salvar'}
                          </button>
                        </span>
                      ) : confirm === t.id ? (
                        <span className={styles.actionsCell}>
                          <span className={styles.confirmTxt}>Excluir?</span>
                          <button className={styles.btnDanger} disabled={deletando === t.id} onClick={() => handleExcluir(t.id)}>
                            {deletando === t.id ? '…' : 'Sim'}
                          </button>
                          <button className={styles.btnMini} onClick={() => setConfirm(null)}>Não</button>
                        </span>
                      ) : (
                        <span className={styles.actionsCell}>
                          <button className={styles.btnMini} onClick={() => startEdit(t)}>Editar</button>
                          <button className={styles.btnMiniDanger} onClick={() => setConfirm(t.id)}>Excluir</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
