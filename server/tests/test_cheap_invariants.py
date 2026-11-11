"""The overload fallback reduces coverage, never the execution boundary."""
import unittest
from unittest.mock import patch

from server.langwarsscript import compile_program, judge, validate_publication
from server.langwarsscript.runtime import Runtime


class CheapInvariantTests(unittest.TestCase):
    def test_reduced_checks_use_substantially_fewer_operator_calls(self):
        function = compile_program('@eq fn <int,int> equal(left,right){return __builtin_eq__(left,right);}'
                                   '@solution fn answer(){return 0;}')
        changes = {"functions": function["functions"]}
        original = Runtime.invoke
        counts = []
        for options in ({}, {"cheap_invariants": False}, {"cheap_invariants": True}):
            calls = []

            def invoke(runtime, definition, args, converted_args=None):
                calls.append(definition["name"])
                return original(runtime, definition, args, converted_args=converted_args)

            with patch.object(Runtime, "invoke", invoke):
                self.assertEqual(validate_publication({}, changes, options), [])
            counts.append(len(calls))
        self.assertEqual(counts[0], counts[1])
        self.assertGreater(counts[0], counts[2] * 10)

    def test_default_rejects_transitivity_bug_that_reduced_corpus_can_miss(self):
        # 0~2 and 2~1, but 0!~1. The fixed fallback corpus omits 2;
        # full checking also includes source constants and catches the bug.
        code = ('@eq fn <int,int> equal(left,right){'
                'if (__builtin_eq__(left,2)) {return 1;}'
                'if (__builtin_eq__(right,2)) {return 1;}'
                'return __builtin_eq__(left,right);}'
                '@solution fn answer(){return 0;}')
        for options in ({}, {"cheap_invariants": False}):
            result = judge(code, [{"input": [], "expected": 0}], options=options)
            self.assertEqual(result["status"], "CE", result)
            self.assertEqual(result["diagnostics"][0]["code"], "CONTRACT", result)
        result = judge(code, [{"input": [], "expected": 0}], options={"cheap_invariants": True})
        self.assertEqual(result["status"], "OK", result)

    def test_reduced_checks_keep_contract_guards_and_builtin_scope(self):
        prefixes = [
            '@eq fn equal(left,right){return 2;}',
            '@length fn <string> size(text){return -1;}',
            '@empty fn <string> blank(text){return 1;}',
            '@concat fn <string,string> join(left,right){return left;}',
            '@truthy fn <int> truth(number){return 1;}',
            '@cast(string) fn <int> text(number){return 1;}',
        ]
        for prefix in prefixes:
            with self.subTest(prefix=prefix):
                result = judge(prefix + '@solution fn answer(){return 0;}',
                               [{"input": [], "expected": 0}], options={"cheap_invariants": True})
                self.assertEqual(result["status"], "CE", result)
                self.assertEqual(result["diagnostics"][0]["code"], "CONTRACT", result)
        invalid_scope = judge('@solution fn answer(){return __builtin_eq__(0,0);}',
                              [{"input": [], "expected": 1}], options={"cheap_invariants": True})
        self.assertEqual(invalid_scope["diagnostics"][0]["code"], "BUILTIN_SCOPE", invalid_scope)

    def test_reduced_checks_keep_actual_value_runtime_guards(self):
        # The fallback misses this negative length away from its corpus, but an
        # actual call still fails before that result can reach player code.
        code = ('@length fn <string> size(text){'
                'if (__builtin_eq__(text,"hidden")) {return -1;}'
                'return __builtin_length__(text);}'
                '@solution fn answer(){return length("hidden");}')
        result = judge(code, [{"input": [], "expected": -1}], options={"cheap_invariants": True})
        self.assertEqual(result["status"], "CE", result)
        self.assertEqual(result["diagnostics"][0]["code"], "CONTRACT", result)


class DependencyTrackingTests(unittest.TestCase):
    def test_implicit_cast_depends_on_future_cast_override(self):
        result = judge('@solution fn answer(){return "cat"+1;}', [{"input": [], "expected": 4}])
        self.assertEqual(result["status"], "OK", result)
        self.assertIn("@cast", result["dependencies"])

    def test_operation_tracks_selected_override_name(self):
        result = judge('@eq fn <int,int> equal(left,right){return __builtin_eq__(left,right);}'
                       '@solution fn answer(){return 1=1;}', [{"input": [], "expected": 1}])
        self.assertEqual(result["status"], "OK", result)
        self.assertIn("@eq", result["dependencies"])
        self.assertIn("equal", result["dependencies"])

    def test_comefrom_tracks_control_topology_and_destination(self):
        result = judge('fn other(){comefrom target;return 7;}'
                       '@solution fn answer(){target:return 0;}', [{"input": [], "expected": 7}])
        self.assertEqual(result["status"], "OK", result)
        self.assertIn("@control", result["dependencies"])
        self.assertIn("other", result["dependencies"])


if __name__ == '__main__':
    unittest.main()
