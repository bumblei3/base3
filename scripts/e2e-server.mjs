import { createServer } from 'http';
import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join, extname } from 'path';

const root = process.argv[2] || '.';
const port = parseInt(process.argv[3] || '3000', 10);

// Copy index.{game}.html to index.html if needed
const indexHtml = join(root, 'index.html');
const gameHtml = join(root, 'index.schach9x9.html');
if (!existsSync(indexHtml) && existsSync(gameHtml)) {
  copyFileSync(gameHtml, indexHtml);
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = createServer((req, res) => {
  let filePath = join(root, req.url === '/' ? 'index.html' : req.url);

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (filePath.endsWith('/')) {
    filePath += 'index.html';
  }

  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end('Server Error');
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
