/**
 * 数组生成一个key value相同的map, 并返回常量类型(ts)
 * @param
 * @example
 * arrayToMap(['a', 'b']) => {a: 'a', b: 'b'}
 */
export function arrayToMap<T extends string>(o: Array<T>): { [K in T]: K } {
  return o.reduce((res, key) => {
    res[key] = key
    return res
  }, Object.create(null))
}
