export type Role = 'user' | 'admin'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'nightmare'
export type NewsCategory = 'event' | 'update' | 'maintenance' | 'holiday'
export type Accent = 'cyan' | 'magenta' | 'violet' | 'amber'
export type VerdictStatus = 'OK' | 'FAIL' | 'WRONG_ANSWER' | 'TLE' | 'CE'
export type Severity = 'error' | 'warning' | 'info'

export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  avatarHue: number
  rating: number
  solvedCount: number
  streak: number
  adminNote?: string
  createdAt: string
  banned?: boolean
  nameLimit?: number
  usedNames?: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface NewsItem {
  id: string
  title: string
  body: string
  category: NewsCategory
  pinned: boolean
  accent: Accent
  cta?: { label: string; href: string } | null
  startsAt?: string
  endsAt?: string
  createdAt: string
}

export interface TaskSummary {
  id: string
  slug: string
  title: string
  difficulty: Difficulty
  tags: string[]
  score: number
  solvedBy: number
  languageVersion: string
  addonPacks: string[]
  solved?: boolean
  attempted?: boolean
}

export interface TaskExample {
  input: string
  output: string
  explanation?: string
}

export interface CustomPage {
  id: string
  title: string
  kind: string
  config?: Record<string, unknown>
}

export interface Task extends TaskSummary {
  statement: string
  constraints: string[]
  examples: TaskExample[]
  starterCode: string
  entryPoint: string
  timeLimitMs: number
  customPages?: CustomPage[]
  ratingTable?: string
  allowedWords?: string[] | null
  coreOverrideLimit?: number
}

export interface PlatformSettings {
  registrationMode: 'open' | 'invite' | 'closed'
  defaultNameLimit: number
  runCooldownSeconds: number
  submitCooldownSeconds: number
  allowedWords: string[]
  denyWords: string[]
  permittedOverrides: string[]
  defaultCoreOverrideLimit: number
  maxQueuedJobs: number
  maxNameLength: number
  worldVisibility: Record<'variables' | 'functions', Record<'names' | 'values', 'admin_only' | 'public'>>
}

export interface Invite {
  id: string
  createdAt: string
  usedAt?: string
  usedBy?: string
  code?: string
  maxUses: number
  uses: number
  expiresAt: string
}

export interface AdminTask extends Task {
  tests: { input: unknown[]; expected: unknown; hidden?: boolean }[]
}

export interface Namespace {
  version: number
  values: Record<string, unknown>
  functions: Record<string, unknown>
  last?: Record<string, unknown>
  visibility: Record<'variables' | 'functions', { names: boolean; values: boolean }>
}

export interface AuditEntry {
  id: string
  actorId: string
  action: string
  target: string
  createdAt: string
}

export interface ApiDiagnostic {
  severity: Severity
  message: string
  code: string
  addonId: string
  from: number
  to: number
}

export interface TestResult {
  name: string
  input: string
  expected: string
  actual?: string
  passed: boolean
  durationMs?: number
}

export interface RunResult {
  status: VerdictStatus
  tests: TestResult[]
  stdout: string
  diagnostics?: ApiDiagnostic[]
}

export interface SubmissionSummary {
  id: string
  taskId: string
  taskTitle: string
  userId: string
  username: string
  status: VerdictStatus
  score: number
  languageVersion: string
  createdAt: string
  durationMs: number
  testsPassed: number
  testsTotal: number
}

export interface SubmissionCursor {
  beforeCreated: string
  beforeId: string
}

export interface DiffHunk {
  type: 'add' | 'del' | 'ctx'
  oldLine?: number
  newLine?: number
  text: string
}

export interface Submission extends SubmissionSummary {
  code: string
  diagnostics: ApiDiagnostic[]
  tests: TestResult[]
  stdout?: string
  previousId?: string
  previousCode?: string
  diff?: {
    previousId?: string
    unified: string
    hunks: DiffHunk[]
  }
}

export interface RatingColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
}

export interface RatingTableDescriptor {
  id: string
  title: string
  description?: string
  columns: RatingColumn[]
  highlightUserId?: string
}

export interface RatingRow {
  rank: number
  userId: string
  username: string
  score: number
  solved: number
  delta?: number
  extra: Record<string, string | number>
}

export interface RatingTable {
  descriptor: RatingTableDescriptor
  rows: RatingRow[]
  me?: RatingRow
}

export interface RatingUpdate {
  tableId: string
  delta: number
  newScore: number
  rank: number
  rankBefore: number
}

export interface SubmitResult {
  submission: Submission
  ratingUpdate: RatingUpdate
}

export interface Insights {
  kind: string
  data: Record<string, unknown>
}

export interface AdminSummary {
  users: number
  tasks: number
  submissions: number
  news: number
  pendingReports: number
  recent: SubmissionSummary[]
}
