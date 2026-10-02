const API_BASE = import.meta.env.VITE_API_BASE

export class ApiError extends Error {
  status: number
  code: string
  errors: Record<string, string[]>
  constructor(message: string, status: number, code: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

let token: string | null = localStorage.getItem('bakery-admart-token')

export function setToken(next: string | null) {
  token = next
  if (next) localStorage.setItem('bakery-admart-token', next)
  else localStorage.removeItem('bakery-admart-token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const text = await res.text()
  const body = text ? JSON.parse(text) : {}

  if (!res.ok) {
    throw new ApiError(body.message ?? `Request failed (${res.status})`, res.status, body.code ?? 'UNKNOWN', body.errors ?? {})
  }
  return body.data as T
}

/** Laravel's paginator shape — `data` holds the page of rows, the rest is pagination metadata. */
export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/** Unwraps a Laravel paginator response into a plain array, following every page — a single
 *  page (however large `per_page` is set) would otherwise silently drop rows past the limit
 *  once a list outgrows it, with no error to say so. */
export async function getAll<T>(path: string): Promise<T[]> {
  const result = await api.get<Paginated<T> | T[]>(path)
  if (Array.isArray(result)) return result

  const separator = path.includes('?') ? '&' : '?'
  const remaining: number[] = []
  for (let page = result.current_page + 1; page <= result.last_page; page++) remaining.push(page)

  // A few pages at a time instead of strictly one after another — much faster on big
  // catalogues, without flooding the local PHP server with dozens of simultaneous requests.
  const pages: T[][] = new Array(remaining.length)
  let cursor = 0
  async function worker() {
    while (cursor < remaining.length) {
      const index = cursor++
      pages[index] = (await api.get<Paginated<T>>(`${path}${separator}page=${remaining[index]}`)).data
    }
  }
  await Promise.all(Array.from({ length: Math.min(GET_ALL_CONCURRENCY, remaining.length) }, worker))
  return [...result.data, ...pages.flat()]
}

const GET_ALL_CONCURRENCY = 4
