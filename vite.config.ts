import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    const uploadsDir = path.resolve(__dirname, 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
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
