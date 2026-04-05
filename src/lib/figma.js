const BASE = 'https://api.figma.com/v1'

function headers(token) {
  return { 'X-Figma-Token': token }
}

export function getFigmaFileId(url) {
  // Suporta: figma.com/file/ID/... e figma.com/design/ID/...
  const m = url?.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

export async function fetchFigmaFile(url, token) {
  const fileId = getFigmaFileId(url)
  if (!fileId || !token) return null
  try {
    const res = await fetch(`${BASE}/files/${fileId}?depth=1`, { headers: headers(token) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      name: data.name,
      lastModified: data.lastModified,
      thumbnailUrl: data.thumbnailUrl,
      version: data.version,
      pages: data.document?.children?.map(p => ({ id: p.id, name: p.name })) || [],
      url: `https://www.figma.com/file/${fileId}`,
    }
  } catch { return null }
}

export async function fetchFigmaComponents(url, token) {
  const fileId = getFigmaFileId(url)
  if (!fileId || !token) return []
  try {
    const res = await fetch(`${BASE}/files/${fileId}/components`, { headers: headers(token) })
    if (!res.ok) return []
    const data = await res.json()
    return data.meta?.components || []
  } catch { return [] }
}
