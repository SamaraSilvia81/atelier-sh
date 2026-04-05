const KEY  = import.meta.env.VITE_TRELLO_API_KEY
const BASE = 'https://api.trello.com/1'

function getToken() {
  return localStorage.getItem('atelier_trello_token') || ''
}

function auth(token) { return `key=${KEY}&token=${token || getToken()}` }

export function getTrelloAuthUrl() {
  return `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=${KEY}&name=Atelier.sh&return_url=${encodeURIComponent(window.location.origin)}`
}

export async function fetchWorkspaces(token) {
  try {
    const res = await fetch(`${BASE}/members/me/organizations?${auth(token)}&fields=id,displayName,name`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function fetchBoards(token, workspaceId) {
  try {
    const url = workspaceId
      ? `${BASE}/organizations/${workspaceId}/boards?${auth(token)}&fields=id,name,url,dateLastActivity,closed&filter=open`
      : `${BASE}/members/me/boards?${auth(token)}&fields=id,name,url,dateLastActivity,closed&filter=open`
    const res = await fetch(url)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function fetchBoardLists(token, boardId) {
  try {
    const res = await fetch(`${BASE}/boards/${boardId}/lists?${auth(token)}&fields=id,name,pos&cards=open&card_fields=id,name,desc,due,labels,idMembers,url,dateLastActivity`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function createTrelloCard(token, { listId, name, desc, due }) {
  try {
    const params = new URLSearchParams({ key: KEY, token: token || getToken(), name, idList: listId })
    if (desc) params.append('desc', desc)
    if (due)  params.append('due', due)
    const res = await fetch(`${BASE}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
    if (!res.ok) return { error: 'Erro ao criar card no Trello' }
    return { data: await res.json() }
  } catch (e) { return { error: e.message } }
}

export function trelloTimeAgo(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 7)  return `há ${d} dias`
  return `há ${Math.floor(d / 7)} sem.`
}
