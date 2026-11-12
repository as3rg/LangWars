import { afterEach, describe, expect, it } from 'vitest'
import { formatArguments } from './arguments'
import { useLocale } from './i18n'

afterEach(() => useLocale.setState({ locale: 'en' }))

describe('task argument display', () => {
  it('labels scalar arguments individually and keeps list values intact', () => {
    const source = '@solution\nfn <list, int, string> solve(items, index, text) { return 0; }'
    expect(formatArguments('[[1,2],3,"hello"]', source)).toBe('items = [1,2]\nindex = 3\ntext = "hello"')
    expect(formatArguments('[1,2]', '@solution fn solve(left, right) { return left + right; }')).toBe('left = 1\nright = 2')
  })

  it('does not use fake signatures from comments or strings', () => {
    const source = '// @solution fn fake(wrong) {}\nlet text = "@solution fn fake(wrong) {}";\n@solution /* comment */ fn answer(value) { return value; }'
    expect(formatArguments('[{"x":1}]', source)).toBe('value = {"x":1}')
  })

  it('preserves custom example text and redacted hidden inputs', () => {
    expect(formatArguments('some authored input', '')).toBe('some authored input')
    expect(formatArguments('<hidden>', '')).toBe('<hidden>')
    expect(formatArguments('42', '')).toBe('42')
  })

  it.each(['en', 'ru'] as const)('labels missing signatures and zero arguments in %s', (locale) => {
    useLocale.setState({ locale })
    expect(formatArguments('[]', '')).toBe(locale === 'en' ? 'No arguments' : 'Без аргументов')
    expect(formatArguments('[1]', '')).toBe(locale === 'en' ? 'Argument 1 = 1' : 'Аргумент 1 = 1')
  })
})
