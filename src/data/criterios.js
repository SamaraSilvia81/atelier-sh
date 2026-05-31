// ── Níveis de avaliação ───────────────────────────────────────
// Progressão: completude × qualidade — do melhor cenário ao pior.
// Lógica: você olha o checklist → decide o nível → nível gera a nota.
// O checklist é apoio pedagógico, não cálculo automático.
export const NIVEIS_AVALIACAO = [
  { id: 'completo',              label: 'Completo',                  pct: 1.00, cor: '#5aab6e', emoji: '✅',
    desc: 'Fez tudo e fez certo. Critério plenamente atendido.' },
  { id: 'completo_ressalvas',    label: 'Completo c/ ressalvas',     pct: 0.85, cor: '#7F77DD', emoji: '🔵',
    desc: 'Fez tudo, mas algo ficou incorreto ou impreciso. Esforço total, qualidade com falha.' },
  { id: 'faltou_pouco',         label: 'Faltou pouco',              pct: 0.75, cor: '#4CA3C7', emoji: '🟦',
    desc: 'Fez bastante e acertou o que fez. Faltaram partes, mas o que entregou presta.' },
  { id: 'faltou_pouco_erros',   label: 'Faltou pouco c/ erros',     pct: 0.60, cor: '#78A86A', emoji: '🟡',
    desc: 'Fez bastante, mas errou partes relevantes. Metade do caminho com qualidade irregular.' },
  { id: 'faltou_muito',         label: 'Faltou muito',              pct: 0.40, cor: '#c8922a', emoji: '🟠',
    desc: 'Fez pouco, mas o que fez está correto. Entrega incompleta, execução ok.' },
  { id: 'faltou_muito_erros',   label: 'Faltou muito e errou',      pct: 0.25, cor: '#e06060', emoji: '🔶',
    desc: 'Fez pouco e ainda errou. Esforço baixo, qualidade baixa.' },
  { id: 'errado',               label: 'Errado',                    pct: 0.10, cor: '#b03030', emoji: '🔴',
    desc: 'Tentou, mas a abordagem foi incorreta por completo. Reconhece a tentativa.' },
  { id: 'nao_fez',              label: 'Não fez',                   pct: 0.00, cor: '#888',    emoji: '⬛',
    desc: 'Critério não entregue.' },
]

// ── Penalização por atraso ────────────────────────────────────
export const PENALIZACOES_ATRASO = [
  { id: 'sem_atraso',     label: 'Sem atraso',       dias: 0,    desconto: 0.00 },
  { id: 'atraso_1',       label: 'Até 1 dia',        dias: 1,    desconto: 0.10 },
  { id: 'atraso_2_3',     label: '2–3 dias',         dias: 3,    desconto: 0.20 },
  { id: 'atraso_mais3',   label: 'Mais de 3 dias',   dias: 999,  desconto: 0.30 },
  { id: 'nao_entregou',   label: 'Não entregou',     dias: -1,   desconto: 1.00 },
]

// ── Critérios de avaliação de grupo: DT, DCU, PI ─────────────
export const DISCIPLINAS = [
  {
    id: 'dt', nome: 'Design Thinking', total: 10,
    cor: '#7F77DD', corBg: 'rgba(127,119,221,0.08)', corBorder: 'rgba(127,119,221,0.3)',
    fases: [
      {
        nome: 'Fase 1 — Imersão', total: 3.5,
        obs: 'Avaliada exclusivamente por DT. É o coração do processo criativo.',
        criterios: [
          { id: 'pesquisa-desk', nome: 'Pesquisa Desk', max: 0.5, arquivos: ['imersao-pesquisa-desk_A.pdf'], itens: ['Dados secundários relevantes e atuais sobre o ODS escolhido','Fontes confiáveis: ONU, IBGE, artigos acadêmicos ou jornalísticos','Contextualiza o problema com base factual','Conexão clara entre os dados e o problema'] },
          { id: 'matriz-alinhamento', nome: 'Matriz de Alinhamento', max: 0.5, arquivos: ['imersao-matriz-alinhamento_A.pdf'], itens: ['Preenchida com perguntas reais do grupo sobre o problema','Reflete o que o grupo sabe e precisa descobrir','Serviu de base para planejar a pesquisa primária'] },
          { id: 'matriz-csd', nome: 'Matriz CSD', max: 0.5, arquivos: ['imersao-matriz-csd_A.pdf'], itens: ['Os três quadrantes preenchidos: Certezas, Suposições, Dúvidas','Conteúdo específico do projeto — não genérico','Revela pensamento crítico','Coerência entre a CSD e o que foi pesquisado'] },
          { id: 'pesquisa-primaria', nome: 'Pesquisa Primária', max: 1.0, zeraSem: 'Sem pesquisa primária este critério zera integralmente.', arquivos: ['imersao-formulario_A.pdf','imersao-roteiro-entrevista_A.pdf'], itens: ['FORMULÁRIO — perguntas coerentes, mín. 5 respondentes, dados sintetizados','ENTREVISTA — roteiro aberto, transcrição fiel e organizada','OBSERVAÇÃO / SHADOWING — planejamento e registro organizado'] },
          { id: 'relatorio-imersao', nome: 'Relatório de Imersão', max: 1.0, arquivos: ['imersao-relatorio_A.pdf'], itens: ['Estrutura formal: introdução, resumo, metodologia, destaques, referências','Sintetiza achados da pesquisa primária e secundária','Há interpretação e conexão com o problema','Os achados alimentam a construção da persona'] },
        ],
      },
      {
        nome: 'Fase 2 — Definição', total: 2.0,
        criterios: [
          { id: 'persona-empatia', nome: 'Persona com Empatia Real', max: 0.5, arquivos: ['definicao-persona_A.pdf'], itens: ['A persona nasceu dos dados da imersão','Tem dor específica, não genérica','O grupo consegue explicar de onde veio cada característica'] },
          { id: 'mapa-empatia', nome: 'Mapa de Empatia como Ferramenta', max: 0.5, arquivos: ['definicao-mapa-empatia_A.pdf'], itens: ['Demonstra que o grupo tentou ver o mundo pela ótica do usuário','Não é só template preenchido — há reflexão real','O conteúdo alimentou a construção da persona'] },
          { id: 'coerencia-problema-solucao', nome: 'Coerência Problema → Solução', max: 0.75, arquivos: ['definicao-ponto-de-vista_A.pdf','definicao-problema_A.pdf'], itens: ['POV: [Persona] precisa de [necessidade] porque [insight]','O problema é específico e decorre da pesquisa','A solução responde diretamente à dor da persona'] },
          { id: 'jornada-usuario-dt', nome: 'Jornada do Usuário', max: 0.25, arquivos: ['definicao-jornada-usuario_A.pdf'], itens: ['A jornada reflete o que foi descoberto na imersão','Identifica dores e oportunidades reais em cada etapa'] },
        ],
      },
      {
        nome: 'Fase 3 — Ideação', total: 2.5,
        criterios: [
          { id: 'geracao-ideias', nome: 'Geração de Ideias — Quantidade e Ousadia', max: 0.75, arquivos: ['ideacao-brainstorming_A.pdf'], itens: ['O brainstorming mostra que o grupo foi além do óbvio','Tem variedade de ideias, inclusive as ousadas','A ideação divergiu antes de convergir'] },
          { id: 'priorizacao', nome: 'Priorização com Critério', max: 0.75, arquivos: ['ideacao-matriz-impacto_A.pdf','ideacao-canva-lean_A.pdf'], itens: ['A matriz de impacto foi usada para tomar uma decisão real','Há justificativa para a escolha da solução final','O Canvas Lean demonstra que o grupo pensou sobre viabilidade'] },
          { id: 'inovacao', nome: 'Inovação da Solução', max: 0.5, itens: ['O grupo identifica em qual tipo de inovação se encaixa sua solução','A justificativa é coerente com a solução apresentada','A solução não é a mais óbvia para aquele ODS'] },
          { id: 'storytelling', nome: 'Storytelling — A História do Usuário', max: 0.5, itens: ['O pitch conta uma história — não apresenta slides sequencialmente','A narrativa segue: ODS → persona → dor real → solução → impacto','Quem assiste entende o problema antes de ver a solução'] },
        ],
      },
      {
        nome: 'Processo Geral — Ciclo DT', total: 2.0,
        criterios: [
          { id: 'documentacao-processo', nome: 'Documentação do Processo', max: 0.75, itens: ['Todas as fases estão documentadas e entregues no Drive','Dá pra rastrear a evolução do projeto','Há coerência entre as fases — cada etapa alimenta a próxima'] },
          { id: 'colaboracao-distribuicao', nome: 'Colaboração e Distribuição do Trabalho', max: 0.75, itens: ['O Trello mostra que o trabalho foi distribuído','O histórico de commits confirma participação de mais de um membro','Não tem um integrante fazendo tudo'] },
          { id: 'participacao-pitch-dt', nome: 'Participação no Pitch', max: 0.5, itens: ['Todos os integrantes participam da apresentação','Cada membro demonstra conhecimento sobre o projeto como um todo'] },
        ],
      },
    ],
  },
  {
    id: 'dcu', nome: 'Design Centrado no Usuário', total: 10,
    cor: '#1D9E75', corBg: 'rgba(29,158,117,0.08)', corBorder: 'rgba(29,158,117,0.3)',
    fases: [
      {
        nome: 'Fase 2 — Definição (lente DCU)', total: 2.5,
        criterios: [
          { id: 'persona-visual', nome: 'Persona — Qualidade Visual e Estrutura', max: 0.75, arquivos: ['definicao-persona_A.pdf'], itens: ['A persona é visual e bem diagramada — hierarquia clara e legível','Cor e tipografia coerentes','As informações estão organizadas com clareza'] },
          { id: 'jornada-visual', nome: 'Jornada do Usuário — Qualidade Visual', max: 0.75, arquivos: ['definicao-jornada-usuario_A.pdf'], itens: ['Mapeia os pontos de contato: antes, durante e depois','Identifica dores e oportunidades de design','Apresentação visual clara com boa hierarquia'] },
          { id: 'mapa-empatia-visual', nome: 'Mapa de Empatia — Apresentação Visual', max: 0.5, itens: ['Os quatro quadrantes preenchidos e organizados visualmente','A diagramação é clara — dá pra ler sem esforço','Há hierarquia visual entre os elementos'] },
          { id: 'pov-clareza', nome: 'POV + Problema + Solução — Clareza', max: 0.5, itens: ['O POV está formulado de forma clara e direta','O problema é específico e bem descrito','A solução é coerente com o problema identificado'] },
        ],
      },
      {
        nome: 'Fase 3 — Ideação (lente DCU)', total: 1.0,
        criterios: [
          { id: 'ideacao-visual', nome: 'Documentos de Ideação — Qualidade Visual', max: 0.5, itens: ['Os documentos estão bem diagramados','Hierarquia visual clara: títulos, seções e conteúdo distinguíveis'] },
          { id: 'style-guide', nome: 'Style Guide — Identidade Visual do Projeto', max: 0.5, itens: ['Paleta de cores com justificativa baseada em psicologia das cores','Tipografia escolhida com critério: hierarquia, legibilidade, caráter','Coerente com o ODS e com o tom da solução'] },
        ],
      },
      {
        nome: 'Fase 4 — Prototipação (lente DCU)', total: 6.5,
        criterios: [
          { id: 'gramatica-visual', nome: 'Gramática Visual — Princípios de Gestalt', max: 1.25, itens: ['O layout aplica princípios de Gestalt de forma intencional','Proximidade: elementos relacionados estão agrupados','Similaridade: elementos com mesma função têm mesma aparência','Continuidade e/ou pregnância aplicados'] },
          { id: 'cor-tipografia', nome: 'Cor e Tipografia no Protótipo', max: 1.25, itens: ['A paleta do Style Guide foi aplicada com consistência','Contraste adequado entre texto e fundo','Hierarquia tipográfica clara: título, subtítulo, corpo, label'] },
          { id: 'affordance-feedback', nome: 'Affordance, Feedback e Microinterações', max: 1.25, itens: ['Botões e elementos interativos são visualmente reconhecíveis','O fluxo indica feedback claro após uma ação','Estados de hover/foco/ativo estão pensados','Microinterações ou transições foram consideradas'] },
          { id: 'jornada-fluxo-prototipo', nome: 'Jornada e Fluxo de Tarefas no Protótipo', max: 1.25, arquivos: ['prototipo-alta_A.fig','diagrama-telas_A.pdf'], itens: ['O protótipo reflete a jornada do usuário mapeada','O fluxo de tarefas está claro — navegação lógica','O diagrama de telas mostra como as páginas se conectam'] },
          { id: 'progressao-fidelidade', nome: 'Progressão: Baixa → Média → Alta Fidelidade', max: 1.0, arquivos: ['prototipo-baixa_A.pdf','prototipo-media_A.pdf','prototipo-alta_A.fig'], itens: ['Os três níveis foram entregues','O wireframe de baixa resolve estrutura e fluxo','O de média incorpora identidade visual','O de alta é o protótipo navegável final no Figma'] },
          { id: 'consistencia-visual', nome: 'Consistência Visual Geral', max: 0.5, itens: ['O projeto tem identidade visual coesa','Todos os documentos entregues têm coerência visual entre si','O protótipo é consistente com o Style Guide'] },
        ],
      },
    ],
  },
  {
    id: 'pi', nome: 'Projeto Integrador I', total: 6,
    cor: '#BA7517', corBg: 'rgba(186,117,23,0.08)', corBorder: 'rgba(186,117,23,0.3)',
    fases: [
      {
        nome: 'Documento PI', total: 1.5,
        criterios: [
          { id: 'estrutura-completude', nome: 'Estrutura e Completude', max: 0.5, arquivos: ['documento-pi_A.pdf'], itens: ['O documento segue o template definido','Todas as seções estão preenchidas','O documento está em PDF com nomenclatura correta'] },
          { id: 'qualidade-escrita', nome: 'Qualidade da Escrita e Argumentação', max: 0.75, itens: ['O texto é claro, objetivo e bem escrito','As decisões do projeto são justificadas','A argumentação é coerente com os documentos de DT e DCU'] },
          { id: 'referencias', nome: 'Referências e Fontes', max: 0.25, itens: ['Dados e afirmações têm fonte citada','Há pelo menos 3 fontes referenciadas','Referências formatadas de forma consistente'] },
        ],
      },
      {
        nome: 'Protótipo Final', total: 1.0,
        criterios: [
          { id: 'prototipo-navegavel', nome: 'Protótipo Navegável e Completo', max: 0.5, arquivos: ['prototipo-alta_A.fig'], itens: ['O protótipo está navegável no Figma — não são telas soltas','Cobre o fluxo principal com pelo menos 3 telas conectadas','Um usuário externo consegue navegar sem explicação'] },
          { id: 'fidelidade-identidade', nome: 'Fidelidade à Identidade Visual', max: 0.5, itens: ['O protótipo é consistente com o Style Guide','Cor, tipografia e componentes seguem o planejado'] },
        ],
      },
      {
        nome: 'Pitch + Slides', total: 1.5,
        criterios: [
          { id: 'clareza-apresentacao', nome: 'Clareza e Fluidez da Apresentação', max: 0.5, itens: ['O grupo apresenta com segurança — não lê do slide','Todos os integrantes participam','O tempo de 7 minutos é respeitado'] },
          { id: 'slides-visual', nome: 'Slides — Qualidade Visual', max: 0.5, itens: ['Os slides são visuais — não são paredes de texto','Hierarquia tipográfica clara','A identidade visual do projeto está presente nos slides'] },
          { id: 'justificar-decisoes', nome: 'Capacidade de Justificar Decisões', max: 0.5, itens: ['O grupo responde perguntas sobre as escolhas com segurança','Sabe explicar por que fez o que fez','Quando não sabe, reconhece honestamente'] },
        ],
      },
      {
        nome: 'Processo Ágil — Trello', total: 1.5,
        criterios: [
          { id: 'organizacao-trello', nome: 'Organização e Uso Real do Trello', max: 0.75, itens: ['O quadro tem as colunas corretas: Backlog, To Do, Doing, Done e Referências','Os cards têm título no formato verbo no imperativo','O histórico mostra uso ao longo do semestre'] },
          { id: 'sprint-reviews', nome: 'Sprint Reviews', max: 0.75, itens: ['Ao menos 3 Sprint Reviews foram preenchidos','Os reviews têm reflexão real: entregas, pendências, impedimentos e aprendizados','Há honestidade sobre o processo'] },
        ],
      },
      {
        nome: 'Organização e Nomenclatura de Arquivos', total: 0.5,
        criterios: [
          { id: 'nomenclatura-arquivos', nome: 'Estrutura e Padrão de Nomenclatura', max: 0.5, itens: ['Todos os arquivos estão na pasta correta do Drive','Os arquivos seguem o padrão de nomenclatura','A indicação de turma (_A ou _B) está correta em todos'] },
        ],
      },
    ],
  },
]

// ── Critérios individuais ─────────────────────────────────────
export const CRITERIOS_INDIVIDUAIS = [
  { id: 'proatividade',           nome: 'Proatividade',              max: 10, descricao: 'Age antes de ser cobrado. Antecipa problemas e toma iniciativa sem esperar instrução.' },
  { id: 'resolucao-problemas',    nome: 'Resolução de Problemas',    max: 10, descricao: 'Consegue identificar o problema com clareza e propor ou buscar soluções de forma estruturada.' },
  { id: 'autonomia-autocorrecao', nome: 'Autonomia & Autocorreção',  max: 10, descricao: '10 = percebeu o erro e agiu para corrigir. 5 = percebeu mas não agiu. 0 = não percebeu nem agiu.', escala: [{ valor: 10, label: 'Percebeu e corrigiu ativamente' }, { valor: 7, label: 'Percebeu e buscou ajuda' }, { valor: 5, label: 'Percebeu mas não agiu' }, { valor: 3, label: 'Percebeu parcialmente' }, { valor: 0, label: 'Não percebeu / não agiu' }] },
  { id: 'atrasos-entregas',       nome: 'Atrasos nas Entregas',      max: 10, descricao: 'Escala invertida: 10 = entregou tudo no prazo. 0 = atrasos recorrentes sem comunicação prévia.', escalaInvertida: true },
  { id: 'presenca-aulas',         nome: 'Presença nas Aulas',        max: 10, descricao: 'Frequência e engajamento nas aulas. Presenças justificadas com antecedência são consideradas.' },
  { id: 'colaboracao-time',       nome: 'Colaboração com o Time',    max: 10, descricao: 'Contribui ativamente para o grupo. Não só executa sua parte — ajuda os colegas e participa das decisões coletivas.' },
]