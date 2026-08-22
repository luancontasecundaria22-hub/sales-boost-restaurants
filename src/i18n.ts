export type Lang = 'pt' | 'en'

export const t = {
  pt: {
    nav: {
      features: 'Funcionalidades',
      how: 'Como funciona',
      pricing: 'Preços',
      cta: 'Começar grátis',
    },
    hero: {
      meta: [
        { label: 'Produto', value: 'Plataforma SaaS' },
        { label: 'Segmento', value: 'Qualquer negócio' },
        { label: 'Resultado em', value: '24 horas' },
      ],
      headline: ['A IA que cresce', 'o seu negócio.', 'Você só aprova.'],
      sub: 'Jarvis, seu assistente de voz com IA, cuida do marketing e das vendas: cria posts, responde avaliações e recupera vendas paradas — com dados reais do seu cliente e sempre esperando o seu OK.',
      project: ['SalesBoost', 'Plataforma'],
      typeLabel: 'Modelo:',
      typeValue: 'Automatizado',
      sideLabels: ['Marketing', 'Vendas', 'Reputação', 'Voz'],
      bgWord: 'VENDAS',
      date: 'Jun 11',
      year: '2026',
      location: 'São Paulo, Brasil',
      reportTitle: 'Relatório Mensal',
      scoreLabel: 'Score de Saúde',
      reportItems: [
        { icon: '⭐', text: 'Clientes elogiam você' },
        { icon: '⚡', text: '3 leads sem resposta' },
        { icon: '💡', text: 'Oportunidade de venda' },
      ],
      reportCta: 'Ver 3 Ações do Mês →',
    },
    stats: {
      badge: 'Resultados comprovados',
      intro: 'Somos a plataforma de crescimento que trabalha sozinha pelo seu negócio: transforma dados reais do seu cliente em posts, respostas e vendas — no piloto automático, sempre com a sua aprovação.',
      items: [
        { value: '38%', label: 'Mais faturamento' },
        { value: '2.4×', label: 'Mais ações executadas' },
        { value: '24h', label: 'Primeiro resultado' },
      ],
    },
    features: {
      badge: '3 pilares do produto',
      title1: 'Os 3',
      title2: 'Pilares',
      pillars: [
        {
          num: '01',
          title: 'Jarvis, seu assistente de voz',
          desc: 'Fale por voz e a IA executa: cria posts, responde avaliações e monta campanhas. O primeiro assistente que faz seu marketing por comando de voz, em português.',
        },
        {
          num: '02',
          title: 'Conhece seu cliente de verdade',
          desc: 'Varre avaliações, redes sociais e o Google Maps com IA e monta o perfil real de quem compra de você — e do que faz vender mais.',
        },
        {
          num: '03',
          title: 'Recupera vendas paradas',
          desc: 'Encontra a receita parada na mesa — lead sem resposta, avaliação negativa, agendamento não confirmado — e resolve com um clique.',
        },
      ],
    },
    how: {
      badge: 'Simples assim',
      title1: 'Como',
      title2: 'funciona',
      steps: [
        {
          num: '01',
          title: 'Conecte seu negócio',
          desc: 'Busque pelo nome. Conectamos Google, Instagram e suas avaliações automaticamente em segundos.',
        },
        {
          num: '02',
          title: 'A IA trabalha por você',
          desc: 'O Jarvis analisa seus dados e já deixa posts, respostas e campanhas prontos — no piloto automático.',
        },
        {
          num: '03',
          title: 'Você aprova, ela executa',
          desc: 'Nada vai ao ar sem o seu OK. Aprove com um toque e o agente publica, responde e recupera vendas por você.',
        },
      ],
    },
    showcase: {
      badge: 'Plataforma completa',
      title1: 'Tudo que você precisa,',
      title2: 'onde você estiver.',
      sub: 'Fale com o Jarvis por voz, acompanhe tudo no dashboard e receba alertas automáticos — um time de marketing e vendas com IA, no seu bolso.',
      features: [
        'Jarvis — assistente de voz com IA',
        'Posts e campanhas prontos pra você aprovar',
        'Alertas de avaliações e leads em tempo real',
        'Dashboard e relatório mensal completos',
      ],
    },
    statement: {
      eyebrow: 'O produto',
      line1: 'Chega de relatórios.',
      line2: 'Tenha uma IA que executa.',
      sub: 'O SalesBoost não te entrega mais um gráfico pra ignorar. Ele cria, responde e recupera vendas por você — você só aprova.',
      cta: 'Ver relatório demo',
    },
    pricing: {
      badge: 'Preços simples',
      title1: 'Planos para',
      title2: 'todo tamanho',
      popular: 'Mais popular',
      cta: 'Começar agora',
      regions: {
        br: {
          label: '🇧🇷 Brasil',
          plans: [
            {
              name: 'Basic',
              price: 'R$197',
              period: '/mês',
              popular: false,
              features: ['15 posts por mês com imagem IA', 'Jarvis — assistente de voz', 'Diagnóstico de site', 'Suporte por e-mail'],
            },
            {
              name: 'Pro',
              price: 'R$397',
              period: '/mês',
              popular: true,
              features: ['35 posts por mês com imagem IA', 'Tudo do Basic', 'Revenue Opportunities', 'Respostas automáticas a reviews', 'Relatórios mensais em PDF'],
            },
            {
              name: 'Ultra',
              price: 'R$697',
              period: '/mês',
              popular: false,
              features: ['50 posts por mês com imagem IA', 'Tudo do Pro', 'Automação 24/7 do agente', 'Relatório white-label', 'Suporte dedicado'],
            },
          ],
        },
        us: {
          label: '🇺🇸 USA',
          plans: [
            {
              name: 'Basic',
              price: '$97',
              period: '/mo',
              popular: false,
              features: ['15 posts/month with AI image', 'Jarvis voice assistant', 'Website diagnosis', 'Email support'],
            },
            {
              name: 'Pro',
              price: '$197',
              period: '/mo',
              popular: true,
              features: ['35 posts/month with AI image', 'Everything in Basic', 'Revenue Opportunities', 'Automatic review replies', 'Monthly PDF reports'],
            },
            {
              name: 'Ultra',
              price: '$397',
              period: '/mo',
              popular: false,
              features: ['50 posts/month with AI image', 'Everything in Pro', '24/7 autonomous agent', 'White-label report', 'Dedicated support'],
            },
          ],
        },
      },
    },
    footer: {
      tagline: 'Seu gerente de crescimento com IA — marketing e vendas no piloto automático.',
      copy: '© 2026 SalesBoost. Todos os direitos reservados.',
    },
  },
  en: {
    nav: {
      features: 'Features',
      how: 'How it works',
      pricing: 'Pricing',
      cta: 'Start for free',
    },
    hero: {
      meta: [
        { label: 'Product', value: 'SaaS Platform' },
        { label: 'Segment', value: 'Any business' },
        { label: 'Results in', value: '24 hours' },
      ],
      headline: ['The AI that grows', 'your business.', 'You just approve.'],
      sub: 'Jarvis, your AI voice assistant, runs your marketing and sales: creates posts, replies to reviews, and recovers lost sales — with real data about your customers, always waiting for your OK.',
      project: ['SalesBoost', 'Platform'],
      typeLabel: 'Model:',
      typeValue: 'Automated',
      sideLabels: ['Marketing', 'Sales', 'Reputation', 'Voice'],
      bgWord: 'SALES',
      date: 'Jun 11',
      year: '2026',
      location: 'São Paulo, Brasil',
      reportTitle: 'Monthly Report',
      scoreLabel: 'Health Score',
      reportItems: [
        { icon: '⭐', text: 'Customers love you' },
        { icon: '⚡', text: '3 leads without a reply' },
        { icon: '💡', text: 'Sales opportunity' },
      ],
      reportCta: 'See 3 Monthly Actions →',
    },
    stats: {
      badge: 'Proven results',
      intro: 'We are the growth platform that works on its own for your business: it turns real customer data into posts, replies, and sales — on autopilot, always with your approval.',
      items: [
        { value: '38%', label: 'Revenue growth' },
        { value: '2.4×', label: 'More actions executed' },
        { value: '24h', label: 'First result' },
      ],
    },
    features: {
      badge: '3 pillars of the product',
      title1: 'The 3',
      title2: 'Pillars',
      pillars: [
        {
          num: '01',
          title: 'Jarvis, your voice assistant',
          desc: 'Speak and the AI executes: it creates posts, replies to reviews, and builds campaigns. The first assistant that runs your marketing by voice command.',
        },
        {
          num: '02',
          title: 'Truly knows your customer',
          desc: 'Scans reviews, social media, and Google Maps with AI to build the real profile of who buys from you — and what makes them buy more.',
        },
        {
          num: '03',
          title: 'Recovers lost sales',
          desc: 'Finds the revenue left on the table — unanswered leads, negative reviews, unconfirmed bookings — and resolves it in one click.',
        },
      ],
    },
    how: {
      badge: 'That simple',
      title1: 'How it',
      title2: 'works',
      steps: [
        {
          num: '01',
          title: 'Connect your business',
          desc: 'Search by name. We automatically connect Google, Instagram, and your reviews in seconds.',
        },
        {
          num: '02',
          title: 'The AI works for you',
          desc: 'Jarvis analyzes your data and gets posts, replies, and campaigns ready — on autopilot.',
        },
        {
          num: '03',
          title: 'You approve, it executes',
          desc: 'Nothing goes live without your OK. Approve with one tap and the agent publishes, replies, and recovers sales for you.',
        },
      ],
    },
    showcase: {
      badge: 'Full platform',
      title1: 'Everything you need,',
      title2: 'wherever you are.',
      sub: 'Talk to Jarvis by voice, track everything on the dashboard, and get automatic alerts — an AI marketing and sales team, in your pocket.',
      features: [
        'Jarvis — AI voice assistant',
        'Posts and campaigns ready to approve',
        'Real-time review and lead alerts',
        'Full dashboard and monthly report',
      ],
    },
    statement: {
      eyebrow: 'The product',
      line1: 'No more reports.',
      line2: 'Get an AI that executes.',
      sub: "SalesBoost won't hand you another chart to ignore. It creates, replies, and recovers sales for you — you just approve.",
      cta: 'See demo report',
    },
    pricing: {
      badge: 'Simple pricing',
      title1: 'Plans for',
      title2: 'every size',
      popular: 'Most popular',
      cta: 'Start now',
      regions: {
        br: {
          label: '🇧🇷 Brasil',
          plans: [
            {
              name: 'Basic',
              price: 'R$197',
              period: '/mês',
              popular: false,
              features: ['15 posts/month with AI image', 'Jarvis voice assistant', 'Website diagnosis', 'Email support'],
            },
            {
              name: 'Pro',
              price: 'R$397',
              period: '/mês',
              popular: true,
              features: ['35 posts/month with AI image', 'Everything in Basic', 'Revenue Opportunities', 'Automatic review replies', 'Monthly PDF reports'],
            },
            {
              name: 'Ultra',
              price: 'R$697',
              period: '/mês',
              popular: false,
              features: ['50 posts/month with AI image', 'Everything in Pro', '24/7 autonomous agent', 'White-label report', 'Dedicated support'],
            },
          ],
        },
        us: {
          label: '🇺🇸 USA',
          plans: [
            {
              name: 'Basic',
              price: '$97',
              period: '/mo',
              popular: false,
              features: ['15 posts/month with AI image', 'Jarvis voice assistant', 'Website diagnosis', 'Email support'],
            },
            {
              name: 'Pro',
              price: '$197',
              period: '/mo',
              popular: true,
              features: ['35 posts/month with AI image', 'Everything in Basic', 'Revenue Opportunities', 'Automatic review replies', 'Monthly PDF reports'],
            },
            {
              name: 'Ultra',
              price: '$397',
              period: '/mo',
              popular: false,
              features: ['50 posts/month with AI image', 'Everything in Pro', '24/7 autonomous agent', 'White-label report', 'Dedicated support'],
            },
          ],
        },
      },
    },
    footer: {
      tagline: 'Your AI growth manager — marketing and sales on autopilot.',
      copy: '© 2026 SalesBoost. All rights reserved.',
    },
  },
}
