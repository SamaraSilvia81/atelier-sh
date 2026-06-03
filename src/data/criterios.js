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
          { id: 'matriz-csd', nome: 'Matriz CSD & Perguntas de pesquisa', max: 0.5, arquivos: ['imersao-matriz-csd_A.pdf'], itens: ['Os três quadrantes preenchidos: Certezas, Suposições, Dúvidas','Conteúdo específico do projeto — não genérico','Revela pensamento crítico','Coerência entre a CSD e o que foi pesquisado'] },
          {
            id: 'pesquisa-primaria',
            nome: 'Pesquisa Primária',
            max: 1.0,
            zeraSem: 'Sem pesquisa primária este critério zera integralmente.',
            arquivos: ['imersao-formulario_A.pdf','imersao-roteiro-entrevista_A.pdf'],
            // Critério com modalidades — itens[] vazio pois os checks vêm por modalidade
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
        nome: 'Fase 3 — Ideação', total: 2.5,
        criterios: [
          { id: 'geracao-ideias', nome: 'Geração de Ideias — Quantidade e Ousadia', max: 0.75, arquivos: ['ideacao-brainstorming_A.pdf'], itens: ['O brainstorming mostra que o grupo foi além do óbvio','Tem variedade de ideias, inclusive as ousadas','A ideação divergiu antes de convergir'] },
          { id: 'priorizacao', nome: 'Priorização com Critério', max: 0.75, arquivos: ['ideacao-priorizacao_A.pdf'], itens: ['O grupo usou critérios claros para escolher a ideia final','Há justificativa real para a solução escolhida','A escolha convergiu a partir do brainstorm — não foi aleatória'] },
          { id: 'jornada-futura', nome: 'Jornada do Usuário (com a solução)', max: 0.5, arquivos: ['ideacao-jornada-futura_A.pdf'], itens: ['Mostra a experiência do usuário DEPOIS da solução','Contrasta com a jornada atual mapeada na Definição','Indica o estado emocional do usuário em cada etapa'] },
          { id: 'storytelling', nome: 'Storytelling — A História do Usuário', max: 0.5, itens: ['A ideação registra a história do usuário: persona → dor → solução → impacto','A narrativa é coerente e fácil de seguir','Quem lê entende o problema antes de ver a solução'] },
        ],
      },
      {
        nome: 'Fase 5 — Pitch (lente DT)', total: 1.5,
        obs: 'Pitch co-avaliado com PI. Aqui o DT olha a narrativa e o processo; o PI olha viabilidade e entrega.',
        criterios: [
          { id: 'clareza-narrativa', nome: 'Clareza da Narrativa', max: 0.5, itens: ['A narrativa conecta problema → solução de forma clara','Quem assiste entende o problema antes de ver a solução'] },
          { id: 'storytelling-empatia', nome: 'Storytelling e Empatia', max: 0.5, itens: ['A história do usuário aparece no pitch','Há conexão com a dor real, não só apresentação técnica'] },
          { id: 'coerencia-processo', nome: 'Coerência com o Processo', max: 0.5, itens: ['A solução é consequência da imersão e da ideação','Dá pra ver que a solução não saiu do nada'] },
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
        nome: 'Fase 3 — Ideação (lente DCU)', total: 2.5,
        criterios: [
          { id: 'solucao-centrada-usuario', nome: 'Solução Centrada no Usuário', max: 1.0, itens: ['A solução responde diretamente às dores da persona','As decisões de ideação são justificadas pelo usuário, não por preferência do grupo','Há conexão clara entre o problema do usuário e a solução proposta'] },
          { id: 'jornada-ux', nome: 'Jornada Futura — Qualidade UX', max: 1.0, arquivos: ['ideacao-jornada-futura_A.pdf'], itens: ['A jornada com a solução mostra como a experiência do usuário melhora','Identifica os momentos-chave da interação','Aponta onde a solução resolve as dores mapeadas'] },
          { id: 'documentos-clareza', nome: 'Documentos de Ideação — Clareza Visual', max: 0.5, itens: ['Os documentos estão bem organizados e legíveis','Hierarquia visual clara entre seções e conteúdo'] },
        ],
      },
      {
        nome: 'Fase 4 — Protótipo de Baixa Fidelidade (lente DCU)', total: 5.0,
        obs: 'Protótipo de papel. Avalia-se UX e organização — não estética (sem cor/tipografia).',
        criterios: [
          { id: 'fluxo-ai', nome: 'Fluxo e Arquitetura de Informação', max: 1.5, arquivos: ['prototipo-baixa_A.pdf'], itens: ['A navegação entre as telas faz sentido — sem becos sem saída','As telas estão na ordem do caminho que o usuário percorre','O fluxo principal está claro e completo'] },
          { id: 'hierarquia-gestalt', nome: 'Hierarquia e Organização (Gestalt)', max: 1.5, itens: ['Aplica proximidade: o que é relacionado está agrupado','Região comum e similaridade usadas para organizar a tela','Alinhamento consistente — a tela não fica bagunçada','Hierarquia clara: o mais importante salta primeiro'] },
          { id: 'usabilidade-clareza', nome: 'Usabilidade e Clareza das Telas', max: 1.0, itens: ['Botões e elementos interativos são reconhecíveis','As telas são legíveis e fáceis de entender','Rótulos e ações estão claros'] },
          { id: 'cobertura-telas', nome: 'Cobertura das Telas-Chave', max: 1.0, itens: ['As telas principais da solução estão prototipadas','O protótipo cobre o que a solução promete resolver','As fotos estão nítidas e bem iluminadas'] },
        ],
      },
    ],
  },
  {
    id: 'pi', nome: 'Projeto Integrador I', total: 10,
    cor: '#BA7517', corBg: 'rgba(186,117,23,0.08)', corBorder: 'rgba(186,117,23,0.3)',
    fases: [
      {
        nome: 'Análise Mercadológica', total: 2.5,
        criterios: [
          { id: 'benchmarking-desk', nome: 'Benchmarking + Pesquisa Desk', max: 0.75, arquivos: ['pi-benchmarking_A.pdf'], itens: ['Identifica concorrentes diretos e indiretos','Tabela comparativa com pontos fortes e fracos','Pesquisa em fontes secundárias confiáveis','Aponta as lacunas do mercado'] },
          { id: 'lean-canvas', nome: 'Lean Canvas', max: 0.75, arquivos: ['pi-lean-canvas_A.pdf'], itens: ['O quadro está preenchido: problema, proposta de valor, segmento, métricas','A proposta de valor é coerente com a solução','Demonstra que o grupo pensou na viabilidade'] },
          { id: 'inovacao-diferencial', nome: 'Inovação / Diferencial Competitivo', max: 1.0, itens: ['Deixa claro o que torna a solução diferente do que já existe','O diferencial decorre do benchmarking — não é achismo','A solução não é a mais óbvia para aquele ODS'] },
        ],
      },
      {
        nome: 'Protótipo de Baixa Fidelidade (lente PI)', total: 5.0,
        obs: 'Mesmo protótipo de papel da DCU. Aqui o PI olha a solução como produto.',
        criterios: [
          { id: 'aderencia-problema-solucao', nome: 'Aderência Problema ↔ Solução', max: 2.0, arquivos: ['prototipo-baixa_A.pdf'], itens: ['O protótipo entrega o que a solução prometeu resolver','As telas atacam diretamente a dor da persona','Não há funcionalidade solta sem relação com o problema'] },
          { id: 'coerencia-proposta-valor', nome: 'Coerência com a Proposta de Valor', max: 1.5, itens: ['O que foi vendido na análise mercadológica aparece no produto','O protótipo reflete o Lean Canvas','A solução é viável dentro do que foi proposto'] },
          { id: 'fluxo-completo', nome: 'Fluxo Principal Completo', max: 1.5, itens: ['O caminho essencial do usuário existe de ponta a ponta','Dá pra navegar do início até resolver o problema','Não falta nenhuma tela crítica do fluxo principal'] },
        ],
      },
      {
        nome: 'Pitch (lente PI)', total: 2.5,
        obs: 'Pitch co-avaliado com DT. Aqui o PI olha viabilidade e entrega; o DT olha narrativa e processo. Até 10 min, no máx. 3 apresentam.',
        criterios: [
          { id: 'demonstracao-solucao', nome: 'Demonstração da Solução', max: 1.0, itens: ['Mostram o protótipo dentro do fluxo (fotos projetadas em sequência)','A demonstração deixa claro como a solução funciona','O usuário-tipo é levado pelo caminho principal'] },
          { id: 'argumentacao-viabilidade', nome: 'Argumentação de Diferencial e Viabilidade', max: 1.0, itens: ['Defendem por que a solução é diferente/melhor que a concorrência','Conectam com mercado e Lean Canvas','A viabilidade é argumentada, não só afirmada'] },
          { id: 'comunicacao-tempo', nome: 'Comunicação, Postura e Tempo', max: 0.5, itens: ['Apresentam com clareza e segurança — não leem o slide','Respeitam os 10 minutos','Até 3 apresentam, mas todos participaram da preparação'] },
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