export * from './fs'

export function getIPAdress(): string {
  const interfaces = require('os').networkInterfaces()
  for (const devName in interfaces) {
    const iface = interfaces[devName]
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address
      }
    }
  }
  return '0.0.0.0'
}

export function randomWord(range: number) {
  let str = ''
  const arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  for (let i = 0; i < range; i++) {
    const index = Math.round(Math.random() * (arr.length - 1))
    str += arr[index]
  }
  return str
}
