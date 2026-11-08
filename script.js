'use strict';

// Regras da CCT 2026/2026 dos gráficos do Paraná (registro MTE PR000308/2026).
const LIMITE_FAIXA_50_MIN = 120; // Cláusula 9ª: duas primeiras horas extras do dia
const MULTIPLICADOR_50 = 1.5;
const MULTIPLICADOR_60 = 1.6;
const MULTIPLICADOR_100 = 2; // domingos e feriados pela Cláusula 10ª; sábados por opção do usuário, fora da CCT

const MAX_TURNO_MIN = 16 * 60; // acima disso, quase sempre é erro de digitação
const CHAVE_STORAGE = 'calculadora-horas-v1';
const CAMPOS_HORARIO = ['entrada', 'saidaAlmoco', 'voltaAlmoco', 'saida'];

const $ = (id) => document.getElementById(id);
const corpo = $('corpo');

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatoNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Aceita "3500", "3500.50", "3.500" e "3.500,50". Retorna null se não for um número positivo.
function paraNumero(texto) {
  const limpo = String(texto).replace(/[R$\s]/g, '');
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '');
  }
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function paraMinutos(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function formatarDuracao(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function formatarCentavos(centavos) {
  return formatoMoeda.format(centavos / 100);
}

function centavosDe(minutos, valorHora, multiplicador) {
  return Math.round((minutos / 60) * valorHora * multiplicador * 100);
}

// Devolve o status das marcações e os minutos trabalhados (sem o almoço).
// Um horário menor que o anterior é tratado como do dia seguinte (turno que vira a noite).
function medirDia(dia) {
  const horarios = CAMPOS_HORARIO.map((campo) => dia[campo]);
  if (horarios.every((h) => !h)) return { status: 'vazio', minutos: 0 };

  const almocoPelaMetade = Boolean(dia.saidaAlmoco) !== Boolean(dia.voltaAlmoco);
  if (!dia.entrada || !dia.saida || almocoPelaMetade) return { status: 'incompleto', minutos: 0 };

  const pontos = [];
  for (const horario of horarios.filter(Boolean)) {
    let minuto = paraMinutos(horario);
    const anterior = pontos[pontos.length - 1];
    if (anterior !== undefined) {
      while (minuto < anterior) minuto += 24 * 60;
    }
    pontos.push(minuto);
  }

  const turno = pontos[pontos.length - 1] - pontos[0];
  const almoco = pontos.length === 4 ? pontos[2] - pontos[1] : 0;
  const minutos = turno - almoco;
  if (minutos <= 0 || turno > MAX_TURNO_MIN) return { status: 'invalido', minutos: 0 };
  return { status: 'ok', minutos };
}

function separarHoras(minutos, jornada, especial) {
  if (especial) return { normal: 0, e50: 0, e60: 0, dobro: minutos };
  const excedente = Math.max(0, minutos - jornada);
  const e50 = Math.min(excedente, LIMITE_FAIXA_50_MIN);
  return { normal: minutos - excedente, e50, e60: excedente - e50, dobro: 0 };
}

function valorarHoras(horas, valorHora) {
  return {
    normal: centavosDe(horas.normal, valorHora, 1),
    e50: centavosDe(horas.e50, valorHora, MULTIPLICADOR_50),
    e60: centavosDe(horas.e60, valorHora, MULTIPLICADOR_60),
    dobro: centavosDe(horas.dobro, valorHora, MULTIPLICADOR_100),
  };
}

function ehFimDeSemana(data) {
  if (!data) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  const diaDaSemana = new Date(ano, mes - 1, dia).getDay();
  return diaDaSemana === 0 || diaDaSemana === 6;
}

function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function diaSeguinte(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const proximo = new Date(ano, mes - 1, dia + 1);
  const m = String(proximo.getMonth() + 1).padStart(2, '0');
  const d = String(proximo.getDate()).padStart(2, '0');
  return `${proximo.getFullYear()}-${m}-${d}`;
}

function criarLinha(dados = {}) {
  const linha = $('modelo-linha').content.firstElementChild.cloneNode(true);
  linha.querySelectorAll('[data-campo]').forEach((input) => {
    const valor = dados[input.dataset.campo];
    if (input.type === 'checkbox') input.checked = Boolean(valor);
    else if (valor) input.value = valor;
  });
  corpo.appendChild(linha);
  return linha;
}

function lerLinha(linha) {
  const dia = {};
  linha.querySelectorAll('[data-campo]').forEach((input) => {
    dia[input.dataset.campo] = input.type === 'checkbox' ? input.checked : input.value;
  });
  return dia;
}

function escrever(linha, res, texto) {
  linha.querySelector(`[data-res="${res}"]`).textContent = texto;
}

function duracaoOuTraco(minutos) {
  return minutos > 0 ? formatarDuracao(minutos) : '—';
}

const MENSAGENS = {
  incompleto: 'Incompleto',
  invalido: 'Confira os horários',
};

function atualizarLinha(linha, jornada, valorHora) {
  const dia = lerLinha(linha);
  const medicao = medirDia(dia);
  const celulaValor = linha.querySelector('[data-res="valor"]');
  celulaValor.classList.remove('aviso');

  if (medicao.status !== 'ok' || jornada === null) {
    ['trabalhado', 'e50', 'e60', 'e100'].forEach((res) => escrever(linha, res, '—'));
    const mensagem = MENSAGENS[medicao.status];
    celulaValor.textContent = mensagem || '—';
    celulaValor.classList.toggle('aviso', Boolean(mensagem));
    return null;
  }

  const horas = separarHoras(medicao.minutos, jornada, dia.especial);
  const valores = valorHora === null ? null : valorarHoras(horas, valorHora);

  escrever(linha, 'trabalhado', formatarDuracao(medicao.minutos));
  escrever(linha, 'e50', duracaoOuTraco(horas.e50));
  escrever(linha, 'e60', duracaoOuTraco(horas.e60));
  escrever(linha, 'e100', duracaoOuTraco(horas.dobro));
  const total = valores && valores.normal + valores.e50 + valores.e60 + valores.dobro;
  celulaValor.textContent = valores ? formatarCentavos(total) : '—';

  return { minutos: medicao.minutos, horas, valores };
}

function escreverResumo(id, minutos, centavos, comValor) {
  if (!comValor) {
    $(id).textContent = minutos > 0 ? formatarDuracao(minutos) : '—';
    return;
  }
  $(id).textContent = minutos > 0 ? `${formatarDuracao(minutos)} · ${formatarCentavos(centavos)}` : '—';
}

function validarCampo(input, valor) {
  const invalido = input.value.trim() !== '' && valor === null;
  input.setAttribute('aria-invalid', String(invalido));
}

function salvar() {
  const estado = {
    jornada: $('jornada').value,
    salario: $('salario').value,
    divisor: $('divisor').value,
    dias: [...corpo.children].map(lerLinha),
  };
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
  } catch {
    // Sem armazenamento disponível a calculadora funciona, só não lembra os dados.
  }
}

function carregar() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_STORAGE));
  } catch {
    return null;
  }
}

function calcular() {
  const jornadaMin = paraMinutos($('jornada').value);
  const jornada = jornadaMin ? jornadaMin : null;
  const salario = paraNumero($('salario').value);
  const divisor = paraNumero($('divisor').value);
  const valorHora = salario !== null && divisor !== null ? salario / divisor : null;
  const temValor = valorHora !== null;

  validarCampo($('salario'), salario);
  validarCampo($('divisor'), divisor);

  const soma = {
    minutos: 0,
    horas: { normal: 0, e50: 0, e60: 0, dobro: 0 },
    valores: { normal: 0, e50: 0, e60: 0, dobro: 0 },
  };

  for (const linha of corpo.children) {
    const resultado = atualizarLinha(linha, jornada, valorHora);
    if (!resultado) continue;
    soma.minutos += resultado.minutos;
    for (const faixa of Object.keys(soma.horas)) {
      soma.horas[faixa] += resultado.horas[faixa];
      if (temValor) soma.valores[faixa] += resultado.valores[faixa];
    }
  }

  const { normal, e50, e60, dobro } = soma.valores;
  $('total').textContent = temValor ? formatarCentavos(normal + e50 + e60 + dobro) : '—';
  $('res-horas').textContent = formatarDuracao(soma.minutos);
  $('res-hora').textContent = temValor ? formatoMoeda.format(valorHora) : '—';
  escreverResumo('res-normal', soma.horas.normal, normal, temValor);
  escreverResumo('res-e50', soma.horas.e50, e50, temValor);
  escreverResumo('res-e60', soma.horas.e60, e60, temValor);
  escreverResumo('res-dobro', soma.horas.dobro, dobro, temValor);
  $('res-mes').textContent = salario !== null && temValor
    ? formatarCentavos(Math.round(salario * 100) + e50 + e60 + dobro)
    : '—';

  salvar();
}

function adicionarDia() {
  const ultima = corpo.lastElementChild;
  const dataAnterior = ultima && ultima.querySelector('[data-campo="data"]').value;
  const data = dataAnterior ? diaSeguinte(dataAnterior) : hojeISO();
  const linha = criarLinha({ data, especial: ehFimDeSemana(data) });
  calcular();
  return linha;
}

corpo.addEventListener('input', (evento) => {
  const alvo = evento.target;
  if (alvo.dataset.campo === 'data') {
    alvo.closest('tr').querySelector('[data-campo="especial"]').checked = ehFimDeSemana(alvo.value);
  }
  calcular();
});

corpo.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.remover');
  if (!botao) return;
  botao.closest('tr').remove();
  if (corpo.children.length === 0) adicionarDia();
  else calcular();
});

['jornada', 'salario', 'divisor'].forEach((id) => $(id).addEventListener('input', calcular));

$('salario').addEventListener('blur', () => {
  const salario = paraNumero($('salario').value);
  if (salario !== null) $('salario').value = formatoNumero.format(salario);
});

$('adicionar').addEventListener('click', () => {
  adicionarDia().querySelector('[data-campo="entrada"]').focus();
});

$('limpar').addEventListener('click', () => {
  if (!confirm('Apagar todos os dias lançados? A jornada, o salário e o divisor serão mantidos.')) return;
  corpo.replaceChildren();
  adicionarDia();
});

function iniciar() {
  const estado = carregar();
  if (estado) {
    if (estado.jornada) $('jornada').value = estado.jornada;
    if (estado.salario) $('salario').value = estado.salario;
    if (estado.divisor) $('divisor').value = estado.divisor;
    (estado.dias || []).forEach(criarLinha);
  }
  if (corpo.children.length === 0) adicionarDia();
  else calcular();
}

iniciar();
