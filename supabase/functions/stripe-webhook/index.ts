import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const PLAN_PRICE_IDS: Record<string, string> = {}

function planFromPriceId(priceId: string): string {
  const basic = Deno.env.get('STRIPE_PRICE_BASIC')
  const pro = Deno.env.get('STRIPE_PRICE_PRO')
  if (priceId === pro) return 'pro'
  if (priceId === basic) return 'basic'
  return 'free'
}

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe não configurado', { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const body = await req.text()
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
  const admin = createClient(supabaseUrl, serviceKey)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId = session.client_reference_id
        if (!companyId || session.mode !== 'subscription') break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const plan = planFromPriceId(priceId)

        await admin.from('companies').update({
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
        }).eq('id', companyId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id ?? ''
        const plan = planFromPriceId(priceId)
        const status = sub.status

        // Only keep plan active if subscription is active/trialing
        const activePlan = ['active', 'trialing'].includes(status) ? plan : 'free'

        await admin.from('companies').update({ plan: activePlan })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await admin.from('companies')
          .update({ plan: 'free', stripe_subscription_id: null })
          .eq('stripe_subscription_id', sub.id)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})

// Silence unused import warning
void PLAN_PRICE_IDS
