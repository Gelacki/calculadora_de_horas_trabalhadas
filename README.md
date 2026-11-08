# Calculadora de horas trabalhadas

## Objetivo

Calcular quanto o trabalhador tem a receber por cada dia trabalhado, a partir dos horários de ponto, separando as horas normais das horas extras.

Foi feita com base na [Convenção Coletiva de Trabalho 2026/2026 dos trabalhadores gráficos do Paraná](https://www.stigpr.com.br/images/pdf/CCT2026.pdf) (registro MTE PR000308/2026) e serve para conferir o valor das horas e das extras antes de o holerite chegar. O resultado é uma estimativa e não substitui o cálculo da folha de pagamento.

## Como usar

1. Abra o arquivo `index.html` no navegador. Não precisa instalar nada.
2. Preencha a jornada do dia (por padrão, 08:45), o salário bruto mensal e o divisor de horas (por padrão, 220).
3. Para cada dia, informe a data e os horários de entrada, saída para o almoço, volta do almoço e saída.
4. Em feriados, marque a caixa "Sáb./dom./feriado". Sábados e domingos são marcados automaticamente pela data.

Os valores são recalculados enquanto você digita, e os dados ficam salvos no próprio navegador.

## Regras de cálculo

O valor da hora é o salário bruto dividido pelo divisor.

| Situação | Pagamento | Origem |
| --- | --- | --- |
| Até a jornada do dia | Valor da hora | Salário contratado |
| Duas primeiras horas além da jornada | Valor da hora + 50% | CCT, Cláusula 9ª |
| Demais horas além da jornada | Valor da hora + 60% | CCT, Cláusula 9ª |
| Domingos e feriados | Todas as horas em dobro (100%) | CCT, Cláusula 10ª |
| Sábados | Todas as horas em dobro (100%) | Ajuste desta calculadora, não previsto na CCT |

Para o sábado ser calculado como dia comum, basta desmarcar a caixa naquele dia.

## O que os resultados mostram

- **Por dia:** horas trabalhadas, extras a 50%, 60% e 100% e o valor do dia.
- **Total dos dias lançados:** soma apenas as horas trabalhadas. Como o salário mensal também remunera o descanso semanal, esse total não chega ao salário cheio.
- **Salário + extras:** salário bruto somado às horas extras, considerando um mês completo e sem faltas.

## O que não está incluído

- Descontos como INSS e Imposto de Renda: todos os valores são brutos.
- Adicional noturno.
- Reflexo das horas extras no descanso semanal remunerado.
- Tolerância de minutos da CLT (art. 58, §1º): qualquer minuto acima da jornada conta como extra.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Aparência, incluindo tema escuro e layout para celular |
| `script.js` | Cálculos e regras (os percentuais ficam no início do arquivo) |
