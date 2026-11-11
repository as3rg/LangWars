"""Independent comparison backpressure, cached visibility and late publication races."""
import unittest
from unittest.mock import patch

from server.break_audits import MAX_PENDING_AUDITS
from server.store import iso
from server.telemetry import snapshot
from server.tests import test_platform as fixtures
from server.worker import process_job


class StressAdmissionTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task

    def fill_audits(self, count):
        with self.store.transaction() as tx:
            for index in range(count):
                key = 'audit_' + str(index)
                tx.put('break_audits', key, {'id': key, 'createdAt': iso(), 'total': 85, 'cursor': 0})

    @patch('server.telemetry.CACHE_SECONDS', 3600)
    def test_free_foreground_slots_do_not_bypass_audit_gate_and_cache_is_only_advisory(self):
        self.settings(runCooldownSeconds=0, submitCooldownSeconds=0)
        player, headers = self.register()
        self.fill_audits(MAX_PENDING_AUDITS - 1)
        cached = self.client.get('/api/admin/performance', headers=self.admin).json()
        self.assertEqual(cached['admission'], {'runAllowed': True, 'submitAllowed': True, 'reasons': []})
        self.fill_audits(MAX_PENDING_AUDITS)
        source = {'code': '@solution fn answer(){return 0;}'}
        rejected = self.client.post('/api/tasks/shared-sum/submit', json=source, headers=headers)
        self.assertEqual(rejected.status_code, 429, rejected.text)
        error = rejected.json()['error']
        self.assertEqual((error['code'], error['pendingAudits'], error['capacity']), ('NOTIFICATION_BACKLOG', 32, 32))
        self.assertIn('(32/32)', error['message'])
        self.assertEqual(rejected.headers['Retry-After'], '5')
        self.assertTrue(self.client.get('/api/admin/performance', headers=self.admin).json()['admission']['submitAllowed'])
        actual = snapshot(self.store, force=True)
        self.assertEqual(actual['queue']['admissionUsed'], 0)
        self.assertEqual(actual['admission'], {'runAllowed': True, 'submitAllowed': False, 'reasons': ['NOTIFICATION_BACKLOG']})
        self.assertEqual(actual['audits']['remainingCandidates'], 2720)
        self.assertGreaterEqual(actual['audits']['oldestPendingSeconds'], 0)
        self.assertEqual(self.client.post('/api/tasks/shared-sum/run', json=source, headers=headers).status_code, 202)
        with self.store.transaction() as tx:
            user = tx.get('users', player['id'])
            self.assertEqual(user.get('submissionPenalties', 0), 0)
            self.assertEqual(tx.execute("SELECT COUNT(*) FROM jobs WHERE mode='submit'").fetchone()[0], 0)

    def test_full_foreground_queue_blocks_both_independently(self):
        self.settings(runCooldownSeconds=0, maxQueuedJobs=1)
        _, headers = self.register()
        source = {'code': '@solution fn answer(){return 0;}'}
        self.assertEqual(self.client.post('/api/tasks/shared-sum/run', json=source, headers=headers).status_code, 202)
        actual = snapshot(self.store, force=True)
        self.assertEqual(actual['admission'], {'runAllowed': False, 'submitAllowed': False, 'reasons': ['QUEUE_FULL']})
        self.fill_audits(MAX_PENDING_AUDITS)
        actual = snapshot(self.store, force=True)
        self.assertEqual(set(actual['admission']['reasons']), {'QUEUE_FULL', 'NOTIFICATION_BACKLOG'})

    def test_an_admitted_submission_can_hit_the_comparison_limit_at_publication(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task('late-capacity', 1)
        response = self.client.post('/api/tasks/' + task + '/submit', json={'code': '@solution fn answer(){return 1;}'}, headers=headers)
        self.assertEqual(response.status_code, 202, response.text)
        self.fill_audits(MAX_PENDING_AUDITS)
        process_job(self.store, self.store.claim())
        result = self.client.get('/api/jobs/' + response.json()['jobId'], headers=headers).json()['result']['submission']
        self.assertEqual(result['status'], 'FAIL')
        self.assertEqual(result['diagnostics'][0]['code'], 'NOTIFICATION_BACKLOG')
        self.assertIn('solution comparisons are full', result['diagnostics'][0]['message'])
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()['snapshot']['functions'], {})


if __name__ == '__main__':
    unittest.main()
