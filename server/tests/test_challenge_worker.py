"""Challenge options and publication policy across the sandbox/commit boundary."""
import json
import unittest
from unittest.mock import patch

from server.tests import test_platform as fixtures
from server.worker import process_job, sandbox


class ChallengeWorkerTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work
    drain = fixtures.PlatformTests.drain

    def update(self, task, **fields):
        response = self.client.patch('/api/admin/tasks/' + task, json=fields, headers=self.admin)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_task_name_length_and_keyword_overrides_reach_real_sandbox(self):
        self.settings(submitCooldownSeconds=0, maxNameLength=2)
        _, headers = self.register()
        task = self.create_task('challenge-options', 1)
        self.update(task, maxNameLength=6, allowedKeywords=['return', 'comefrom'])
        accepted = self.submit_and_work(task, '@solution fn answer(){return 1;}', headers)
        self.assertEqual(accepted['status'], 'OK', accepted)
        for source, expected in [
            ('@solution fn answer(){if(1){return 1;}return 1;}', 'KEYWORD_DISABLED'),
            ('@solution fn answer_answer(){return 1;}', 'NAME_LENGTH'),
        ]:
            result = self.submit_and_work(task, source, headers)
            self.assertEqual(result['status'], 'CE', result)
            self.assertEqual(result['diagnostics'][0]['code'], expected, result)

    def test_choose_button_one_published_name_with_unpublished_parameter(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task('choose-button', 1)
        self.update(task, allowedWords=['red', 'blue'], namePublishLimit=1, maxNameLength=4,
                    tests=[{'input': [1], 'expected': 1}])
        for source in ('@solution fn red(blue){return blue;}', '@solution fn blue(red){return red;}'):
            accepted = self.submit_and_work(task, source, headers)
            self.assertEqual(accepted['status'], 'OK', accepted)
        detail = self.client.get('/api/tasks/' + task, headers=headers).json()
        self.assertEqual(detail['nameBudget']['taskUsed'], 1)
        rejected = self.submit_and_work(task, '@solution fn red(blue){let blue=1;return blue;}', headers)
        self.assertEqual(rejected['diagnostics'][0]['code'], 'TASK_NAME_LIMIT', rejected)
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()['snapshot']['variables'], {})

    def test_account_identifier_budget_stays_cumulative(self):
        self.settings(submitCooldownSeconds=0)
        player, headers = self.register()
        response = self.client.patch('/api/admin/users/' + player['id'], json={'nameLimit': 1}, headers=self.admin)
        self.assertEqual(response.status_code, 200, response.text)
        task = self.create_task('account-budget', 1)
        self.update(task, namePublishLimit=1, allowedWords=['red', 'blue'])
        self.assertEqual(self.submit_and_work(task, '@solution fn red(){return 1;}', headers)['status'], 'OK')
        rejected = self.submit_and_work(task, '@solution fn blue(){return 1;}', headers)
        self.assertEqual(rejected['diagnostics'][0]['code'], 'NAME_LIMIT', rejected)

    def test_worker_rechecks_task_visibility_before_committing(self):
        _, headers = self.register()
        task = self.create_task('closing-event', 1)
        response = self.client.post('/api/tasks/' + task + '/submit', json={'code': '@solution fn solve(){return 1;}'}, headers=headers)
        self.assertEqual(response.status_code, 202, response.text)
        job = self.store.claim()
        def hide_after_sandbox(payload, timeout=None):
            result = sandbox(payload, timeout)
            if payload.get('action') != 'validate':
                # Event visibility can change without incrementing world.version.
                with self.store.transaction() as tx:
                    current = tx.get('tasks', task)
                    current['visibility'] = 'hidden'
                    tx.put('tasks', task, current)
            return result
        with patch('server.worker.sandbox', side_effect=hide_after_sandbox):
            process_job(self.store, job)
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()['snapshot']['functions'], {})
            self.assertEqual(tx.list('submissions'), [])
            status, data = tx.execute('SELECT status,data FROM jobs WHERE id=?', (job['id'],)).fetchone()
            self.assertEqual(status, 'failed')
            self.assertEqual(json.loads(data)['error']['code'], 'UNAVAILABLE')

    def test_editor_fire_setting_preserves_submit_and_recheck_execution(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task('editor-fire', 3)
        self.update(task, datacenterFire=True)
        code = '@solution fn solve(){\nlet first=1;\nfirst=2;first=3;\nreturn first;\n}'
        received = []
        def capture(payload, timeout=None):
            received.append(payload)
            return sandbox(payload, timeout)
        with patch('server.worker.sandbox', side_effect=capture):
            accepted = self.submit_and_work(task, code, headers)
            self.assertEqual(accepted['status'], 'OK', accepted)
            self.update(task, datacenterFire=True)
            self.drain()
        executions = [payload for payload in received if payload.get('action') != 'validate']
        self.assertGreaterEqual(len(executions), 2)
        self.assertTrue(any(payload['options'].get('read_only') for payload in executions))
        for payload in received:
            self.assertNotIn('datacenter_fire', payload['options'])
            self.assertNotIn('datacenter_fire_seed', payload['options'])
        for payload in executions:
            self.assertEqual(payload['code'], code)
        detail = self.client.get('/api/submissions/' + accepted['id'], headers=headers).json()
        self.assertEqual(detail['status'], 'OK', detail)
        self.assertEqual(detail['code'], code)
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()['snapshot']['variables']['first'], 3)
            self.assertIn('first=2;first=3;', tx.world()['snapshot']['functions']['solve']['source'])

    def test_causal_task_fingerprint_tracks_execution_policy(self):
        from server.break_audits import fingerprint
        task = {'tests': [{'input': [], 'expected': 0}]}
        original = fingerprint(task)
        self.assertNotEqual(fingerprint({**task, 'allowedKeywords': ['comefrom']}), original)
        self.assertEqual(fingerprint({**task, 'datacenterFire': True}), original)


if __name__ == '__main__':
    unittest.main()
