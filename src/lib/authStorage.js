export function authSessionStorageKey(supabaseUrl) {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    return projectRef ? `sb-${projectRef}-auth-token` : null
  } catch {
    return null
  }
}

export function migrateAuthSessionStorage(fromStorage, toStorage, storageKey) {
  if (!fromStorage || !toStorage || !storageKey) return false
  try {
    const existing = toStorage.getItem(storageKey)
    const legacy = fromStorage.getItem(storageKey)
    if (!legacy) return false
    if (!existing) toStorage.setItem(storageKey, legacy)
    fromStorage.removeItem(storageKey)
    return !existing
  } catch {
    return false
  }
}
