import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { NeonBackground } from '@/components/NeonBackground'
import { NewsPage } from '@/pages/NewsPage'
import { TasksPage } from '@/pages/TasksPage'
import { TaskPage } from '@/pages/TaskPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { RatingPage } from '@/pages/RatingPage'
import { AdminPage } from '@/pages/AdminPage'
import { AuthPage } from '@/pages/AuthPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { WorldPage } from '@/pages/WorldPage'
import { GuidePage } from '@/pages/GuidePage'

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])
  return null
}

export default function App() {
  return (
    <>
      <NeonBackground />
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<NewsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/:id" element={<TaskPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="rating" element={<RatingPage />} />
          <Route path="world" element={<WorldPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
