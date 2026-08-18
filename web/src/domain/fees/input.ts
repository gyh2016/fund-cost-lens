export type IntegerInputResult =
  | { kind: 'unset'; normalized: '' }
  | { kind: 'valid'; normalized: string }
  | { kind: 'invalid'; normalized: string; message: string }

export function parseIntegerInput(
  rawValue: string,
  minimum = 1,
): IntegerInputResult {
  const value = rawValue.trim()
  if (!value) return { kind: 'unset', normalized: '' }
  if (!/^\d+$/.test(value)) {
    return {
      kind: 'invalid',
      normalized: value,
      message: '请输入不含小数、符号或千分位的整数',
    }
  }
  const normalized = value.replace(/^0+(?=\d)/, '')
  try {
    if (BigInt(normalized) < BigInt(minimum)) {
      return {
        kind: 'invalid',
        normalized,
        message: `请输入不小于 ${minimum} 的整数`,
      }
    }
  } catch {
    return { kind: 'invalid', normalized, message: '输入的整数无效' }
  }
  return { kind: 'valid', normalized }
}
