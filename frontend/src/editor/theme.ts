import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

export const lwHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#ff7ab6', fontWeight: '600' },
  { tag: [tags.typeName, tags.className], color: '#8fd7ff' },
  { tag: tags.function(tags.variableName), color: '#9bf7e4' },
  { tag: tags.variableName, color: '#d9d9ff' },
  { tag: tags.propertyName, color: '#c7b3ff' },
  { tag: [tags.bool, tags.atom], color: '#ffcf5c' },
  { tag: [tags.number, tags.integer, tags.float], color: '#ffb86b' },
  { tag: [tags.string, tags.special(tags.string)], color: '#9bf7e4' },
  { tag: [tags.operator, tags.punctuation], color: '#8a8ab8' },
  { tag: tags.bracket, color: '#b39bff' },
  { tag: tags.comment, color: '#5a5a80', fontStyle: 'italic' },
  { tag: tags.invalid, color: '#ff2e88' },
])

export const lwEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#e8e8ff',
      fontSize: '13.5px',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.68',
      minHeight: '340px',
      maxHeight: '560px',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '14px 0',
      caretColor: '#0ff1ca',
    },
    '.cm-line': {
      padding: '0 16px 0 6px',
    },
    '.cm-gutters': {
      backgroundColor: '#08081a',
      color: '#3f3f62',
      border: 'none',
      paddingLeft: '4px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(15, 241, 202, 0.06)',
      color: '#0ff1ca',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(15, 241, 202, 0.035)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#0ff1ca',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(138, 92, 246, 0.35)',
    },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(15, 241, 202, 0.18)',
      outline: '1px solid rgba(15, 241, 202, 0.5)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(255, 207, 92, 0.14)',
    },
    '.cm-lintRange-error': {
      backgroundImage: 'none',
      borderBottom: '2px wavy #ff2e88',
      paddingBottom: '1px',
    },
    '.cm-lintRange-warning': {
      backgroundImage: 'none',
      borderBottom: '2px wavy #ffcf5c',
      paddingBottom: '1px',
    },
    '.cm-lintRange-info': {
      backgroundImage: 'none',
      borderBottom: '2px dotted #0ff1ca',
      paddingBottom: '1px',
    },
    '.cm-tooltip': {
      backgroundColor: '#0d0d22',
      border: '1px solid #232347',
      borderRadius: '8px',
      color: '#e8e8ff',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'rgba(15, 241, 202, 0.14)',
      color: '#0ff1ca',
    },
    '.cm-panels': {
      backgroundColor: '#08081a',
      borderColor: '#232347',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(255, 207, 92, 0.2)',
    },
    '.cm-gutterElement': {
      padding: '0 8px 0 4px',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(138, 92, 246, 0.2)',
      border: 'none',
      color: '#c7b3ff',
    },
  },
  { dark: true },
)

export const lwEditorExtensions = [syntaxHighlighting(lwHighlightStyle), lwEditorTheme]
