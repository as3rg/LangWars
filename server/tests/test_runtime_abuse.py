"""Independent deterministic adversarial and arithmetic checks for the runtime boundary."""
import copy
import random
import unittest

from server.langwarsscript import judge


class RuntimeAbuseTests(unittest.TestCase):
    def result(self, expression, expected=0, prefix=""):
        code = prefix + "\n@solution\nfn answer() { return " + expression + "; }"
        return judge(code, [{"input": [], "expected": expected}], options={"max_steps": 10000})

    def test_arithmetic_against_integer_oracle(self):
        rng = random.Random(35179)
        wrap = lambda value: (value + 1000000) % 2000001 - 1000000
        for _ in range(120):
            left, right = rng.randint(-1000000, 1000000), rng.randint(-1000000, 1000000)
            operation = rng.choice(["+", "-", "*", "/", "%"])
            expected = {
                "+": lambda: left + right,
                "-": lambda: left - right,
                "*": lambda: left * right,
                "/": lambda: left // right if right else 42,
                "%": lambda: left % abs(right) if right else 42,
            }[operation]()
            with self.subTest(left=left, right=right, operation=operation):
                result = self.result(f"({left}) {operation} ({right})", wrap(expected))
                self.assertEqual(result["status"], "OK", result)

    def test_host_syntax_is_rejected_and_strings_are_inert(self):
        for source in [
            'import os;', '__import__("os");', 'open("/etc/passwd");',
            '@solution fn answer() { return value.__class__; }',
            '@solution fn answer() { return 1 == 1; }',
        ]:
            with self.subTest(source=source):
                result = judge(source, [{"input": [], "expected": 0}])
                self.assertEqual(result["status"], "CE", result)
                self.assertTrue(result.get("diagnostics"))
        result = self.result('"__import__(\\\"os\\\").system(\\\"echo bad\\\")"', '__import__("os").system("echo bad")')
        self.assertEqual(result["status"], "OK", result)
        # Unknown names are zero in this language; a host-looking call stays inert.
        self.assertEqual(self.result('eval("1+1")', 0)["status"], "OK")

    def test_malformed_source_always_returns_a_structured_verdict(self):
        rng = random.Random(6889)
        fragments = ['@solution', 'fn', 'let', 'return', 'while', 'comefrom', 'answer', '(', ')', '{', '}', '[', ']', ':', ';', '=', '==', '"', '\\', '0', '9999999999999999999999', '\x00', '🙂', 'and', '__builtin_eq__']
        for index in range(300):
            source = ' '.join(rng.choices(fragments, k=rng.randrange(1, 75)))
            result = judge(source, [{"input": [], "expected": 0}], options={"max_steps": 1000})
            self.assertIn(result["status"], {"OK", "CE", "TLE", "WRONG_ANSWER", "FAIL"}, (index, result))
            self.assertIsInstance(result.get("diagnostics", []), list)

    def test_extreme_syntax_is_bounded(self):
        for expression in ['(' * 3000 + '0' + ')' * 3000, '[' * 3000 + '0' + ']' * 3000, 'not ' * 3000 + '0']:
            result = self.result(expression)
            self.assertIn(result["status"], {"CE", "TLE"}, result)
        expected = (pow(10, 6000, 2000001) - 1 + 1000000) % 2000001 - 1000000
        self.assertEqual(self.result('9' * 6000, expected)["status"], "OK")

    def test_recursion_and_loops_are_bounded(self):
        for source in [
            '@solution fn answer() { while (1) { } return 0; }',
            '@solution fn answer() { return answer(); }',
        ]:
            result = judge(source, [{"input": [], "expected": 0}], options={"max_steps": 1000})
            self.assertIn(result["status"], {"TLE", "CE"}, result)

    def test_short_circuit_does_not_enter_infinite_function(self):
        prefix = 'fn forever() { while (1) { } return 0; }'
        self.assertEqual(self.result('0 and forever()', 0, prefix)["status"], "OK")
        self.assertEqual(self.result('1 or forever()', 1, prefix)["status"], "OK")

    def test_snapshot_is_not_mutated_by_a_run(self):
        snapshot = {"variables": {"items": [1, 2]}, "functions": {}, "last": {}}
        before = copy.deepcopy(snapshot)
        result = judge('@solution fn answer() { set(items, 0, 99); return get(items, 0); }', [{"input": [], "expected": 99}], snapshot)
        self.assertEqual(result["status"], "OK", result)
        self.assertEqual(snapshot, before)


if __name__ == "__main__":
    unittest.main()
