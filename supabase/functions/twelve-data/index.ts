// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint') || 'quote'
    const symbol = url.searchParams.get('symbol') || 'EUR/USD'
    const interval = url.searchParams.get('interval') || '1h'
    const outputsize = url.searchParams.get('outputsize') || '60'

    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing TWELVE_DATA_API_KEY secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetUrl = `https://api.twelvedata.com/${endpoint}?symbol=${encodeURIComponent(
      symbol
    )}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&apikey=${apiKey}`

    const res = await fetch(targetUrl)
    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
