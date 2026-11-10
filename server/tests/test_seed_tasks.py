import random
import unittest

from server.langwarsscript import judge
from server.seed import initial_tasks, initial_world
from server.tests.task_solutions import TASK_SOLUTIONS


class SeedTaskTests(unittest.TestCase):
    def setUp(self):
        self.world = initial_world()
        self.options = {
            "allowed_words": self.world["settings"]["allowedWords"],
            "max_name_length": self.world["settings"]["maxNameLength"],
            "max_steps": 200000,
            "timeout_ms": 1000,
        }

    def test_first_release_is_invite_only_and_shared_values_are_private(self):
        settings = self.world["settings"]
        self.assertEqual(settings["registrationMode"], "invite")
        for category in ("variables", "functions"):
            self.assertEqual(settings["worldVisibility"][category], {"names": "public", "values": "admin_only"})

    def test_all_seed_tasks_have_unsolved_starters_and_checked_solutions(self):
        tasks = initial_tasks()
        self.assertEqual(len(tasks), 10)
        self.assertEqual(len({task["entryPoint"] for task in tasks}), 10)
        self.assertEqual(set(TASK_SOLUTIONS), {task["id"] for task in tasks})
        for task in tasks:
            with self.subTest(task=task["id"]):
                self.assertTrue(any(case.get("hidden") for case in task["tests"]))
                self.assertGreaterEqual(len(task["examples"]), 2)
                starter = judge(task["starterCode"], task["tests"], self.world["snapshot"], self.options)
                self.assertEqual(starter["status"], "WRONG_ANSWER", starter)
                reference = judge(TASK_SOLUTIONS[task["id"]], task["tests"], self.world["snapshot"], self.options)
                self.assertEqual(reference["status"], "OK", reference)

    def test_running_median_reference_handles_full_constraint(self):
        rng = random.Random(173)
        items = [rng.randint(-1000000, 1000000) for _ in range(25)]
        expected = [sorted(items[:size])[(size - 1) // 2] for size in range(1, 26)]
        result = judge(TASK_SOLUTIONS["running-median"], [{"input": [items], "expected": expected}], options=self.options)
        self.assertEqual(result["status"], "OK", result)


if __name__ == "__main__":
    unittest.main()
