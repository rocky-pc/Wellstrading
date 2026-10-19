import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // Custom dev-server middleware for Twelve Data API proxy to protect API key
      {
        name: 'twelve-data-proxy-middleware',
        configureServer(server) {
          server.middlewares.use('/api/twelve-data', async (req, res) => {
            try {
              const url = new URL(req.url || '', `http://${req.headers.host}`);
              const endpoint = url.searchParams.get('endpoint') || 'quote';
              const symbol = url.searchParams.get('symbol') || 'EUR/USD';
              const interval = url.searchParams.get('interval') || '1h';
              const outputsize = url.searchParams.get('outputsize') || '60';

              const apiKey =
                env.TWELVE_DATA_API_KEY ||
                process.env.TWELVE_DATA_API_KEY ||
                'ea779f93ae4044cc90d1de33ef0936f6';

              const targetUrl = `https://api.twelvedata.com/${endpoint}?symbol=${encodeURIComponent(
                symbol
              )}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&apikey=${apiKey}`;

              const response = await fetch(targetUrl);
              const data = await response.json();

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['lightweight-charts'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
