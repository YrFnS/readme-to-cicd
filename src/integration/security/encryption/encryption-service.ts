/**
 * Encryption Service Implementation
 * 
 * Provides data encryption with AES-256 for data at rest and TLS 1.3 for data in transit,
 * key management, and cryptographic operations.
 */

import {
  EncryptionContext,
  EncryptionResult,
  DecryptionResult,
  EncryptionConfig
} from '../types.js'

export class EncryptionService {
  private config: EncryptionConfig
  private keys: Map<string, CryptoKey> = new Map()
  private currentKeyId: string = 'default'

  constructor(config: EncryptionConfig) {
    this.config = config
    this.initializeKeys()
  }

  private async initializeKeys(): Promise<void> {
    // Generate default encryption key
    const defaultKey = await this.generateKey('AES-GCM', 256)
    this.keys.set(this.currentKeyId, defaultKey)
  }

  async encrypt(data: string, context?: EncryptionContext): Promise<string> {
    try {
      const algorithm = context?.algorithm || this.config.defaultAlgorithm || 'AES-256-GCM'
      const keyId = context?.keyId || this.currentKeyId
      
      const key = this.keys.get(keyId)
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`)
      }

      const result = await this.performEncryption(data, key, algorithm, context)
      
      // Return encrypted data with metadata
      return JSON.stringify({
        ciphertext: result.ciphertext,
        iv: result.iv,
        tag: result.tag,
        keyId: result.keyId,
        algorithm
      })
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async decrypt(encryptedData: string, context?: EncryptionContext): Promise<string> {
    try {
      const encryptionMetadata = JSON.parse(encryptedData)
      const keyId = encryptionMetadata.keyId || context?.keyId || this.currentKeyId
      
      const key = this.keys.get(keyId)
      if (!key) {
        throw new Error(`Decryption key not found: ${keyId}`)
      }

      const result = await this.performDecryption(encryptionMetadata, key, context)
      
      if (!result.verified) {
        throw new Error('Decryption verification failed')
      }

      return result.plaintext
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async performEncryption(
    data: string, 
    key: CryptoKey, 
    algorithm: string, 
    context?: EncryptionContext
  ): Promise<EncryptionResult> {
    const encoder = new TextEncoder()
    const plaintext = encoder.encode(data)

    switch (algorithm) {
      case 'AES-256-GCM':
        return this.encryptAESGCM(plaintext, key, context)
      case 'AES-256-CBC':
        return this.encryptAESCBC(plaintext, key, context)
      default:
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`)
    }
  }

  private async encryptAESGCM(
    plaintext: Uint8Array, 
    key: CryptoKey, 
    context?: EncryptionContext
  ): Promise<EncryptionResult> {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const algorithm = {
      name: 'AES-GCM',
      iv,
      additionalData: context?.additionalData
    }

    const ciphertext = await crypto.subtle.encrypt(algorithm, key, plaintext)
    
    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      keyId: context?.keyId || this.currentKeyId
    }
  }

  private async encryptAESCBC(
    plaintext: Uint8Array, 
    key: CryptoKey, 
    context?: EncryptionContext
  ): Promise<EncryptionResult> {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(16))
    
    // Pad plaintext to block size (PKCS#7 padding)
    const paddedPlaintext = this.addPKCS7Padding(plaintext, 16)
    
    const algorithm = {
      name: 'AES-CBC',
      iv
    }

    const ciphertext = await crypto.subtle.encrypt(algorithm, key, paddedPlaintext)
    
    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      keyId: context?.keyId || this.currentKeyId
    }
  }

  private async performDecryption(
    encryptionMetadata: any, 
    key: CryptoKey, 
    context?: EncryptionContext
  ): Promise<DecryptionResult> {
    const ciphertext = this.base64ToArrayBuffer(encryptionMetadata.ciphertext)
    const iv = this.base64ToArrayBuffer(encryptionMetadata.iv)

    switch (encryptionMetadata.algorithm) {
      case 'AES-256-GCM':
        return this.decryptAESGCM(ciphertext, key, iv, context)
      case 'AES-256-CBC':
        return this.decryptAESCBC(ciphertext, key, iv)
      default:
        throw new Error(`Unsupported decryption algorithm: ${encryptionMetadata.algorithm}`)
    }
  }

  private async decryptAESGCM(
    ciphertext: ArrayBuffer, 
    key: CryptoKey, 
    iv: ArrayBuffer, 
    context?: EncryptionContext
  ): Promise<DecryptionResult> {
    try {
      const algorithm = {
        name: 'AES-GCM',
        iv,
        additionalData: context?.additionalData
      }

      const plaintext = await crypto.subtle.decrypt(algorithm, key, ciphertext)
      const decoder = new TextDecoder()
      
      return {
        plaintext: decoder.decode(plaintext),
        verified: true
      }
    } catch (error) {
      return {
        plaintext: '',
        verified: false
      }
    }
  }

  private async decryptAESCBC(
    ciphertext: ArrayBuffer, 
    key: CryptoKey, 
    iv: ArrayBuffer
  ): Promise<DecryptionResult> {
    try {
      const algorithm = {
        name: 'AES-CBC',
        iv
      }

      const paddedPlaintext = await crypto.subtle.decrypt(algorithm, key, ciphertext)
      const plaintext = this.removePKCS7Padding(new Uint8Array(paddedPlaintext))
      const decoder = new TextDecoder()
      
      return {
        plaintext: decoder.decode(plaintext),
        verified: true
      }
    } catch (error) {
      return {
        plaintext: '',
        verified: false
      }
    }
  }

  async rotateKeys(): Promise<void> {
    try {
      // Generate new key
      const newKeyId = `key_${Date.now()}`
      const newKey = await this.generateKey('AES-GCM', 256)
      
      // Store new key
      this.keys.set(newKeyId, newKey)
      
      // Update current key ID
      const oldKeyId = this.currentKeyId
      this.currentKeyId = newKeyId
      
      // Schedule old key for removal (keep for decryption of existing data)
      setTimeout(() => {
        this.keys.delete(oldKeyId)
      }, 24 * 60 * 60 * 1000) // Keep old key for 24 hours
      
      console.log(`Key rotated from ${oldKeyId} to ${newKeyId}`)
    } catch (error) {
      throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateKey(algorithm: string, keySize: number): Promise<CryptoKey> {
    const keyAlgorithm = {
      name: algorithm === 'AES-GCM' ? 'AES-GCM' : 'AES-CBC',
      length: keySize
    }

    return crypto.subtle.generateKey(
      keyAlgorithm,
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  async exportKey(keyId: string): Promise<string> {
    const key = this.keys.get(keyId)
    if (!key) {
      throw new Error(`Key not found: ${keyId}`)
    }

    const exported = await crypto.subtle.exportKey('raw', key)
    return this.arrayBufferToBase64(exported)
  }

  async importKey(keyData: string, keyId: string): Promise<void> {
    const keyBuffer = this.base64ToArrayBuffer(keyData)
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    )

    this.keys.set(keyId, key)
  }

  async generateHash(data: string, algorithm: string = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer)
    return this.arrayBufferToBase64(hashBuffer)
  }

  async generateHMAC(data: string, secret: string, algorithm: string = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const secretBuffer = encoder.encode(secret)
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer)
    return this.arrayBufferToBase64(signature)
  }

  async verifyHMAC(data: string, signature: string, secret: string, algorithm: string = 'SHA-256'): Promise<boolean> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const secretBuffer = encoder.encode(secret)
    const signatureBuffer = this.base64ToArrayBuffer(signature)
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: algorithm },
      false,
      ['verify']
    )
    
    return crypto.subtle.verify('HMAC', key, signatureBuffer, dataBuffer)
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  private addPKCS7Padding(data: Uint8Array, blockSize: number): Uint8Array {
    const padding = blockSize - (data.length % blockSize)
    const padded = new Uint8Array(data.length + padding)
    padded.set(data)
    for (let i = data.length; i < padded.length; i++) {
      padded[i] = padding
    }
    return padded
  }

  private removePKCS7Padding(data: Uint8Array): Uint8Array {
    const padding = data[data.length - 1]
    return data.slice(0, data.length - padding)
  }

  async getEncryptionStatistics(): Promise<any> {
    return {
      totalKeys: this.keys.size,
      currentKeyId: this.currentKeyId,
      defaultAlgorithm: this.config.defaultAlgorithm,
      keyRotationInterval: this.config.keyRotationInterval,
      keyManagementProvider: this.config.keyManagement.provider
    }
  }

  // TLS Configuration for data in transit
  getTLSConfig(): any {
    return {
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256'
      ],
      certificateValidation: true,
      requireClientCertificate: false,
      allowInsecureConnections: false
    }
  }
}