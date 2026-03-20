import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.HUB_ENCRYPTION_KEY || ''
  if (!raw || raw === 'default-key-change-me') {
    console.warn('[encryption] HUB_ENCRYPTION_KEY not set — using insecure fallback')
  }
  // Derive a 32-byte key by padding/truncating
  return Buffer.from(raw.padEnd(32, '0').slice(0, 32), 'utf8')
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64 string: iv(12) + authTag(16) + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack: iv || authTag || ciphertext
  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64')
}

/**
 * Decrypts a base64 string produced by `encrypt`.
 * Falls back to legacy XOR decryption for backwards compatibility.
 */
export function decrypt(encoded: string): string {
  try {
    const buf = Buffer.from(encoded, 'base64')

    // AES-GCM format: iv(12) + authTag(16) + ciphertext (min 28 bytes)
    if (buf.length > 28) {
      const key = getKey()
      const iv = buf.subarray(0, 12)
      const authTag = buf.subarray(12, 28)
      const ciphertext = buf.subarray(28)

      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8')
    }

    // Legacy XOR fallback (for data encrypted before migration)
    return legacyDecrypt(encoded)
  } catch {
    // If AES fails, try legacy XOR
    return legacyDecrypt(encoded)
  }
}

function legacyDecrypt(encoded: string): string {
  const raw = process.env.HUB_ENCRYPTION_KEY || 'default-key-change-me'
  const key = raw.padEnd(32, '0').slice(0, 32)
  const bytes = Buffer.from(encoded, 'base64')
  const decrypted = bytes.map((byte, i) => byte ^ key.charCodeAt(i % key.length))
  return Buffer.from(decrypted).toString('utf8')
}
