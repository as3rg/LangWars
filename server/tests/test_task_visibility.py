"""Challenges stay hidden across direct links and historical projections."""
import unittest

from server.notifications import event
from server.task_visibility import task_visible, timestamp
from server.tests import test_platform as fixtures


class TaskVisibilityTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work

    def patch_task(self, task_id, **fields):
        result = self.client.patch('/api/admin/tasks/' + task_id, json=fields, headers=self.admin)
        self.assertEqual(result.status_code, 200, result.text)
        return result.json()

    def test_hidden_task_has_no_public_or_historical_links(self):
        self.settings(submitCooldownSeconds=0)
        user, headers = self.register()
        task = self.create_task('private-challenge', 42)
        sub = self.submit_and_work(task, '@solution fn answer(){return 42;}', headers)
        with self.store.transaction() as tx:
            row = tx.execute("SELECT id FROM jobs WHERE user_id=? AND mode='submit'", (user['id'],)).fetchone()
            job_id = row[0]
            event(tx, user['id'], 'accepted', 'hidden-event', taskId=task, taskTitle='private-challenge', submissionId=sub['id'])
            player = tx.get('users', user['id'])
            player['taskPenalties'] = {task: 7}
            player['submissionPenalties'] = 7
            tx.put('users', user['id'], player)
        self.patch_task(task, visibility='hidden', ratingTable='secret-ladder')
        for viewer in ({}, headers):
            self.assertNotIn(task, {item['id'] for item in self.client.get('/api/tasks', headers=viewer).json()})
            for path in ('/api/tasks/' + task, '/api/tasks/' + task + '/insights', '/api/rating?table=task:' + task, '/api/rating?table=secret-ladder'):
                self.assertEqual(self.client.get(path, headers=viewer).status_code, 404, path)
            self.assertNotIn(task, self.client.get('/api/rating/tables', headers=viewer).text)
        for path in ('/api/tasks/' + task + '/submissions', '/api/submissions/' + sub['id'], '/api/jobs/' + job_id):
            self.assertEqual(self.client.get(path, headers=headers).status_code, 404, path)
        for action in ('run', 'submit'):
            self.assertEqual(self.client.post('/api/tasks/' + task + '/' + action, json={'code': '@solution fn answer(){return 42;}'}, headers=headers).status_code, 404)
        self.assertNotIn(task, self.client.get('/api/submissions', headers=headers).text)
        notices = self.client.get('/api/notifications', headers=headers).json()
        self.assertEqual(notices['items'], [])
        self.assertEqual(notices['unreadCount'], 0)
        profile = self.client.get('/api/me', headers=headers).json()
        self.assertEqual(profile['solvedCount'], 0)
        self.assertEqual(profile['rating'], 0)
        self.assertNotIn(task, str(profile))
        ranking = self.client.get('/api/rating', headers=headers).json()['me']
        self.assertEqual((ranking['score'], ranking['baseScore'], ranking['penalty'], ranking['solved']), (0, 0, 0, 0))
        self.assertEqual(self.client.get('/api/tasks/' + task, headers=self.admin).status_code, 200)
        self.assertEqual(self.client.get('/api/submissions/' + sub['id'], headers=self.admin).status_code, 200)
        self.assertEqual(self.client.get('/api/jobs/' + job_id, headers=self.admin).status_code, 200)

    def test_event_visibility_uses_flag_timeframe_and_deleted_event(self):
        task = self.create_task('event-challenge', 1)
        result = self.client.post('/api/admin/news', json={'title': 'Challenge', 'category': 'event', 'startsAt': '2026-01-01T00:00:00Z', 'endsAt': '2027-01-01T00:00:00Z'}, headers=self.admin)
        self.assertEqual(result.status_code, 201, result.text)
        event_id = result.json()['id']
        self.patch_task(task, visibility='event', eventId=event_id)
        with self.store.transaction() as tx:
            challenge = tx.get('tasks', task)
            self.assertFalse(task_visible(tx, challenge, now=timestamp('2025-12-31T23:59:59Z')))
            self.assertTrue(task_visible(tx, challenge, now=timestamp('2026-01-01T00:00:00Z')))
            self.assertFalse(task_visible(tx, challenge, now=timestamp('2027-01-01T00:00:00Z')))
        self.assertEqual(self.client.patch('/api/admin/news/' + event_id, json={'visible': False}, headers=self.admin).status_code, 200)
        self.assertEqual(self.client.get('/api/tasks/' + task).status_code, 404)
        self.assertEqual(self.client.get('/api/news/' + event_id).status_code, 404)
        self.assertNotIn(event_id, self.client.get('/api/news').text)
        self.assertIn(event_id, self.client.get('/api/admin/news', headers=self.admin).text)
        self.assertEqual(self.client.delete('/api/admin/news/' + event_id, headers=self.admin).status_code, 204)
        self.assertEqual(self.client.get('/api/tasks/' + task).status_code, 404)
        self.patch_task(task, visibility='visible')
        self.assertEqual(self.client.get('/api/tasks/' + task).status_code, 200)

    def test_challenge_policy_validation_and_explicit_empty_keywords(self):
        task = self.create_task('policy-challenge', 0)
        for patch in ({'visibility': 'maybe'}, {'visibility': 'event'}, {'maxNameLength': 0}, {'maxNameLength': 129}, {'maxNameLength': True}, {'allowedKeywords': ['exec']}, {'allowedKeywords': 'if'}, {'datacenterFire': 1}):
            result = self.client.patch('/api/admin/tasks/' + task, json=patch, headers=self.admin)
            self.assertEqual(result.status_code, 422, (patch, result.text))
        changed = self.patch_task(task, maxNameLength=4, allowedKeywords=[], datacenterFire=True)
        self.assertEqual((changed['maxNameLength'], changed['allowedKeywords'], changed['datacenterFire']), (4, [], True))
        restored = self.patch_task(task, maxNameLength=None, allowedKeywords=None, datacenterFire=False)
        self.assertIsNone(restored['maxNameLength'])
        self.assertIsNone(restored['allowedKeywords'])
        for fields in ({'startsAt': 'tomorrow'}, {'startsAt': '2026-01-01T00:00:00'}, {'startsAt': '2027-01-01T00:00:00Z', 'endsAt': '2026-01-01T00:00:00Z'}, {'visible': 0}):
            result = self.client.post('/api/admin/news', json={'title': 'Invalid event', 'category': 'event', **fields}, headers=self.admin)
            self.assertEqual(result.status_code, 422, result.text)

    def test_hidden_history_does_not_truncate_visible_page(self):
        user, headers = self.register()
        hidden = self.create_task('hidden-history', 0)
        visible = self.create_task('visible-history', 0)
        with self.store.transaction() as tx:
            task = tx.get('tasks', hidden)
            task['visibility'] = 'hidden'
            tx.put('tasks', hidden, task)
            for index in range(502):
                task_id = visible if index == 501 else hidden
                sub = {'id': f'sub_{index:04d}', 'taskId': task_id, 'taskTitle': task_id, 'userId': user['id'], 'username': user['username'], 'status': 'CE', 'createdAt': '2026-01-01T00:00:00Z'}
                tx.put('submissions', sub['id'], sub)
        page = self.client.get('/api/submissions?limit=1', headers=headers).json()
        self.assertEqual([item['taskId'] for item in page], [visible])

    def test_visible_job_rating_update_does_not_reveal_hidden_scores_or_ranks(self):
        self.settings(submitCooldownSeconds=0)
        user, headers = self.register()
        competitor, _ = self.register('another')
        self.assertEqual(self.client.patch('/api/admin/users/' + competitor['id'], json={'rating': 75}, headers=self.admin).status_code, 200)
        hidden = self.create_task('hidden-score', 42)
        visible = self.create_task('visible-score', 42)
        first = self.submit_and_work(hidden, '@solution fn alpha_answer(){return 42;}', headers)
        self.assertEqual(first['status'], 'OK', first)
        sub = self.submit_and_work(visible, '@solution fn beta_answer(){return 42;}', headers)
        self.assertEqual(sub['status'], 'OK', sub)
        job_id = sub['jobId']
        raw = self.client.get('/api/jobs/' + job_id, headers=self.admin).json()['result']['ratingUpdate']
        self.assertEqual((raw['newScore'], raw['rank']), (100, 1))
        self.patch_task(hidden, visibility='hidden')
        projected = self.client.get('/api/jobs/' + job_id, headers=headers).json()['result']['ratingUpdate']
        self.assertEqual((projected['newScore'], projected['rank'], projected['rankBefore'], projected['delta']), (50, 2, 3, 50))
        self.assertEqual(self.client.get('/api/me', headers=headers).json()['rating'], 50)
