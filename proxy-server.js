/**
 * atelier.sh — Proxy Server (ESM)
 * Remove X-Frame-Options e CSP para permitir qualquer site no Review Editor
 *
 * Rodar: node proxy-server.js
 * Porta: 3131
 * Uso:   http://localhost:3131/proxy?url=https://nubank.com.br
 */

import http  from 'http'
import https from 'https'
import { parse } from 'url'

const PORT = 3131

const BLOCKED_HEADERS = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
]

function fetchSite(targetUrl, res, depth = 0) {
  if (depth > 5) {
    res.writeHead(508); return res.end('Too many redirects')
  }

  const parsed    = parse(targetUrl)
  const isHttps   = parsed.protocol === 'https:'
  const requester = isHttps ? https : http

  const options = {
    hostname: parsed.hostname,
    port:     parsed.port || (isHttps ? 443 : 80),
    path:     parsed.path || '/',
    method:   'GET',
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
      'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Accept-Encoding': 'identity',
    },
    timeout: 15000,
  }

  const proxyReq = requester.request(options, proxyRes => {
    // Seguir redirects
    if ([301,302,303,307,308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
      const loc = proxyRes.headers.location
      const next = loc.startsWith('http') ? loc : `${parsed.protocol}//${parsed.hostname}${loc}`
      proxyRes.resume()
      return fetchSite(next, res, depth + 1)
    }

    // Filtrar headers bloqueantes
    const headers = { 'Access-Control-Allow-Origin': '*' }
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (!BLOCKED_HEADERS.includes(k.toLowerCase())) headers[k] = v
    }

    res.writeHead(proxyRes.statusCode, headers)

    // Reescrever HTML para injetar base tag
    const ct = proxyRes.headers['content-type'] || ''
    if (ct.includes('text/html')) {
      let body = ''
      proxyRes.setEncoding('utf8')
      proxyRes.on('data', chunk => body += chunk)
      proxyRes.on('end', () => {
        const base = `${parsed.protocol}//${parsed.hostname}`
        body = body.replace(/<head([^>]*)>/i, `<head$1><base href="${base}/">`)
        res.end(body)
      })
    } else {
      proxyRes.pipe(res)
    }
  })

  proxyReq.on('error', err => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })
  proxyReq.on('timeout', () => { proxyReq.destroy() })
  proxyReq.end()
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

  const parsed    = parse(req.url, true)
  const targetUrl = parsed.query.url

  if (parsed.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true }))
  }

  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Use: /proxy?url=https://site.com' }))
  }

  console.log(`[proxy] ${new Date().toLocaleTimeString()} → ${targetUrl}`)
  fetchSite(targetUrl, res)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n⬡ atelier.sh proxy rodando em http://localhost:${PORT}`)
  console.log(`  Uso: http://localhost:${PORT}/proxy?url=https://nubank.com.br\n`)
})
