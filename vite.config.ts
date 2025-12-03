import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      publicDir: 'public',
      server: {
        port: 5000,
        host: '0.0.0.0',
        strictPort: true,
        hmr: {
          clientPort: 5000,
        },
        allowedHosts: true,
      },
      plugins: [
        react(),
        {
          name: 'admin-api',
          configureServer(server) {
            server.middlewares.use('/api/admin/verify', ((req, res) => {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk: Buffer) => {
                  body += chunk.toString();
                });
                req.on('end', () => {
                  try {
                    const { password } = JSON.parse(body);
                    const adminPassword = process.env.ADMIN_PASSWORD;
                    
                    if (!adminPassword) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Admin password not configured' }));
                      return;
                    }
                    
                    if (password === adminPassword) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true }));
                    } else {
                      res.statusCode = 401;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Invalid password' }));
                    }
                  } catch (e) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Invalid request' }));
                  }
                });
              } else {
                res.statusCode = 405;
                res.end('Method not allowed');
              }
            }) as Connect.NextHandleFunction);

            server.middlewares.use('/api/admin/verify-badge-password', ((req, res) => {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk: Buffer) => {
                  body += chunk.toString();
                });
                req.on('end', () => {
                  try {
                    const { password } = JSON.parse(body);
                    const badgePassword = process.env.BADGE_PASSWORD;
                    
                    if (!badgePassword) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Badge password not configured' }));
                      return;
                    }
                    
                    if (password === badgePassword) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true }));
                    } else {
                      res.statusCode = 401;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Invalid badge password' }));
                    }
                  } catch (e) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Invalid request' }));
                  }
                });
              } else {
                res.statusCode = 405;
                res.end('Method not allowed');
              }
            }) as Connect.NextHandleFunction);
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@assets': path.resolve(__dirname, 'attached_assets'),
        }
      }
    };
});
