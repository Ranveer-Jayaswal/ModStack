import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")
  if (!signature) return new Response("No signature", { status: 400 })

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
    )

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const session = event.data.object as any
    const email = session.customer_details?.email || session.email || (await stripe.customers.retrieve(session.customer as string).then(c => (c as any).email))

    if (!email) return new Response("No email found", { status: 400 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .single()

    if (!profile) return new Response("User not found", { status: 404 })

    let isPro = false
    if (["checkout.session.completed", "invoice.payment_succeeded", "customer.subscription.created", "customer.subscription.updated"].includes(event.type)) {
      isPro = true
    } else if (event.type === "customer.subscription.deleted") {
      isPro = false
    } else {
      return new Response("Event not handled", { status: 200 })
    }

    await supabase.from("profiles").update({ is_pro: isPro }).eq("id", profile.id)

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
