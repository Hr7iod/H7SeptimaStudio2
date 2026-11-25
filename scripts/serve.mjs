import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/api/brief') {
      const upstream = http.request({
        hostname: '127.0.0.1', port: 4174, path, method: req.method,
        headers: { ...req.headers, 'x-real-ip': req.socket.remoteAddress }
      }, (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
      upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, message: 'Не удалось отправить заявку. Запустите почтовый обработчик или напишите на info@h7septima.ru.' }));
      });
      upstream.setTimeout(60000, () => upstream.destroy());
      req.pipe(upstream);
      return;
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => process.stdout.write(`Local: http://127.0.0.1:${port}\n`));
