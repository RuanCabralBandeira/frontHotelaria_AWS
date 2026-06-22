import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { criarReserva, buscarReserva } from '../../services/reservaService';
import { criarPagamento, criarCartao, criarBoleto, criarDeposito, criarTipoPagamento, processarPagamento } from '../../services/pagamentoService';
import styles from './ReservaModal.module.css';

const hoje = () => new Date().toISOString().split('T')[0];

const noites = (checkin, checkout) => {
  if (!checkin || !checkout) return 0;
  const diff = new Date(checkout) - new Date(checkin);
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

// Step 1 — escolha de datas
function StepDatas({ quarto, onConfirmar }) {
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [erro, setErro] = useState('');

  const qtdNoites = noites(checkin, checkout);
  const subtotal = quarto.preco * qtdNoites;
  const taxas = subtotal * 0.1;
  const total = subtotal + taxas;

  const confirmar = () => {
    if (!checkin || !checkout) return setErro('Escolha as datas de entrada e saída.');
    if (qtdNoites < 1) return setErro('A saída deve ser após a entrada.');
    setErro('');
    onConfirmar({ checkin, checkout, qtdNoites, total });
  };

  return (
    <div className={styles.stepBody}>
      <h3 className={styles.stepTitle}>Escolha as datas</h3>
      <div className={styles.dateGrid}>
        <div className={styles.dateField}>
          <label className={styles.dateLabel}>Check-in</label>
          <input type="date" className={styles.dateInput} min={hoje()} value={checkin}
            onChange={e => { setCheckin(e.target.value); setErro(''); }} />
        </div>
        <div className={styles.dateField}>
          <label className={styles.dateLabel}>Check-out</label>
          <input type="date" className={styles.dateInput} min={checkin || hoje()} value={checkout}
            onChange={e => { setCheckout(e.target.value); setErro(''); }} />
        </div>
      </div>

      {qtdNoites > 0 && (
        <div className={styles.resumo}>
          <div className={styles.resumoRow}><span>R$ {quarto.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × {qtdNoites} noite{qtdNoites > 1 ? 's' : ''}</span><span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          <div className={styles.resumoRow}><span>Taxas e impostos (10%)</span><span>R$ {taxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          <div className={`${styles.resumoRow} ${styles.resumoTotal}`}><span>Total</span><span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>
      )}

      {erro && <p className={styles.erro}>{erro}</p>}
      <button className={styles.btnAvancar} onClick={confirmar} disabled={qtdNoites < 1}>
        Continuar para pagamento →
      </button>
    </div>
  );
}

// Step 2 — pagamento
function StepPagamento({ quarto, datas, onPagar, processando }) {
  const [tipo, setTipo] = useState('cartao');
  const [cartao, setCartao] = useState({ numero: '', validade: '', cvv: '', banco: '', nome: '' });
  const [boleto] = useState({});
  const [deposito, setDeposito] = useState({ banco: '', agencia: '', conta: '' });
  const [erro, setErro] = useState('');

  const pagar = () => {
    if (tipo === 'cartao') {
      if (!cartao.numero || !cartao.validade || !cartao.cvv || !cartao.banco || !cartao.nome)
        return setErro('Preencha todos os dados do cartão.');
      // A aprovação/recusa é decidida pelo "gateway" no backend — aqui só exigimos os campos.
    }
    if (tipo === 'deposito') {
      if (!deposito.banco || !deposito.agencia || !deposito.conta)
        return setErro('Preencha todos os dados do depósito.');
    }
    setErro('');
    onPagar({ tipo, cartao, boleto, deposito });
  };

  return (
    <div className={styles.stepBody}>
      <h3 className={styles.stepTitle}>Pagamento</h3>
      <p className={styles.stepSub}>Total: <strong>R$ {datas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> · {datas.qtdNoites} noite{datas.qtdNoites > 1 ? 's' : ''}</p>

      <div className={styles.tipoTabs}>
        {[['cartao', '💳 Cartão'], ['boleto', '🧾 Boleto'], ['deposito', '🏦 Depósito']].map(([v, l]) => (
          <button key={v} className={`${styles.tipoTab} ${tipo === v ? styles.tipoTabActive : ''}`} onClick={() => { setTipo(v); setErro(''); }}>{l}</button>
        ))}
      </div>

      {tipo === 'cartao' && (
        <div className={styles.formGrid}>
          <div className={styles.formField} style={{ gridColumn: '1/-1' }}>
            <label>Número do cartão</label>
            <input maxLength={19} placeholder="0000 0000 0000 0000" value={cartao.numero} onChange={e => setCartao({ ...cartao, numero: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div className={styles.formField}>
            <label>Nome no cartão</label>
            <input placeholder="NOME COMPLETO" value={cartao.nome} onChange={e => setCartao({ ...cartao, nome: e.target.value.toUpperCase() })} />
          </div>
          <div className={styles.formField}>
            <label>Banco</label>
            <input placeholder="Ex: Nubank" value={cartao.banco} onChange={e => setCartao({ ...cartao, banco: e.target.value })} />
          </div>
          <div className={styles.formField}>
            <label>Validade</label>
            <input type="month" value={cartao.validade} onChange={e => setCartao({ ...cartao, validade: e.target.value })} />
          </div>
          <div className={styles.formField}>
            <label>CVV</label>
            <input maxLength={4} placeholder="123" value={cartao.cvv} onChange={e => setCartao({ ...cartao, cvv: e.target.value.replace(/\D/g, '') })} />
          </div>
        </div>
      )}

      {tipo === 'boleto' && (
        <div className={styles.boletoInfo}>
          <p>Um boleto bancário será gerado após a confirmação.</p>
          <p>Validade: 3 dias úteis.</p>
        </div>
      )}

      {tipo === 'deposito' && (
        <div className={styles.formGrid}>
          <div className={styles.formField} style={{ gridColumn: '1/-1' }}>
            <label>Banco</label>
            <input placeholder="Ex: Banco do Brasil" value={deposito.banco} onChange={e => setDeposito({ ...deposito, banco: e.target.value })} />
          </div>
          <div className={styles.formField}>
            <label>Agência</label>
            <input placeholder="0001" value={deposito.agencia} onChange={e => setDeposito({ ...deposito, agencia: e.target.value })} />
          </div>
          <div className={styles.formField}>
            <label>Conta</label>
            <input placeholder="12345-6" value={deposito.conta} onChange={e => setDeposito({ ...deposito, conta: e.target.value })} />
          </div>
        </div>
      )}

      {erro && <p className={styles.erro}>{erro}</p>}
      <button className={styles.btnAvancar} onClick={pagar} disabled={processando}>
        {processando ? <span className={styles.spinner} /> : 'Confirmar Reserva →'}
      </button>
    </div>
  );
}

// Step 3 — confirmando (polling do status real da reserva, atualizado via RabbitMQ)
function StepConfirmando({ reservaId, metodo, onConfirmado, onRecusado }) {
  const tentativas = useRef(0);

  useEffect(() => {
    const id = setInterval(async () => {
      tentativas.current += 1;
      try {
        const reserva = await buscarReserva(reservaId);
        if (reserva.reserva_status === 2) { // Confirmada
          clearInterval(id);
          onConfirmado(reserva);
          return;
        }
        if (reserva.reserva_status === 3) { // Cancelada (pagamento recusado)
          clearInterval(id);
          onRecusado(reserva);
          return;
        }
      } catch (_) {}
      if (tentativas.current >= 20) { // ~40s sem definição
        clearInterval(id);
        onRecusado({ reserva_id: reservaId, timeout: true });
      }
    }, 2000);
    return () => clearInterval(id);
  }, [reservaId]);

  return (
    <div className={styles.stepBody} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
      <div className={styles.spinnerGrande} />
      <h3 className={styles.stepTitle} style={{ marginTop: '1.5rem' }}>Processando pagamento...</h3>
      <p className={styles.stepSub}>
        {metodo === 'boleto'
          ? 'Aguardando a compensação do boleto. Isso pode levar alguns segundos.'
          : 'Confirmando o pagamento com a operadora. Isso pode levar alguns segundos.'}
      </p>
    </div>
  );
}

// Step recusado — pagamento não aprovado ou ainda em processamento
function StepRecusado({ motivo, timeout, onFechar }) {
  return (
    <div className={styles.stepBody} style={{ textAlign: 'center' }}>
      <div className={styles.xIcon}>{timeout ? '⏳' : '✕'}</div>
      <h3 className={styles.stepTitle}>{timeout ? 'Ainda processando' : 'Pagamento recusado'}</h3>
      <p className={styles.stepSub}>
        {timeout
          ? 'O pagamento ainda está sendo processado. Acompanhe o status em "Minhas reservas".'
          : (motivo || 'Seu pagamento não foi aprovado. Tente outro método ou revise os dados.')}
      </p>
      <button className={styles.btnAvancar} onClick={onFechar} style={{ marginTop: '1.5rem' }}>
        Fechar
      </button>
    </div>
  );
}

// Step 4 — concluído
function StepConcluido({ reserva, quarto, datas, onFechar }) {
  return (
    <div className={styles.stepBody} style={{ textAlign: 'center' }}>
      <div className={styles.checkIcon}>✓</div>
      <h3 className={styles.stepTitle}>Reserva Confirmada!</h3>
      <p className={styles.stepSub}>Seu quarto está reservado. Até breve!</p>
      <div className={styles.resumo} style={{ textAlign: 'left', marginTop: '1.5rem' }}>
        <div className={styles.resumoRow}><span>Quarto</span><span>{quarto.tipoQuarto?.descricao} {quarto.numero ? `Nº ${quarto.numero}` : ''}</span></div>
        <div className={styles.resumoRow}><span>Check-in</span><span>{new Date(datas.checkin).toLocaleDateString('pt-BR')}</span></div>
        <div className={styles.resumoRow}><span>Check-out</span><span>{new Date(datas.checkout).toLocaleDateString('pt-BR')}</span></div>
        <div className={`${styles.resumoRow} ${styles.resumoTotal}`}><span>Total pago</span><span>R$ {datas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        {reserva?.reserva_id && <div className={styles.resumoRow}><span>Nº da reserva</span><span>#{reserva.reserva_id}</span></div>}
      </div>
      <button className={styles.btnAvancar} onClick={onFechar} style={{ marginTop: '1.5rem' }}>
        Fechar
      </button>
    </div>
  );
}

export default function ReservaModal({ quarto, datasIniciais, onClose, onReservaCriada }) {
  const { user } = useAuth();

  // Quando as datas já vêm escolhidas (fluxo data → quarto), pula a etapa de datas.
  const calcDatas = (ci, co) => {
    const q = noites(ci, co);
    const subtotal = (quarto?.preco || 0) * q;
    const taxas = subtotal * 0.1;
    return { checkin: ci, checkout: co, qtdNoites: q, total: subtotal + taxas };
  };
  const temDatasIniciais = Boolean(
    datasIniciais?.checkin && datasIniciais?.checkout && noites(datasIniciais.checkin, datasIniciais.checkout) >= 1
  );

  const [step, setStep] = useState(temDatasIniciais ? 'pagamento' : 'datas');
  const [datas, setDatas] = useState(temDatasIniciais ? calcDatas(datasIniciais.checkin, datasIniciais.checkout) : null);
  const [reservaId, setReservaId] = useState(null);
  const [reservaFinal, setReservaFinal] = useState(null);
  const [metodo, setMetodo] = useState('cartao');
  const [recusa, setRecusa] = useState({ motivo: '', timeout: false });
  const [processando, setProcessando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');

  if (!quarto) return null;

  const handleDatas = (datasEscolhidas) => {
    setDatas(datasEscolhidas);
    setStep('pagamento');
  };

  const handlePagamento = async ({ tipo, cartao, deposito }) => {
    setProcessando(true);
    setErroGeral('');
    setMetodo(tipo);
    try {
      // 1. Cria a reserva (status 1 = Pendente — só confirma quando o pagamento for aprovado)
      const reservaPayload = {
        reserva_checkin: new Date(datas.checkin).toISOString(),
        reserva_checkout: new Date(datas.checkout).toISOString(),
        reserva_status: 1,
        tipo_quarto_id: quarto.tipoQuarto?.id,
        quarto_id: quarto.id,
        pagamento_status: 0,
        ...(user?.clienteId ? { cliente_id: user.clienteId } : {}),
      };
      const reserva = await criarReserva(reservaPayload);
      const rId = reserva.reserva_id ?? reserva.id;
      setReservaId(rId);

      // 2. Cria o pagamento (status 1 = pendente de processamento)
      const pagamento = await criarPagamento({
        pagamento_tipo: tipo,
        pagamento_status: 1,
        pagamento_data: new Date().toISOString(),
        pagamento_endereco: 'Hotel Luxe',
      });
      const pagId = pagamento.pagamento_id ?? pagamento.id;

      // 3. Cria o instrumento (cartão, boleto ou depósito)
      let instrumentoId = null;
      if (tipo === 'cartao') {
        const c = await criarCartao({
          cartao_numero: cartao.numero,
          cartao_validade: new Date(`${cartao.validade}-01`).toISOString(),
          cartao_cvv: cartao.cvv,
          cartao_banco: cartao.banco,
          cartao_nome: cartao.nome,
          cartao_status: 1,
        });
        instrumentoId = { cartao_id: c.cartao_id ?? c.id };
      } else if (tipo === 'boleto') {
        const b = await criarBoleto({
          boleto_numero: `BOLETO-${Date.now()}`,
          boleto_vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          boleto_emissao: new Date().toISOString(),
          boleto_status: 1,
        });
        instrumentoId = { boleto_id: b.boleto_id ?? b.id };
      } else {
        const d = await criarDeposito({
          deposito_banco: deposito.banco,
          deposito_valor: datas.total,
          deposito_agencia: deposito.agencia,
          deposito_conta: deposito.conta,
          deposito_status: 1,
        });
        instrumentoId = { deposito_id: d.deposito_id ?? d.id };
      }

      // 4. Liga pagamento ao instrumento
      await criarTipoPagamento({
        pagamento_id: pagId,
        reserva_id: rId,
        tipo_pagamento_status: 1,
        ...instrumentoId,
      });

      // 5. Dispara o "gateway" simulado. A confirmação NÃO é mais imediata:
      //    o backend processa, decide aprovar/recusar e avisa o MS Reserva via RabbitMQ.
      const resultado = await processarPagamento({
        pagamento_id: pagId,
        reserva_id: rId,
        metodo: tipo,
        dados: tipo === 'cartao'
          ? { numero: cartao.numero, cvv: cartao.cvv, validade: cartao.validade }
          : {},
      });
      // Guarda o motivo (caso recuse) — a tela final usa o status real vindo do polling.
      setRecusa({ motivo: resultado?.motivo || '', timeout: false });

      if (onReservaCriada) onReservaCriada();
      setStep('confirmando');
    } catch (err) {
      setErroGeral(err.response?.data?.erro || err.response?.data?.mensagem || err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmado = (reserva) => {
    setReservaFinal(reserva);
    setStep('concluido');
  };

  const handleRecusado = (reserva) => {
    setRecusa((r) => ({ motivo: r.motivo, timeout: Boolean(reserva?.timeout) }));
    setStep('recusado');
  };

  const STEPS = ['datas', 'pagamento', 'confirmando', 'concluido'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className={styles.backdrop} onClick={(step === 'concluido' || step === 'recusado') ? onClose : undefined}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.btnFechar} onClick={onClose}>✕</button>

        {step !== 'concluido' && step !== 'recusado' && (
          <div className={styles.progressBar}>
            {['Datas', 'Pagamento', 'Confirmando'].map((label, i) => (
              <div key={i} className={`${styles.progressStep} ${i <= stepIdx ? styles.progressStepActive : ''}`}>
                <div className={styles.progressDot}>{i < stepIdx ? '✓' : i + 1}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.quartoInfo}>
          <span className={styles.quartoTipo}>{quarto.tipoQuarto?.descricao}</span>
          {quarto.numero && <span className={styles.quartoNum}>Nº {quarto.numero}</span>}
          <span className={styles.quartoPreco}>R$ {quarto.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/noite</span>
        </div>

        {erroGeral && <div className={styles.erroGeral}>{erroGeral}</div>}

        {step === 'datas' && <StepDatas quarto={quarto} onConfirmar={handleDatas} />}
        {step === 'pagamento' && <StepPagamento quarto={quarto} datas={datas} onPagar={handlePagamento} processando={processando} />}
        {step === 'confirmando' && <StepConfirmando reservaId={reservaId} metodo={metodo} onConfirmado={handleConfirmado} onRecusado={handleRecusado} />}
        {step === 'concluido' && <StepConcluido reserva={reservaFinal} quarto={quarto} datas={datas} onFechar={onClose} />}
        {step === 'recusado' && <StepRecusado motivo={recusa.motivo} timeout={recusa.timeout} onFechar={onClose} />}
      </div>
    </div>
  );
}
