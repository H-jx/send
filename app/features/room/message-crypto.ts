import { messageContentSchema, type EncryptedMessageInput, type Message, type RoomMessage } from '../../../shared/message'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(encoded: string) {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function createMessageCrypto(roomId: string) {
  let roomKey: Promise<CryptoKey> | undefined

  async function getRoomKey() {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) throw new Error('消息加密需要 HTTPS 或 localhost')
    // 房间号是公开的，派生密钥只用于避免传输明文。
    roomKey ??= subtle.digest('SHA-256', encoder.encode(`send:v1:${roomId}`))
      .then((key) => subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt', 'decrypt']))
    return { subtle, key: await roomKey }
  }

  function algorithm(id: string, iv: Uint8Array<ArrayBuffer>): AesGcmParams {
    return {
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(JSON.stringify([roomId, id])),
    }
  }

  return {
    async encrypt(message: Message): Promise<EncryptedMessageInput> {
      const content = messageContentSchema.safeParse(message)
      if (!content.success) throw new Error('消息内容无效或超出长度限制')

      const { subtle, key } = await getRoomKey()
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const plaintext = encoder.encode(JSON.stringify(content.data))
      const ciphertext = await subtle.encrypt(algorithm(message.id, iv), key, plaintext)
      return { id: message.id, v: 1, iv: encodeBase64Url(iv), ciphertext: encodeBase64Url(new Uint8Array(ciphertext)) }
    },

    async decrypt(message: RoomMessage): Promise<Message> {
      if (!('v' in message)) return message

      const { id, time, sendBy, iv, ciphertext } = message
      const { subtle, key } = await getRoomKey()
      const plaintext = await subtle.decrypt(algorithm(id, decodeBase64Url(iv)), key, decodeBase64Url(ciphertext))
      const content = messageContentSchema.parse(JSON.parse(decoder.decode(plaintext)))
      return { ...content, id, time, sendBy }
    },
  }
}
