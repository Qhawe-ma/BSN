import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import type { Connect } from 'vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const uploadsDir = path.resolve(__dirname, 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const commentsDir = path.resolve(__dirname, 'uploads', 'comments');
  if (!fs.existsSync(commentsDir)) {
    fs.mkdirSync(commentsDir, { recursive: true });
  }

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
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use('/uploads', ((req, res, next) => {
            const filePath = path.join(__dirname, req.url || '');
            if (fs.existsSync(filePath)) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
              };
              res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          }) as Connect.NextHandleFunction);

          server.middlewares.use('/api/upload/avatar', ((req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method not allowed');
              return;
            }

            const boundary = req.headers['content-type']?.split('boundary=')[1];
            if (!boundary) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No boundary found' }));
              return;
            }

            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                const boundaryBuffer = Buffer.from(`--${boundary}`);

                const parts = [];
                let start = 0;
                let idx;

                while ((idx = buffer.indexOf(boundaryBuffer, start)) !== -1) {
                  if (start > 0) {
                    parts.push(buffer.slice(start, idx - 2));
                  }
                  start = idx + boundaryBuffer.length + 2;
                }

                for (const part of parts) {
                  const headerEnd = part.indexOf('\r\n\r\n');
                  if (headerEnd === -1) continue;

                  const headers = part.slice(0, headerEnd).toString();
                  const filenameMatch = headers.match(/filename="([^"]+)"/);

                  if (filenameMatch) {
                    const originalFilename = filenameMatch[1];
                    const ext = path.extname(originalFilename).toLowerCase();
                    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

                    if (!allowedExts.includes(ext)) {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Invalid file type' }));
                      return;
                    }

                    const fileContent = part.slice(headerEnd + 4);
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const filename = `avatar-${uniqueSuffix}${ext}`;
                    const filePath = path.join(uploadsDir, filename);

                    fs.writeFileSync(filePath, fileContent);

                    const protocol = req.headers['x-forwarded-proto'] || 'https';
                    const host = req.headers['x-forwarded-host'] || req.headers.host;
                    const avatarUrl = `${protocol}://${host}/uploads/avatars/${filename}`;

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, avatarUrl, filename }));
                    return;
                  }
                }

                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No file found in request' }));
              } catch (error) {
                console.error('Upload error:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Upload failed' }));
              }
            });
          }) as Connect.NextHandleFunction);

          server.middlewares.use('/api/upload/comment-image', ((req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method not allowed');
              return;
            }

            const boundary = req.headers['content-type']?.split('boundary=')[1];
            if (!boundary) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No boundary found', success: false }));
              return;
            }

            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                const boundaryBuffer = Buffer.from(`--${boundary}`);

                const parts = [];
                let start = 0;
                let idx;

                while ((idx = buffer.indexOf(boundaryBuffer, start)) !== -1) {
                  if (start > 0) {
                    parts.push(buffer.slice(start, idx - 2));
                  }
                  start = idx + boundaryBuffer.length + 2;
                }

                for (const part of parts) {
                  const headerEnd = part.indexOf('\r\n\r\n');
                  if (headerEnd === -1) continue;

                  const headers = part.slice(0, headerEnd).toString();
                  const filenameMatch = headers.match(/filename="([^"]+)"/);

                  if (filenameMatch) {
                    const originalFilename = filenameMatch[1];
                    const ext = path.extname(originalFilename).toLowerCase();
                    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

                    if (!allowedExts.includes(ext)) {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Invalid file type', success: false }));
                      return;
                    }

                    const fileContent = part.slice(headerEnd + 4);
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const filename = `comment-${uniqueSuffix}${ext}`;
                    const filePath = path.join(commentsDir, filename);

                    fs.writeFileSync(filePath, fileContent);

                    const protocol = req.headers['x-forwarded-proto'] || 'https';
                    const host = req.headers['x-forwarded-host'] || req.headers.host;
                    const imageUrl = `${protocol}://${host}/uploads/comments/${filename}`;

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, imageUrl, filename }));
                    return;
                  }
                }

                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No file found in request', success: false }));
              } catch (error) {
                console.error('Comment image upload error:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Upload failed', success: false }));
              }
            });
          }) as Connect.NextHandleFunction);

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
        '@metaplex-foundation/js': path.resolve(__dirname, 'node_modules/@metaplex-foundation/js/dist/cjs/index.cjs'),
        '@particle-network/auth': path.resolve(__dirname, 'node_modules/@particle-network/auth/es/index.js'),
        'core-util-is': path.resolve(__dirname, 'node_modules/core-util-is/lib/util.js'),
        'proxy-compare': path.resolve(__dirname, 'node_modules/proxy-compare/dist/cjs/index.js'),
        'derive-valtio': path.resolve(__dirname, 'node_modules/derive-valtio/dist/cjs/index.js'),
        '@solana/spl-token': path.resolve(__dirname, 'node_modules/@solana/spl-token/lib/esm/index.js'),
        'arbundles/web': path.resolve(__dirname, 'node_modules/arbundles/build/node/cjs/webIndex.js'),
        'arbundles': path.resolve(__dirname, 'node_modules/arbundles/build/node/cjs/index.js'),
        'stream/promises': path.resolve(__dirname, 'node_modules/readable-stream/lib/stream/promises.js'),
        'readable-stream': path.resolve(__dirname, 'node_modules/readable-stream'),
        'tmp': path.resolve(__dirname, 'node_modules/tmp/lib/tmp.js'),
        '@particle-network/chains': path.resolve(__dirname, 'node_modules/@particle-network/chains/esm/index.js'),
        '@particle-network/crypto': path.resolve(__dirname, 'node_modules/@particle-network/crypto/es/index.js'),
      }
    },
    optimizeDeps: {
      include: [
        '@metaplex-foundation/js',
        '@solana/web3.js',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-base',
        '@solana/spl-token',
        'core-util-is',
        'proxy-compare',
        'derive-valtio',
        '@particle-network/auth',
        '@particle-network/chains',
        '@particle-network/crypto',
        'buffer',
        'process',
        'arbundles',
        'tmp',
        'readable-stream'
      ],
      exclude: [],
      esbuildOptions: {
        target: 'esnext',
        plugins: [],
      }
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        external: []
      }
    }
  };
});
