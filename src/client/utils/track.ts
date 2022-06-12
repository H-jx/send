import { Tracker } from '@bilibili-live/live-web-track'

const FF_LOCAL_KEY = '_ffCfg_'

let ffLocalCfg: { [key: string]: any } = {}
try {
  ffLocalCfg = JSON.parse(localStorage[FF_LOCAL_KEY] ?? '{}')
} catch (err) {
  console.error(err)
}

const localCfg = {
  getAll() {
    return ffLocalCfg
  },
  get(k: string) {
    return ffLocalCfg[k]
  },
  set(k: string, v: any) {
    ffLocalCfg[k] = v
    localStorage.setItem(FF_LOCAL_KEY, JSON.stringify(ffLocalCfg))
  },
}

const uid = localCfg.get('uid') ?? uuid()
if (localCfg.get('uid') == null) {
  localCfg.set('uid', uid)
}

export function pv() {
  const tracker = new Tracker('009658', {
    formatter: () => [`${uuid()}|${uid}||`, Date.now(), 100, 1, 'ff-pv', JSON.stringify({ host: location.host })],
  })
  tracker.event('pv', null, { randDelay: 0 })
}

/**
 * 生成一个 uuid
 */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
