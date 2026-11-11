export type Role = 'user' | 'admin'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'nightmare'
export type NewsCategory = 'event' | 'update' | 'maintenance' | 'holiday'
export type Accent = 'cyan' | 'magenta' | 'violet' | 'amber'
export type VerdictStatus = 'OK' | 'FAIL' | 'WRONG_ANSWER' | 'TLE' | 'CE' | 'BROKEN'
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
  solvedTaskIds?: string[]
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
  broken?: boolean
  status?: 'solved' | 'broken' | 'attempted' | 'new'
  translations?: Partial<Record<'en' | 'ru', TaskTranslation>>
}

export interface TaskTranslation {
  title: string
  statement: string
  constraints: string[]
  examples?: TaskExample[]
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
  coreOverrideLimit?: number | null
  namePublishLimit?: number | null
  nameBudget?: { used: number; limit: number; taskUsed: number; taskLimit: number; coreUsed: number; coreLimit: number }
  resubmitPenalty?: { enabled: boolean; percent: number; points: number }
}

export interface PlatformSettings {
  registrationMode: 'open' | 'invite' | 'closed'
  defaultNameLimit: number
  defaultTaskNameLimit: number
  runCooldownSeconds: number
  submitCooldownSeconds: number
  allowedWords: string[]
  denyWords: string[]
  permittedOverrides: string[]
  defaultCoreOverrideLimit: number
  maxQueuedJobs: number
  maxNameLength: number
  resubmitPenaltyEnabled: boolean
  resubmitPenaltyPercent: number
  solutionNotificationsEnabled: boolean
  showBreakerIdentity: boolean
  breakImpactVisibility: 'usernames' | 'count' | 'hidden'
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
  ownership?: Record<string, { submissionId: string; taskId?: string; taskTitle?: string; userId?: string; username?: string }>
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
  verdictStatus?: Exclude<VerdictStatus, 'BROKEN'>
  breakImpact?: BreakImpact
  active?: boolean
}

export interface BreakImpact {
  userCount: number
  usernames?: string[]
}

export type NotificationKind = 'accepted' | 'rejected' | 'broken' | 'repaired' | 'breaking' | 'info' | 'success' | 'error'

export interface UserNotification {
  id: string
  kind: NotificationKind
  createdAt: string
  read: boolean
  taskId?: string
  taskTitle?: string
  submissionId?: string
  verdictStatus?: string
  breaker?: { userId: string; username: string }
  impact?: BreakImpact
  message?: string
  occurredAt?: string
  historical?: boolean
}

export interface NotificationPage {
  items: UserNotification[]
  unreadCount: number
  enabled: boolean
  showBreakerIdentity: boolean
  breakImpactVisibility: 'usernames' | 'count' | 'hidden'
}

export interface SubmissionCursor {
  beforeCreated: string
  beforeId: string
}

export interface RecheckRun {
  id: string
  submissionId: string
  taskId: string
  taskTitle: string
  userId: string
  causeSubmissionId: string | null
  kind: 'live' | 'causal_before' | 'causal_after'
  worldVersion: number
  createdAt: string
  finishedAt?: string
  status: 'OK' | 'BROKEN' | 'FAIL'
  verdictStatus: string
  previousStatus: string | null
  completed: boolean
  testsPassed: number
  testsTotal: number
  durationMs: number
  diagnostics: { code: string; message: string }[]
}

export interface RecheckPage {
  items: RecheckRun[]
  nextCursor: SubmissionCursor | null
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
  baseScore?: number
  penalty?: number
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
  notification?: UserNotification
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

export interface PerformanceActivity {
  completed: number
  failed: number
  perMinute: number
  meanWaitMs: number | null
  p95WaitMs: number | null
  meanExecutionMs: number | null
  p95ExecutionMs: number | null
  p95WaitCapped?: boolean
  p95ExecutionCapped?: boolean
}

export interface PerformanceSnapshot {
  generatedAt: string
  windowSeconds: number
  heartbeatSeconds: number
  staleAfterSeconds: number
  workers: {
    online: number
    busy: number
    stale: number
    items: { id: string; hostname?: string; pid: number; lastSeen: string; state: 'idle' | 'busy' | 'offline'; mode: string | null; busySeconds?: number; utilizationPercent?: number | null }[]
  }
  queue: {
    queued: number
    running: number
    expired: number
    capacity: number
    foregroundQueued: number
    foregroundRunning: number
    admissionUsed: number
    meanWaitSeconds: number | null
    oldestWaitSeconds: number | null
    byMode: { mode: string; queued: number; running: number; meanWaitSeconds: number | null; oldestWaitSeconds: number | null }[]
  }
  activity: PerformanceActivity & { byMode: (PerformanceActivity & { mode: string })[] }
  audits: { pending: number; remainingCandidates: number; capacity: number }
  api: {
    processId: number
    uptimeSeconds: number
    windowSeconds: number
    requests: number
    errors: number
    rejected: number
    rateLimited: number
    queueFull: number
    notificationBacklog: number
    cooldowns: number
    requestsPerSecond: number
    runsAccepted: number
    submissionsAccepted: number
    admissionsPerSecond: number
    meanLatencyMs: number | null
    p95LatencyMs: number | null
    inFlight: number
  }
  store?: { probeMs: number }
}
