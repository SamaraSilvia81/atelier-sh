const BASE = 'https://api.github.com'

// Pega token: prioridade = token do grupo > token global (cache de sessão do Supabase)
function getToken(groupToken) {
  return groupToken || localStorage.getItem('atelier_github_token') || ''
}

function headers(token) {
  const h = { 'Accept': 'application/vnd.github+json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function fetchRepoInfo(repo, groupToken) {
  if (!repo) return null
  const token = getToken(groupToken)
  try {
    const [repoRes, commitsRes] = await Promise.all([
      fetch(`${BASE}/repos/${repo}`, { headers: headers(token) }),
      fetch(`${BASE}/repos/${repo}/commits?per_page=1`, { headers: headers(token) })
    ])
    if (!repoRes.ok) {
      return { error: repoRes.status === 404 ? 'not_found' : repoRes.status === 401 ? 'unauthorized' : 'error' }
    }
    const repoData = await repoRes.json()
    const commits  = commitsRes.ok ? await commitsRes.json() : []
    const c = commits[0] || null
    return {
      name:        repoData.name,
      description: repoData.description,
      private:     repoData.private,
      language:    repoData.language,
      url:         repoData.html_url,
      updatedAt:   repoData.pushed_at,
      lastCommit:  c ? {
        message: c.commit.message.split('\n')[0],
        author:  c.commit.author.name,
        date:    c.commit.author.date,
        sha:     c.sha.substring(0, 7),
        url:     c.html_url,
      } : null
    }
  } catch { return null }
}

export async function fetchAtas(repo, groupToken) {
  if (!repo) return []
  const token = getToken(groupToken)
  try {
    const res = await fetch(`${BASE}/repos/${repo}/contents/docs/atas`, { headers: headers(token) })
    if (!res.ok) return []
    const files = await res.json()
    return files
      .filter(f => f.name.endsWith('.md'))
      .map(f => ({ name: f.name, url: f.html_url, downloadUrl: f.download_url, sha: f.sha }))
      .sort((a, b) => b.name.localeCompare(a.name))
  } catch { return [] }
}

export async function fetchAllCommits(repo, perPage = 20, groupToken) {
  if (!repo) return []
  const token = getToken(groupToken)
  try {
    const res = await fetch(`${BASE}/repos/${repo}/commits?per_page=${perPage}`, { headers: headers(token) })
    if (!res.ok) return []
    return (await res.json()).map(c => ({
      sha:     c.sha.substring(0, 7),
      fullSha: c.sha,
      message: c.commit.message.split('\n')[0],
      author:  c.commit.author.name,
      date:    c.commit.author.date,
      url:     c.html_url,
    }))
  } catch { return [] }
}

export async function fetchIssues(repo, groupToken) {
  if (!repo) return []
  const token = getToken(groupToken)
  try {
    const res = await fetch(`${BASE}/repos/${repo}/issues?state=all&per_page=10`, { headers: headers(token) })
    if (!res.ok) return []
    return (await res.json()).filter(i => !i.pull_request)
  } catch { return [] }
}

export async function pushFileToRepo({ repo, path, content, message, groupToken }) {
  if (!repo || !path || !content) return { error: 'dados incompletos' }
  const token = getToken(groupToken)
  if (!token) return { error: 'GitHub token não configurado nas Configurações' }

  let sha = null
  try {
    const check = await fetch(`${BASE}/repos/${repo}/contents/${path}`, { headers: headers(token) })
    if (check.ok) { const d = await check.json(); sha = d.sha }
  } catch {}

  try {
    const res = await fetch(`${BASE}/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        ...(sha ? { sha } : {})
      })
    })
    if (!res.ok) { const e = await res.json(); return { error: e.message } }
    return { success: true, url: (await res.json()).content?.html_url }
  } catch (e) { return { error: e.message } }
}

export function timeAgo(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 7)  return `há ${d} dias`
  if (d < 30) return `há ${Math.floor(d / 7)} sem.`
  return `há ${Math.floor(d / 30)} meses`
}

export function isActive(iso) {
  return iso ? (Date.now() - new Date(iso)) < 14 * 86400000 : false
}
