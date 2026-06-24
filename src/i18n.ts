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
      headline: ['A plataforma que', 'te faz conhecer', 'seu cliente.'],
      sub: 'Diagnóstico gratuito do seu site + varredura da sua presença digital = plano de ação concreto para vender mais.',
      project: ['SalesBoost', 'Plataforma'],
      typeLabel: 'Modelo:',
      typeValue: 'Automatizado',
      sideLabels: ['Análise', 'Reviews', 'Preços', 'Ação'],
      bgWord: 'VENDAS',
      date: 'Jun 11',
      year: '2026',
      location: 'São Paulo, Brasil',
      reportTitle: 'Relatório Mensal',
      scoreLabel: 'Score de Saúde',
      reportItems: [
        { icon: '⭐', text: 'Atendimento elogiado' },
        { icon: '⚡', text: 'Tempo de espera alto' },
        { icon: '💡', text: 'Preço acima do mercado' },
      ],
      reportCta: 'Ver 3 Ações do Mês →',
    },
    stats: {
      badge: 'Resultados comprovados',
      intro: 'Somos uma plataforma de inteligência de vendas focada em transformar dados de reputação e mercado em ações concretas para restaurantes.',
      items: [
        { value: '38%', label: 'Aumento de faturamento' },
        { value: '2.4×', label: 'Mais ações tomadas' },
        { value: '24h', label: 'Primeiro relatório' },
      ],
    },
    features: {
      badge: '3 pilares de inteligência',
      title1: 'Os 3',
      title2: 'Pilares',
      pillars: [
        {
          num: '01',
          title: 'Reputação',
          desc: 'Análise de reviews do Google com IA. Identifica os temas que amam e os que afastam clientes do seu restaurante.',
        },
        {
          num: '02',
          title: 'Inteligência Competitiva',
          desc: 'Mapeia concorrentes num raio de 2km: preços, notas e volume de reviews — atualizado quinzenalmente.',
        },
        {
          num: '03',
          title: 'Perfil de Cliente',
          desc: 'QR code na mesa → pesquisa de 30s → dados concretos de quem é e o que quer seu cliente.',
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
          title: 'Cadastre seu restaurante',
          desc: 'Busque pelo nome. Conectamos automaticamente com o Google Places em segundos.',
        },
        {
          num: '02',
          title: 'IA analisa tudo',
          desc: 'Reviews, concorrentes e preços — processados automaticamente toda semana.',
        },
        {
          num: '03',
          title: 'Receba o relatório',
          desc: 'PDF mensal por email + dashboard web. Cada insight vem com uma ação concreta.',
        },
      ],
    },
    showcase: {
      badge: 'Plataforma completa',
      title1: 'Tudo que você precisa,',
      title2: 'onde você estiver.',
      sub: 'Dashboard web em tempo real, relatório PDF mensal e alertas automáticos — tudo integrado numa plataforma feita para donos de negócio.',
      features: [
        'Dashboard web em tempo real',
        'Relatório PDF mensal completo',
        'Alertas de reviews 1 estrela',
        'Análise de concorrentes automática',
      ],
    },
    statement: {
      eyebrow: 'O produto',
      line1: 'Não aceite dashboards.',
      line2: 'Exija um plano de ação.',
      sub: 'Cada relatório mensal vem com 3 ações priorizadas — o que fazer esta semana, não um gráfico para ignorar.',
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
              features: ['50 posts por mês com imagem IA', 'Tudo do Pro', 'Multi-agente (7 especialistas)', 'Relatório white-label', 'Suporte dedicado'],
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
              features: ['50 posts/month with AI image', 'Everything in Pro', 'Multi-agent (7 specialists)', 'White-label report', 'Dedicated support'],
            },
          ],
        },
      },
    },
    footer: {
      tagline: 'Consultoria de vendas automatizada para restaurantes.',
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
        { label: 'Segment', value: 'Restaurants' },
        { label: 'Results in', value: '24 hours' },
      ],
      headline: ['Sales intelligence', 'for your', 'restaurant.'],
      sub: 'Transforms Google reviews, competitor prices, and customer profiles into a concrete monthly action plan.',
      project: ['SalesBoost', 'Platform'],
      typeLabel: 'Model:',
      typeValue: 'Automated',
      sideLabels: ['Analysis', 'Reviews', 'Prices', 'Action'],
      bgWord: 'SALES',
      date: 'Jun 11',
      year: '2026',
      location: 'São Paulo, Brasil',
      reportTitle: 'Monthly Report',
      scoreLabel: 'Health Score',
      reportItems: [
        { icon: '⭐', text: 'Excellent service' },
        { icon: '⚡', text: 'High wait time' },
        { icon: '💡', text: 'Price above market' },
      ],
      reportCta: 'See 3 Monthly Actions →',
    },
    stats: {
      badge: 'Proven results',
      intro: 'We are a sales intelligence platform focused on transforming reputation and market data into concrete actions for restaurant owners.',
      items: [
        { value: '38%', label: 'Revenue growth' },
        { value: '2.4×', label: 'More actions taken' },
        { value: '24h', label: 'First report ready' },
      ],
    },
    features: {
      badge: '3 pillars of intelligence',
      title1: 'The 3',
      title2: 'Pillars',
      pillars: [
        {
          num: '01',
          title: 'Reputation',
          desc: 'Google review analysis with AI. Identifies what customers love and what drives them away from your restaurant.',
        },
        {
          num: '02',
          title: 'Competitive Intelligence',
          desc: 'Maps competitors within 2km: prices, ratings, and review volume — updated every two weeks.',
        },
        {
          num: '03',
          title: 'Customer Profile',
          desc: 'QR code at the table → 30s survey → concrete data on who your customers are and what they want.',
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
          title: 'Register your restaurant',
          desc: 'Search by name. We automatically connect with Google Places in seconds.',
        },
        {
          num: '02',
          title: 'AI analyzes everything',
          desc: 'Reviews, competitors, and prices — processed automatically every week.',
        },
        {
          num: '03',
          title: 'Receive the report',
          desc: 'Monthly PDF by email + web dashboard. Each insight comes with a concrete action.',
        },
      ],
    },
    showcase: {
      badge: 'Full platform',
      title1: 'Everything you need,',
      title2: 'wherever you are.',
      sub: 'Real-time web dashboard, monthly PDF report, and automatic alerts — all integrated in a platform built for restaurant owners.',
      features: [
        'Real-time web dashboard',
        'Full monthly PDF report',
        '1-star review alerts',
        'Automatic competitor analysis',
      ],
    },
    statement: {
      eyebrow: 'The product',
      line1: "Don't accept dashboards.",
      line2: 'Demand an action plan.',
      sub: 'Each monthly report comes with 3 prioritized actions — what to do this week, not a chart to ignore.',
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
              features: ['50 posts/month with AI image', 'Everything in Pro', 'Multi-agent (7 specialists)', 'White-label report', 'Dedicated support'],
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
              features: ['50 posts/month with AI image', 'Everything in Pro', 'Multi-agent (7 specialists)', 'White-label report', 'Dedicated support'],
            },
          ],
        },
      },
    },
    footer: {
      tagline: 'Automated sales consulting for restaurants.',
      copy: '© 2026 SalesBoost. All rights reserved.',
    },
  },
}
