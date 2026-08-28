export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : `Request failed: ${response.status}`);
  }
  return json as T;
}
