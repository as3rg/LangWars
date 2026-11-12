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

    def test_seed_translations_keep_examples_public_and_program_inputs_unchanged(self):
        import json
        for task in initial_tasks():
            with self.subTest(task=task["id"]):
                self.assertEqual(set(task["translations"]), {"en", "ru"})
                public = [case for case in task["tests"] if not case.get("hidden")]
                for language, translation in task["translations"].items():
                    self.assertTrue(translation["title"])
                    self.assertTrue(translation["statement"])
                    self.assertEqual(len(translation["constraints"]), len(task["constraints"]))
                    self.assertEqual(len(translation["examples"]), len(public))
                    for example, case in zip(translation["examples"], public):
                        self.assertEqual(json.loads(example["input"]), case["input"])
                        self.assertEqual(json.loads(example["output"]), case["expected"])
                self.assertNotEqual(task["translations"]["en"]["title"], task["translations"]["ru"]["title"])

    def test_existing_installation_only_backfills_untouched_seed_translations(self):
        import tempfile
        from pathlib import Path
        from server.store import Store
        with tempfile.TemporaryDirectory() as folder:
            store = Store("sqlite:///" + str(Path(folder) / "world.db"))
            store.initialize()
            with store.transaction() as tx:
                original = tx.get("tasks", "shared-sum")
                original.pop("translations")
                tx.put("tasks", original["id"], original)
                custom = tx.get("tasks", "cyclic-access")
                custom.pop("translations")
                custom["constraints"] = ["An administrator changed the requirements."]
                tx.put("tasks", custom["id"], custom)
                translated = tx.get("tasks", "list-sum")
                translated["translations"] = {"ru": {"title": "Свой перевод", "statement": "Свои условия", "constraints": []}}
                tx.put("tasks", translated["id"], translated)
                world = tx.world()
                world["version"] = 7
                world["snapshot"]["variables"]["answer"] = 42
                world["settings"].pop("resubmitPenaltyEnabled", None)
                world["settings"].pop("resubmitPenaltyPercent", None)
                tx.save_world(world)
            store.initialize()
            store.initialize()
            with store.transaction() as tx:
                self.assertEqual(set(tx.get("tasks", "shared-sum")["translations"]), {"en", "ru"})
                self.assertNotIn("translations", tx.get("tasks", "cyclic-access"))
                self.assertEqual(tx.get("tasks", "list-sum")["translations"], translated["translations"])
                current = tx.world()
                self.assertEqual(current["version"], 8)
                self.assertEqual(current["snapshot"], world["snapshot"])
                self.assertFalse(current["settings"]["resubmitPenaltyEnabled"])
                self.assertEqual(current["settings"]["resubmitPenaltyPercent"], 5)

    def test_legacy_parameter_copy_refresh_preserves_authored_translations(self):
        import copy
        from server.seed import refresh_seed_language_copy
        seeded = initial_tasks()[0]
        legacy = copy.deepcopy(seeded)
        legacy['constraints'][2] = 'All names, including parameters, are global.'
        legacy['translations']['en']['constraints'][2] = 'All names, including parameters, are global.'
        legacy['translations']['ru']['constraints'] = ['Авторское ограничение.']
        refresh_seed_language_copy(legacy, seeded)
        self.assertEqual(legacy['constraints'], seeded['constraints'])
        self.assertEqual(legacy['translations']['en']['constraints'], seeded['translations']['en']['constraints'])
        self.assertEqual(legacy['translations']['ru']['constraints'], ['Авторское ограничение.'])
        unchanged = copy.deepcopy(legacy)
        refresh_seed_language_copy(legacy, seeded)
        self.assertEqual(legacy, unchanged)


if __name__ == "__main__":
    unittest.main()
