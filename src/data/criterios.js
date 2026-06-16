// ── Níveis de avaliação ───────────────────────────────────────
// Progressão: completude × qualidade — do melhor cenário ao pior.
// Lógica: você olha o checklist → decide o nível → nível gera a nota.
// O checklist é apoio pedagógico, não cálculo automático.
export const NIVEIS_AVALIACAO = [
  { id: 'completo',              label: 'Completo',                  pct: 1.00, cor: '#5aab6e', emoji: '✅',
    desc: 'Fez tudo e fez certo. Critério plenamente atendido.' },
  { id: 'completo_ressalvas',    label: 'Completo c/ ressalvas',     pct: 0.85, cor: '#7F77DD', emoji: '🔵',
    desc: 'Fez tudo, mas algo ficou incorreto ou impreciso. Esforço total, qualidade com falha.' },
  {
    id: 'completo_inadequado',
    label: 'Completo, mas inadequado',
    pct: 0.70,
    cor: '#B06AD9',
    emoji: '🟣',
    desc: 'Preencheu todos os itens, porém boa parte do conteúdo não atende ao propósito da atividade.'
  },
  { id: 'faltou_pouco',         label: 'Faltou pouco',              pct: 0.65, cor: '#4CA3C7', emoji: '🟦',
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

// ── Desconto por conduta ──────────────────────────────────────
// Camada de penalização individual (não entra na média).
// Conduta adequada é o esperado — não rende bônus. Apenas ocorrências
// ruins geram corte, aplicado sobre a nota individual como o atraso.
// 'desconto' = fração da nota individual (0.20 = -20%). Avalia padrão,
// não episódio isolado. Sempre registrar a justificativa da ocorrência.
export const DESCONTOS_CONDUTA = [
  { id: 'conduta_ok',          label: 'Postura respeitosa e ética, sem ressalvas',      desconto: 0.00,
    desc: 'Conduta adequada — nenhum corte. O aluno trata colegas e docentes com respeito, cumpre combinados e mantém postura profissional.' },
  { id: 'conduta_deslize',     label: 'Boa postura; deslizes pontuais já resolvidos',    desconto: 0.25,
    desc: 'Episódio pontual e leve, já resolvido no momento. Ex.: tom inadequado numa discussão, interrupção desrespeitosa, comentário fora de lugar. Foi chamado à atenção e corrigiu.' },
  { id: 'conduta_intervencao', label: 'Falhas de conduta que exigiram intervenção',      desconto: 0.50,
    desc: 'Comportamento que exigiu intervenção formal do docente. Ex.: recusa a colaborar com o grupo, atitude hostil com colega, atrapalhar aula deliberadamente, descumprir combinado após ser avisado.' },
  { id: 'conduta_recorrente',  label: 'Problemas recorrentes de postura',                desconto: 0.75,
    desc: 'Padrão que se repete mesmo após intervenções. Ex.: desrespeito recorrente em sala, descompromisso sistemático com o grupo, postura que prejudica o trabalho dos colegas repetidamente.' },
  { id: 'conduta_grave',       label: 'Conduta desrespeitosa ou antiética reincidente',  desconto: 1.00,
    desc: 'Falta grave. Ex.: desrespeito direto ao docente, assédio ou intimidação de colega, plágio, falsificação de entrega, conduta que compromete a integridade acadêmica do projeto.' },
]
// Descrição geral: Respeito no trato com colegas e docentes, ética acadêmica
// e postura profissional. Avalia tanto o padrão ao longo do projeto quanto
// episódios isolados de gravidade. Sempre registrar o que houve.

// ── Desconto por engajamento ──────────────────────────────────
// Comprometimento com o projeto: atenção em aula, acompanhamento
// do que está sendo feito, saber onde o projeto está. Desengajamento
// persistente prejudica o grupo e precisa ser registrado.
export const DESCONTOS_ENGAJAMENTO = [
  { id: 'engajamento_ok',        label: 'Engajado e atento ao longo do projeto',           desconto: 0.00,
    desc: 'Acompanha o projeto, sabe o que está sendo feito, presta atenção nas aulas e participa das atividades.' },
  { id: 'engajamento_parcial',   label: 'Engajamento parcial; momentos de desatenção',     desconto: 0.25,
    desc: 'No geral acompanha, mas tem momentos de desatenção. Ex.: perde o fio de vez em quando, precisa ser relembrado do que foi combinado, mas quando chamado retoma.' },
  { id: 'engajamento_baixo',     label: 'Frequentemente perdido; precisa ser direcionado', desconto: 0.50,
    desc: 'Frequentemente não sabe o que está acontecendo no projeto. Ex.: não acompanha as entregas, precisa que alguém explique de novo o que já foi decidido, não presta atenção nas orientações.' },
  { id: 'engajamento_ausente',   label: 'Desengajamento persistente ao longo do projeto',  desconto: 0.75,
    desc: 'Não acompanha o projeto de forma consistente. Ex.: nunca sabe em que fase o grupo está, não lê o que foi produzido, depende totalmente dos colegas pra saber o que fazer.' },
  { id: 'engajamento_zero',      label: 'Completamente ausente do processo',               desconto: 1.00,
    desc: 'Desconectado do projeto por inteiro. Ex.: não sabe explicar o que o grupo faz, não acompanhou nenhuma etapa, presença física sem participação real. Prejudica diretamente o grupo.' },
]

// ── Critérios de avaliação de grupo: DT, DCU, PI ─────────────
// REESTRUTURADO: projeto encerra na Ideação (Fase 3).
//   • Cortadas: Protótipo de baixa fidelidade e Análise Mercadológica.
//   • DT  → sem Pitch. Pesos rescalados p/ fechar 10 (bumps nos critérios mais pesados — ajuste se quiser).
//   • DCU → sem Protótipo. Definição e Ideação dobradas (×2) p/ fechar 10.
//   • PI  → deixa de cobrar artefatos; avalia a DOCUMENTAÇÃO COMO UM TODO.
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
          { id: 'matriz-csd', nome: 'Matriz CSD & Perguntas de pesquisa', max: 0.5, arquivos: ['imersao-matriz-csd_A.pdf'], itens: ['Os três quadrantes preenchidos: Certezas, Suposições, Dúvidas','Conteúdo específico do projeto — não genérico','Revela pensamento crítico','Coerência entre a CSD e o que foi pesquisado'] },
          {
            id: 'pesquisa-primaria',
            nome: 'Pesquisa Primária',
            max: 1.0,
            zeraSem: 'Sem pesquisa primária este critério zera integralmente.',
            arquivos: ['imersao-formulario_A.pdf','imersao-roteiro-entrevista_A.pdf'],
            itens: [],
            modalidades: [
              {
                id: 'formulario',
                label: 'Formulário',
                itens: [
                  'Estrutura bem estabelecida: capa, descrição e perguntas',
                  'Capa com imagem referente ao tema',
                  'Descrição completa: grupo, curso, instituição, objetivo, tempo estimado',
                  'Perguntas coerentes e alinhadas ao objeto de estudo',
                  'Diversidade de tipos de pergunta (múltipla escolha, caixa de seleção, aberta)',
                  'Quantidade de perguntas: mín. 5 / esperado 8 / ideal 15',
                  'Mínimo 5 respondentes',
                  'Dados sintetizados e analisados no Relatório de Imersão',
                ],
              },
              {
                id: 'entrevista',
                label: 'Entrevista',
                itens: [
                  'Roteiro estruturado com perguntas abertas',
                  'Perguntas coerentes com o objeto de estudo',
                  'Transcrição fiel e organizada',
                  'Mínimo 1 entrevistado, esperado 3 ou mais',
                  'Identificação do perfil do entrevistado',
                  'Insights extraídos e sintetizados',
                ],
              },
              {
                id: 'observacao-direta',
                label: 'Observação Direta',
                itens: [
                  'Planejamento prévio documentado (o quê, onde, quando observar)',
                  'Registro organizado durante a observação (fotos, anotações, campo)',
                  'Foco no comportamento e contexto, não em opiniões',
                  'Insights extraídos e sintetizados',
                ],
              },
              {
                id: 'shadowing',
                label: 'Shadowing',
                itens: [
                  'Planejamento prévio documentado',
                  'Acompanhamento real de um usuário em contexto',
                  'Registro detalhado da jornada observada',
                  'Identificação de dores e oportunidades não verbalizadas',
                  'Insights extraídos e sintetizados',
                ],
              },
            ],
          },
          { id: 'relatorio-imersao', nome: 'Relatório de Imersão', max: 1.0, arquivos: ['imersao-relatorio_A.pdf'], itens: ['Estrutura formal: introdução, resumo, metodologia, destaques, referências','Sintetiza achados da pesquisa primária e secundária','Há interpretação e conexão com o problema','Os achados alimentam a construção da persona'] },
        ],
      },
      {
        nome: 'Fase 2 — Definição', total: 2.5,
        criterios: [
          { id: 'persona-empatia', nome: 'Persona com Empatia Real', max: 0.75, arquivos: ['definicao-persona_A.pdf'], itens: ['A persona nasceu dos dados da imersão','Tem dor específica, não genérica','O grupo consegue explicar de onde veio cada característica'] },
          { id: 'mapa-empatia', nome: 'Mapa de Empatia como Ferramenta', max: 0.5, arquivos: ['definicao-mapa-empatia_A.pdf'], itens: ['Demonstra que o grupo tentou ver o mundo pela ótica do usuário','Não é só template preenchido — há reflexão real','O conteúdo alimentou a construção da persona'] },
          { id: 'coerencia-problema-solucao', nome: 'Enunciado do Problema (POV)', max: 0.75, arquivos: ['definicao-ponto-de-vista_A.pdf','definicao-problema_A.pdf'], itens: ['POV: [Persona] precisa de [necessidade] porque [insight]','O problema é específico e decorre da pesquisa','A solução responde diretamente à dor da persona'] },
          { id: 'jornada-usuario-dt', nome: 'Jornada do Usuário (atual)', max: 0.5, arquivos: ['definicao-jornada-usuario_A.pdf'], itens: ['A jornada reflete o que foi descoberto na imersão','Identifica dores e oportunidades reais em cada etapa'] },
        ],
      },
      {
        nome: 'Fase 3 — Ideação', total: 4.0,
        criterios: [
          { id: 'geracao-ideias', nome: 'Geração de Ideias — Quantidade e Ousadia', max: 1.0, arquivos: ['ideacao-brainstorming_A.pdf'], itens: ['O brainstorming mostra que o grupo foi além do óbvio','Tem variedade de ideias, inclusive as ousadas','A ideação divergiu antes de convergir'] },
          { id: 'priorizacao', nome: 'Priorização com Critério', max: 1.0, arquivos: ['ideacao-priorizacao_A.pdf'], itens: ['O grupo usou critérios claros para escolher a ideia final','Há justificativa real para a solução escolhida','A escolha convergiu a partir do brainstorm — não foi aleatória'] },
          { id: 'jornada-futura', nome: 'Jornada do Usuário (com a solução)', max: 0.5, arquivos: ['ideacao-jornada-futura_A.pdf'], itens: ['Mostra a experiência do usuário DEPOIS da solução','Contrasta com a jornada atual mapeada na Definição','Indica o estado emocional do usuário em cada etapa'] },
          { id: 'storytelling', nome: 'Storytelling — A História do Usuário', max: 0.5, itens: ['A ideação registra a história do usuário: persona → dor → solução → impacto','A narrativa é coerente e fácil de seguir','Quem lê entende o problema antes de ver a solução'] },
          { id: 'enunciado-solucao', nome: 'Enunciado da Solução', max: 1.0, itens: ['Segue a estrutura de três partes: afirmação propositiva + público beneficiado + transformação esperada','A afirmação propositiva deixa claro o que será criado — responde à afirmação diagnóstica do problema','O público beneficiado é o mesmo recorte humano do enunciado do problema — não inventou público novo','A transformação esperada responde às manifestações concretas do problema: cada perda tem uma transformação correspondente'] },
        ],
      },
    ],
  },
  {
    id: 'dcu', nome: 'Design Centrado no Usuário', total: 10,
    cor: '#1D9E75', corBg: 'rgba(29,158,117,0.08)', corBorder: 'rgba(29,158,117,0.3)',
    fases: [
      {
        nome: 'Fase 2 — Definição (lente DCU)', total: 5.0,
        obs: 'Pesos dobrados (×2) após a retirada do protótipo.',
        criterios: [
          { id: 'persona-visual', nome: 'Persona — Qualidade Visual e Estrutura', max: 1.5, arquivos: ['definicao-persona_A.pdf'], itens: ['A persona é visual e bem diagramada — hierarquia clara e legível','Cor e tipografia coerentes','As informações estão organizadas com clareza'] },
          { id: 'jornada-visual', nome: 'Jornada do Usuário — Qualidade Visual', max: 1.5, arquivos: ['definicao-jornada-usuario_A.pdf'], itens: ['Mapeia os pontos de contato: antes, durante e depois','Identifica dores e oportunidades de design','Apresentação visual clara com boa hierarquia'] },
          { id: 'mapa-empatia-visual', nome: 'Mapa de Empatia — Apresentação Visual', max: 1.0, itens: ['Os quatro quadrantes preenchidos e organizados visualmente','A diagramação é clara — dá pra ler sem esforço','Há hierarquia visual entre os elementos'] },
          { id: 'pov-clareza', nome: 'POV + Problema + Solução — Clareza', max: 1.0, itens: ['O POV está formulado de forma clara e direta','O problema é específico e bem descrito','A solução é coerente com o problema identificado'] },
        ],
      },
      {
        nome: 'Fase 3 — Ideação (lente DCU)', total: 5.0,
        obs: 'Pesos dobrados (×2) após a retirada do protótipo.',
        criterios: [
          { id: 'solucao-centrada-usuario', nome: 'Solução Centrada no Usuário', max: 2.0, itens: ['A solução responde diretamente às dores da persona','As decisões de ideação são justificadas pelo usuário, não por preferência do grupo','Há conexão clara entre o problema do usuário e a solução proposta'] },
          { id: 'jornada-ux', nome: 'Jornada Futura — Qualidade UX', max: 2.0, arquivos: ['ideacao-jornada-futura_A.pdf'], itens: ['A jornada com a solução mostra como a experiência do usuário melhora','Identifica os momentos-chave da interação','Aponta onde a solução resolve as dores mapeadas'] },
          { id: 'documentos-clareza', nome: 'Documentos de Ideação — Clareza Visual', max: 1.0, itens: ['Os documentos estão bem organizados e legíveis','Hierarquia visual clara entre seções e conteúdo'] },
        ],
      },
    ],
  },
  {
    id: 'pi', nome: 'Projeto Integrador I', total: 10,
    cor: '#BA7517', corBg: 'rgba(186,117,23,0.08)', corBorder: 'rgba(186,117,23,0.3)',
    fases: [
      {
        nome: 'Documentação do Projeto (Memorial)', total: 6,
        obs: 'PI avalia a documentação como um todo — não fragmentos. O conteúdo de cada artefato é cobrado em DT/DCU; aqui o olhar é sobre o documento enquanto entrega acadêmica integradora.',
        criterios: [
          { id: 'estrutura-organizacao', nome: 'Estrutura e Organização do Documento', max: 2.0, itens: ['Todas as seções esperadas estão presentes (capa, introdução, fases, conclusão, referências)','As seções seguem ordem lógica e o documento flui entre as fases','Há capa e sumário; a hierarquia de títulos é clara','Sem placeholders, lorem ipsum ou conteúdo de template não preenchido','O conteúdo de cada fase está na seção correta (sem Imersão/Definição trocadas)'] },
          { id: 'linguagem-academica', nome: 'Linguagem e Qualidade Acadêmica', max: 2.0, itens: ['Registro acadêmico adequado — sem informalidade ou gírias','Texto claro, coeso e coerente do início ao fim','Ortografia e gramática revisadas','As ideias se conectam: o problema apresentado se sustenta até a solução'] },
          { id: 'formatacao-padronizacao', nome: 'Formatação e Padronização', max: 1.0, itens: ['Formatação consistente (fontes, espaçamento, margens)','Figuras, tabelas e quadros numerados e legendados','Identidade visual coerente ao longo do documento','Segue o template / normas definidas para o projeto'] },
          { id: 'embasamento-referencias', nome: 'Embasamento e Referências', max: 1.0, itens: ['Afirmações relevantes estão referenciadas','Bibliografia presente e formatada','Fontes confiáveis e atuais','Citações no corpo do texto correspondem às referências'] },
        ],
      },
      {
        nome: 'Gestão do Projeto (Trello)', total: 4,
        obs: 'Avalia como o grupo usou o Trello para organizar e acompanhar o projeto. Não é sobre estética do board — é sobre gestão real.',
        criterios: [
          { id: 'board-estrutura', nome: 'Organização do Board', max: 1.0, itens: ['Listas com estrutura clara (backlog, em andamento, concluído ou equivalente)','Cards organizados nas listas corretas','Nomenclatura consistente e descritiva nos cards'] },
          { id: 'cards-rastreabilidade', nome: 'Rastreabilidade das Tarefas', max: 1.5, itens: ['Cards com descrição suficiente para entender a tarefa','Uso de checklists para decompor entregas','Datas de entrega definidas nos cards relevantes','Cards movidos conforme o progresso real'] },
          { id: 'distribuicao-membros', nome: 'Distribuição entre Membros', max: 0.75, itens: ['Membros atribuídos aos cards','Distribuição equilibrada — não está tudo num só membro','Dá pra ver quem fez o quê'] },
          { id: 'frequencia-uso', nome: 'Frequência e Consistência de Uso', max: 0.75, itens: ['Atividade distribuída ao longo do projeto — não só no final','Board atualizado reflete o andamento real','Não há cards abandonados ou desatualizados'] },
        ],
      },
    ],
  },
]

// ── Critérios individuais ─────────────────────────────────────
// Conduta NÃO entra aqui — é desconto (ver DESCONTOS_CONDUTA). Estes 6
// compõem a nota individual; a conduta apenas corta sobre o resultado.
export const CRITERIOS_INDIVIDUAIS = [
  { id: 'proatividade',           nome: 'Proatividade',              max: 10, descricao: 'Age antes de ser cobrado. Antecipa problemas e toma iniciativa sem esperar instrução.' },
  { id: 'resolucao-problemas',    nome: 'Resolução de Problemas',    max: 10, descricao: 'Consegue identificar o problema com clareza e propor ou buscar soluções de forma estruturada.' },
  { id: 'autonomia-autocorrecao', nome: 'Autonomia & Autocorreção',  max: 10, descricao: '10 = percebeu o erro e agiu para corrigir. 5 = percebeu mas não agiu. 0 = não percebeu nem agiu.', escala: [{ valor: 10, label: 'Percebeu e corrigiu ativamente' }, { valor: 7, label: 'Percebeu e buscou ajuda' }, { valor: 5, label: 'Percebeu mas não agiu' }, { valor: 3, label: 'Percebeu parcialmente' }, { valor: 0, label: 'Não percebeu / não agiu' }] },
  { id: 'atrasos-entregas',       nome: 'Atrasos nas Entregas',      max: 10, descricao: 'Escala invertida: 10 = entregou tudo no prazo. 0 = atrasos recorrentes sem comunicação prévia.', escalaInvertida: true },
  { id: 'presenca-aulas',         nome: 'Presença nas Aulas',        max: 10, descricao: 'Frequência e engajamento nas aulas. Presenças justificadas com antecedência são consideradas.' },
  { id: 'colaboracao-time',       nome: 'Colaboração com o Time',    max: 10, descricao: 'Contribui ativamente para o grupo. Não só executa sua parte — ajuda os colegas e participa das decisões coletivas.' },
]
