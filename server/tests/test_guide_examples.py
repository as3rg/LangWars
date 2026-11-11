"""Execute the actual player-guide snippets rather than duplicate their source."""
import ast
from pathlib import Path
import re
import unittest

from server.langwarsscript import judge
from server.langwarsscript.runtime import merge_snapshot


def guide_examples():
    guide = (Path(__file__).resolve().parents[2] / "frontend" / "src" / "components" / "LanguageGuide.tsx").read_text(encoding="utf-8")
    examples = re.search(r"export const guideExamples = \[(.*?)\n\]", guide, re.DOTALL)
    if examples is None:
        raise AssertionError("The player guide must export its executable examples")
    return [ast.literal_eval(literal) for literal in re.findall(r"'(?:[^'\\]|\\.)*'", examples.group(1))]


class GuideExamplesTests(unittest.TestCase):
    def test_every_guide_example_runs_with_its_described_semantics(self):
        examples = guide_examples()
        cases = [
            [([2, 3], 5)],
            [([[1, 2, 3]], 6), ([[]], 0)],
            [([9], 10), ([], 1)],
            [([], 10)],
            [([], 99)],
            [([1, 2], 0), ([2, 2], 1)],
            [([], 7)],
            [([], 42)],
            [([], 3)],
            [([7], [42]), ([[7]], [7])],
        ]
        self.assertEqual(len(examples), len(cases), "New examples need semantic expectations")
        for index, (code, tests) in enumerate(zip(examples, cases)):
            with self.subTest(example=index):
                result = judge(code, [{"input": args, "expected": expected} for args, expected in tests])
                self.assertEqual(result["status"], "OK", result)
                self.assertTrue(all(test["passed"] for test in result["tests"]), result)

    def test_shared_name_example_breaks_the_original_solution_after_publication(self):
        examples = guide_examples()
        first = judge(examples[3], [{"input": [], "expected": 10}])
        self.assertEqual(first["status"], "OK", first)
        second = judge(examples[4], [{"input": [], "expected": 99}], snapshot=first["changes"])
        self.assertEqual(second["status"], "OK", second)
        world = merge_snapshot(first["changes"], second["changes"])
        result = judge(examples[3], [{"input": [], "expected": 10}], snapshot=world,
                       options={"read_only": True, "overlay_names": ["shared", "next_answer"]})
        self.assertEqual(result["status"], "WRONG_ANSWER", result)
        self.assertEqual(result["tests"][0]["actual"], "99", result)
        self.assertEqual(result["changes"], {}, result)


if __name__ == '__main__':
    unittest.main()
