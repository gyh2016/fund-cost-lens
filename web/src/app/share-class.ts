export const OTHER_SHARE_CLASS = 'other'

const LETTER_SHARE_CLASS_PATTERN = /^[A-Za-z]$/

export function shareClassFilterValue(shareClass: string): string {
  return LETTER_SHARE_CLASS_PATTERN.test(shareClass)
    ? shareClass.toUpperCase()
    : OTHER_SHARE_CLASS
}

export function shareClassFilterLabel(value: string): string {
  return value === OTHER_SHARE_CLASS ? '其他' : value
}
