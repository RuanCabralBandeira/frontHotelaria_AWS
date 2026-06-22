import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usuarioApi } from '../../services/api';
import { maskCPF, maskTelefone, validarCPF, validarTelefone } from '../../utils/validators';
import styles from './Cadastro.module.css';

const STEPS = ['Acesso', 'Perfil', 'Pronto'];

export default function Cadastro() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);

  const [userForm, setUserForm] = useState({
    usuario_login: '',
    usuario_senha: '',
    confirmar_senha: '',
  });

  const [clienteForm, setClienteForm] = useState({
    cliente_nome: '',
    cliente_cpf: '',
    cliente_telefone: '',
    cliente_idade: '',
    cliente_genero: '',
  });

  const handleUserChange = (e) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
    setError('');
  };

  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'cliente_cpf') v = maskCPF(value);
    else if (name === 'cliente_telefone') v = maskTelefone(value);
    setClienteForm((f) => ({ ...f, [name]: v }));
    setError('');
  };

  const handleStepOne = async (e) => {
    e.preventDefault();
    if (!userForm.usuario_login || !userForm.usuario_senha) {
      setError('Preencha todos os campos.');
      return;
    }
    if (userForm.usuario_senha !== userForm.confirmar_senha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (userForm.usuario_senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await usuarioApi.post('/usuario/cadastrar', {
        usuario_login: userForm.usuario_login,
        usuario_senha: userForm.usuario_senha,
      });
      setUsuarioId(data.usuario_id);
      setStep(1);
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao criar conta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStepTwo = async (e) => {
    e.preventDefault();
    const { cliente_nome, cliente_cpf, cliente_telefone, cliente_idade, cliente_genero } = clienteForm;
    if (!cliente_nome || !cliente_cpf || !cliente_telefone || !cliente_idade || !cliente_genero) {
      setError('Preencha todos os campos do perfil.');
      return;
    }
    if (!validarCPF(cliente_cpf)) {
      setError('CPF inválido. Confira os números digitados.');
      return;
    }
    if (!validarTelefone(cliente_telefone)) {
      setError('Telefone inválido. Informe DDD + número.');
      return;
    }
    const idadeNum = parseInt(cliente_idade, 10);
    if (Number.isNaN(idadeNum) || idadeNum < 18 || idadeNum > 120) {
      setError('Idade deve estar entre 18 e 120 anos.');
      return;
    }
    setLoading(true);
    try {
      await usuarioApi.post('/', {
        cliente_nome,
        cliente_cpf,        // já padronizado pela máscara: 000.000.000-00
        cliente_telefone,   // já padronizado: (00) 00000-0000
        cliente_idade: idadeNum,
        cliente_genero,
        cliente_status: 'Ativo',
        usuario_id: usuarioId,
      });
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao salvar perfil.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.orb} />

      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>HOTEL LUXE</span>
        </Link>
      </nav>

      <div className={styles.container}>
        <div className={styles.card}>
          {/* Steps indicator */}
          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <div key={s} className={styles.stepItem}>
                <div className={`${styles.stepDot} ${i < step ? styles.done : ''} ${i === step ? styles.active : ''}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ''}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ''}`} />}
              </div>
            ))}
          </div>

          {/* STEP 0 — criar usuário */}
          {step === 0 && (
            <div className={styles.formSection}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Passo 1 de 2</p>
                <h1 className={styles.title}>Criar acesso</h1>
                <p className={styles.subtitle}>Defina seu login e senha para entrar no sistema</p>
              </div>
              <form onSubmit={handleStepOne} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Login / Email <span className={styles.req}>*</span></label>
                  <input
                    className={styles.input}
                    type="text"
                    name="usuario_login"
                    value={userForm.usuario_login}
                    onChange={handleUserChange}
                    placeholder="seu@email.com"
                    autoComplete="username"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Senha <span className={styles.req}>*</span></label>
                  <div className={styles.passwordWrapper}>
                    <input
                      className={styles.input}
                      type={showPass ? 'text' : 'password'}
                      name="usuario_senha"
                      value={userForm.usuario_senha}
                      onChange={handleUserChange}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                      {showPass ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Confirmar Senha <span className={styles.req}>*</span></label>
                  <input
                    className={styles.input}
                    type="password"
                    name="confirmar_senha"
                    value={userForm.confirmar_senha}
                    onChange={handleUserChange}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button type="submit" className={styles.btnSubmit} disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : 'Continuar →'}
                </button>
              </form>
              <p className={styles.footer}>
                Já tem conta? <Link to="/login" className={styles.link}>Entrar</Link>
              </p>
            </div>
          )}

          {/* STEP 1 — perfil do cliente */}
          {step === 1 && (
            <div className={styles.formSection}>
              <div className={styles.cardHeader}>
                <p className={styles.eyebrow}>Passo 2 de 2</p>
                <h1 className={styles.title}>Seu perfil</h1>
                <p className={styles.subtitle}>Dados pessoais para reservas e check-in</p>
              </div>
              <form onSubmit={handleStepTwo} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Nome completo <span className={styles.req}>*</span></label>
                  <input className={styles.input} type="text" name="cliente_nome" value={clienteForm.cliente_nome} onChange={handleClienteChange} placeholder="Seu nome completo" />
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>CPF <span className={styles.req}>*</span></label>
                    <input className={styles.input} type="text" name="cliente_cpf" value={clienteForm.cliente_cpf} onChange={handleClienteChange} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Telefone <span className={styles.req}>*</span></label>
                    <input className={styles.input} type="text" name="cliente_telefone" value={clienteForm.cliente_telefone} onChange={handleClienteChange} placeholder="(11) 99999-9999" inputMode="numeric" maxLength={15} />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Idade <span className={styles.req}>*</span></label>
                    <input className={styles.input} type="number" name="cliente_idade" value={clienteForm.cliente_idade} onChange={handleClienteChange} placeholder="Ex: 30" min="18" max="120" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Gênero <span className={styles.req}>*</span></label>
                    <select className={styles.select} name="cliente_genero" value={clienteForm.cliente_genero} onChange={handleClienteChange}>
                      <option value="">Selecionar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                      <option value="Prefiro não dizer">Prefiro não dizer</option>
                    </select>
                  </div>
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.rowBtns}>
                  <button type="button" className={styles.btnBack} onClick={() => { setStep(0); setError(''); }}>← Voltar</button>
                  <button type="submit" className={styles.btnSubmit} disabled={loading}>
                    {loading ? <span className={styles.spinner} /> : 'Finalizar cadastro'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2 — sucesso */}
          {step === 2 && (
            <div className={styles.successSection}>
              <div className={styles.successIcon}>✓</div>
              <h1 className={styles.title}>Cadastro concluído!</h1>
              <p className={styles.subtitle}>Sua conta foi criada com sucesso. Faça login para explorar nossos quartos e realizar reservas.</p>
              <button className={styles.btnSubmit} onClick={() => navigate('/login')} style={{ marginTop: 32 }}>
                Ir para o Login
              </button>
            </div>
          )}
        </div>

        <div className={styles.aside}>
          <img
            src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80"
            alt="Hotel quarto"
            className={styles.asideImg}
          />
          <div className={styles.asideOverlay}>
            <div className={styles.asideContent}>
              <p className={styles.asideLabel}>Por que se cadastrar?</p>
              {[
                'Reservas com um clique',
                'Histórico completo de estadias',
                'Ofertas exclusivas para membros',
                'Check-in antecipado digital',
              ].map((item) => (
                <div key={item} className={styles.asideBenefit}>
                  <span className={styles.benefitCheck}>◆</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
