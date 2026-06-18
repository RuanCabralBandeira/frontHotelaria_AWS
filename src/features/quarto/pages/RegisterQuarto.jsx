import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  criarQuarto,
  atualizarQuarto,
  buscarQuarto,
  listarTiposQuarto,
  criarFotoQuarto,
  excluirFoto,
} from '../services/QuartoService';
import styles from './RegisterQuarto.module.css';

const STATUS_OPTIONS = [
  { v: 1, l: 'Disponível' },
  { v: 2, l: 'Ocupado' },
  { v: 3, l: 'Manutenção' },
];

// Redimensiona e comprime a imagem para JPEG 70%, max 800px largura
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl.split(',')[1]); // só a parte base64
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function fotoSrc(foto) {
  if (!foto?.foto_bin) return null;
  if (foto.foto_bin.startsWith('data:')) return foto.foto_bin;
  return `data:image/${foto.foto_extensao || 'jpeg'};base64,${foto.foto_bin}`;
}

export default function RegisterQuarto() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout } = useAuth();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);

  // form
  const [form, setForm] = useState({ numero: '', preco: '', status: 1, tipoQuartoId: '' });
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // fotos
  const [fotos, setFotos] = useState([]);
  const [savedId, setSavedId] = useState(isEdit ? id : null);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingFoto, setDeletingFoto] = useState(null);
  const [fotoError, setFotoError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const tiposData = await listarTiposQuarto();
        setTipos(Array.isArray(tiposData) ? tiposData : []);
      } catch { /* tipos opcional */ }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        const q = await buscarQuarto(id);
        setForm({
          numero: q.numero ?? '',
          preco: q.preco ?? '',
          status: q.status ?? 1,
          tipoQuartoId: q.tipoQuartoId ?? q.tipoQuarto?.id ?? '',
        });
        setFotos(Array.isArray(q.fotos) ? q.fotos : []);
      } catch {
        setError('Não foi possível carregar o quarto para edição.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError(''); setSuccess('');
  };

  const validate = () => {
    if (form.preco === '' || Number(form.preco) <= 0) return 'Informe um preço válido.';
    if (!form.tipoQuartoId) return 'Selecione o tipo do quarto.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true); setError('');
    const payload = {
      numero: form.numero || null,
      preco: Number(form.preco),
      status: Number(form.status),
      tipoQuartoId: Number(form.tipoQuartoId),
    };
    try {
      if (isEdit) {
        await atualizarQuarto(id, payload);
        setSuccess('Quarto atualizado com sucesso!');
      } else {
        const novo = await criarQuarto(payload);
        setSavedId(novo.id ?? novo.quarto?.id);
        setSuccess('Quarto criado! Adicione fotos abaixo ou clique em Concluir.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.erro || 'Erro ao salvar o quarto.');
    } finally {
      setSaving(false);
    }
  };

  // seleciona arquivo e gera preview
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setFotoError('');
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!fotoFile || !savedId) return;
    setUploading(true); setFotoError('');
    try {
      const base64 = await compressImage(fotoFile);
      const ext  = fotoFile.name.split('.').pop().toLowerCase().slice(0, 45);
      const nome = fotoFile.name.replace(/\.[^.]+$/, '').slice(0, 45);
      const nova = await criarFotoQuarto(savedId, {
        foto_bin: base64,
        foto_nome: nome,
        foto_extensao: ext,
        foto_status: 1,
      });
      setFotos((f) => [...f, nova]);
      setFotoFile(null);
      setFotoPreview('');
    } catch {
      setFotoError('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFoto = async (fotoId) => {
    setDeletingFoto(fotoId); setFotoError('');
    try {
      await excluirFoto(fotoId);
      setFotos((f) => f.filter((foto) => foto.foto_id !== fotoId));
    } catch {
      setFotoError('Erro ao excluir a foto.');
    } finally {
      setDeletingFoto(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const fotosSection = savedId !== null;

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
        <button className={styles.back} onClick={() => navigate('/admin/quartos')}>← Voltar</button>
        <div className={styles.header}>
          <p className={styles.eyebrow}>{isEdit ? 'Editar quarto' : 'Novo quarto'}</p>
          <h1 className={styles.title}>{isEdit ? 'Atualizar acomodação' : 'Cadastrar acomodação'}</h1>
        </div>

        {loading ? (
          <div className={styles.loadingCard}>Carregando dados do quarto…</div>
        ) : (
          <>
            {/* — Formulário principal — */}
            <form onSubmit={handleSubmit} className={styles.card}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Número do quarto</label>
                  <input className={styles.input} name="numero" value={form.numero} onChange={handleChange} placeholder="Ex: 101" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Preço / noite <span className={styles.required}>*</span></label>
                  <div className={styles.precoWrap}>
                    <span className={styles.precoPrefix}>R$</span>
                    <input className={styles.input} name="preco" type="number" min="0" step="0.01" value={form.preco} onChange={handleChange} placeholder="0,00" />
                  </div>
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Tipo de quarto <span className={styles.required}>*</span></label>
                  {tipos.length > 0 ? (
                    <select className={styles.input} name="tipoQuartoId" value={form.tipoQuartoId} onChange={handleChange}>
                      <option value="">Selecione…</option>
                      {tipos.map((t) => (<option key={t.id} value={t.id}>{t.descricao}</option>))}
                    </select>
                  ) : (
                    <>
                      <input className={styles.input} name="tipoQuartoId" type="number" value={form.tipoQuartoId} onChange={handleChange} placeholder="ID do tipo de quarto" />
                      <span className={styles.hint}>Nenhum tipo carregado — informe o ID manualmente.</span>
                    </>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <div className={styles.statusChips}>
                    {STATUS_OPTIONS.map(({ v, l }) => (
                      <button type="button" key={v}
                        className={`${styles.chip} ${Number(form.status) === v ? styles.chipActive : ''}`}
                        onClick={() => setForm((f) => ({ ...f, status: v }))}
                      >{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {error   && <div className={styles.errorMsg}>⚠ {error}</div>}
              {success && <div className={styles.successMsg}>✓ {success}</div>}

              <div className={styles.actions}>
                {isEdit || !savedId ? (
                  <button type="button" className={styles.btnGhost} onClick={() => navigate('/admin/quartos')}>Cancelar</button>
                ) : (
                  <button type="button" className={styles.btnGhost} onClick={() => navigate('/admin/quartos')}>Concluir</button>
                )}
                <button type="submit" className={styles.btnPrimary} disabled={saving || (isEdit && false)}>
                  {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : savedId ? 'Atualizar dados' : 'Cadastrar quarto'}
                </button>
              </div>
            </form>

            {/* — Seção de fotos — */}
            {fotosSection && (
              <div className={styles.fotosCard}>
                <div className={styles.fotosHeader}>
                  <p className={styles.fotosTitle}>Fotos do quarto</p>
                  <span className={styles.fotosCount}>{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</span>
                </div>

                {fotoError && <div className={styles.errorMsg}>⚠ {fotoError}</div>}

                {/* Grid de fotos existentes */}
                {fotos.length > 0 && (
                  <div className={styles.fotoGrid}>
                    {fotos.map((foto) => (
                      <div key={foto.foto_id} className={styles.fotoItem}>
                        <img src={fotoSrc(foto)} alt={foto.foto_nome} className={styles.fotoImg} />
                        <div className={styles.fotoOverlay}>
                          <span className={styles.fotoNome}>{foto.foto_nome}.{foto.foto_extensao}</span>
                          <button
                            className={styles.fotoDeleteBtn}
                            onClick={() => handleDeleteFoto(foto.foto_id)}
                            disabled={deletingFoto === foto.foto_id}
                          >
                            {deletingFoto === foto.foto_id ? '…' : '✕'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload de nova foto */}
                <div className={styles.uploadArea}>
                  {fotoPreview ? (
                    <div className={styles.uploadPreview}>
                      <img src={fotoPreview} alt="preview" className={styles.previewImg} />
                      <div className={styles.uploadPreviewActions}>
                        <span className={styles.uploadFileName}>{fotoFile?.name}</span>
                        <div className={styles.uploadBtns}>
                          <button type="button" className={styles.btnGhost} onClick={() => { setFotoFile(null); setFotoPreview(''); }}>
                            Cancelar
                          </button>
                          <button type="button" className={styles.btnPrimary} onClick={handleUpload} disabled={uploading}>
                            {uploading ? 'Enviando…' : 'Confirmar upload'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.uploadTrigger}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className={styles.uploadIcon}>↑</span>
                      <span>Clique para selecionar uma foto</span>
                      <span className={styles.uploadHint}>JPEG, PNG, WEBP · comprimido para 800px</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            )}

            {/* Aviso quando quarto ainda não foi salvo */}
            {!fotosSection && (
              <div className={styles.fotosLockedCard}>
                <span className={styles.fotosLockedIcon}>◈</span>
                <p>Salve o quarto primeiro para poder adicionar fotos.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
