export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'quote';
    const symbol = url.searchParams.get('symbol') || 'EUR/USD';
    const interval = url.searchParams.get('interval') || '1h';
    const outputsize = url.searchParams.get('outputsize') || '60';

    // Server-side environment variable (Never exposed in frontend bundle)
    const apiKey = process.env.TWELVE_DATA_API_KEY || 'ea779f93ae4044cc90d1de33ef0936f6';

    const targetUrl = `https://api.twelvedata.com/${endpoint}?symbol=${encodeURIComponent(
      symbol
    )}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&apikey=${apiKey}`;

    const res = await fetch(targetUrl);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error fetching market data from Twelve Data' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
