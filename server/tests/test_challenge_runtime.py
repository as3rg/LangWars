import unittest

from server.langwarsscript import compile_program, judge, validate_publication
from server.langwarsscript.runtime import RESTRICTABLE_KEYWORDS


class ChallengeRuntimeTests(unittest.TestCase):
    def check(self, code, expected=0, *, args=None, snapshot=None, **options):
        result = judge(code, [{"input": args or [], "expected": expected}], snapshot, options)
        self.assertEqual(result["status"], "OK", result)
        return result

    def test_publication_budget_omits_parameters_references_and_unexecuted_declarations(self):
        result = self.check(
            '@solution fn red(blue){if(0){let green=1;}return blue+other;}',
            7, args=[7], max_names=1,
        )
        self.assertEqual(result["publishedNames"], ["red"])
        self.assertEqual(result["names"], ["blue", "green", "other", "red"])
        self.assertEqual(result["changes"]["variables"], {})
        for code in (
            '@solution fn red(){let blue=1;return 0;}',
            'fn blue(){return 0;}@solution fn red(){return 0;}',
        ):
            result = judge(code, [{"input": [], "expected": 0}], options={"max_names": 1})
            self.assertEqual(result["diagnostics"][0]["code"], "TASK_NAME_LIMIT", result)

    def test_budget_counts_dynamic_publication_in_each_test(self):
        result = judge('@solution fn red(blue){if(blue){let green=1;}return 0;}',
                       [{"input": [0], "expected": 0}, {"input": [1], "expected": 0}],
                       options={"max_names": 1})
        self.assertEqual(result["status"], "CE", result)
        self.assertEqual(result["diagnostics"][0]["code"], "TASK_NAME_LIMIT", result)

    def test_choose_your_button_configuration_is_valid(self):
        result = self.check('@solution fn red(blue){return blue;}', 1, args=[1],
                            allowed_words=["red", "blue"], max_name_length=4, max_names=1)
        self.assertEqual(result["publishedNames"], ["red"])
        # Parameters may use the function's name too; binding still shadows it.
        self.check('@solution fn red(red){return red;}', 1, args=[1],
                   allowed_words=["red", "blue"], max_name_length=4, max_names=1)
        invalid = judge('@solution fn red_blue(){return 0;}', [{"input": [], "expected": 0}],
                        options={"allowed_words": ["red", "blue"], "max_name_length": 4})
        self.assertEqual(invalid["diagnostics"][0]["code"], "NAME_LENGTH", invalid)

    def test_parameter_bindings_shadow_shared_values_without_publishing(self):
        snapshot = {"variables": {"blue": 99}, "functions": {}, "last": {"unrelated": 5}}
        result = self.check('fn helper(blue){return blue;}@solution fn red(){helper(7);return blue;}',
                            7, snapshot=snapshot, max_names=2)
        self.assertNotIn("blue", result["changes"]["variables"])
        self.assertNotIn("unrelated", result["changes"]["last"])
        self.assertEqual(result["publishedNames"], ["helper", "red"])
        assigned = self.check('fn helper(blue){blue=blue+1;return blue;}@solution fn red(){return helper(7);}',
                              8, snapshot=snapshot, max_names=3)
        self.assertEqual(assigned["changes"]["variables"]["blue"], 8)
        self.assertEqual(snapshot["variables"]["blue"], 99)

    def test_called_inherited_function_result_spends_one_publication_name(self):
        inherited = compile_program('fn helper(){return 5;}@solution fn old(){return 0;}')
        snapshot = {"variables": {}, "functions": inherited["functions"], "last": {"old": 0, "helper": 5}}
        result = self.check('@solution fn red(){return helper();}', 5, snapshot=snapshot, max_names=2)
        self.assertEqual(result["publishedNames"], ["helper", "red"])
        self.assertEqual(set(result["changes"]["last"]), {"helper", "red"})

    def test_keyword_policy_checks_source_including_unused_and_unreachable_code(self):
        fragments = {
            "let": "let blue=0;return 0;",
            "return": "return 0;",
            "if": "if(0){return 1;}return 0;",
            "else": "if(1){return 0;}else{}",
            "while": "while(0){}return 0;",
            "comefrom": "blue:return 0;comefrom blue;return 0;",
            "and": "return 0 and 1;",
            "or": "return 0 or 0;",
            "not": "return not 1;",
        }
        for keyword, body in fragments.items():
            with self.subTest(keyword=keyword):
                options = {"allowed_keywords": sorted(RESTRICTABLE_KEYWORDS - {keyword})}
                result = judge('fn helper(){' + body + '}@solution fn red(){return 0;}',
                               [{"input": [], "expected": 0}], options=options)
                self.assertEqual(result["diagnostics"][0]["code"], "KEYWORD_DISABLED", result)
        self.check('@solution fn red(){/* if while */return "if while";}', "if while",
                   allowed_keywords=["return"])
        self.check('@solution fn red(){}', allowed_keywords=[])

    def test_comefrom_only_control_flow_is_available(self):
        self.check('@solution fn red(){blue:return 1;comefrom blue;return 2;}', 2,
                   allowed_keywords=["return", "comefrom"])

    def test_keyword_policy_guards_inherited_functions_but_allows_dormant_ones(self):
        compiled = compile_program('fn helper(blue){if(blue){return 1;}return 0;}@solution fn old(){return 0;}')
        snapshot = {"variables": {}, "functions": compiled["functions"], "last": {}}
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                if legacy:
                    for function in snapshot["functions"].values(): function.pop("keywords", None)
                result = judge('@solution fn red(){return helper(1);}', [{"input": [], "expected": 1}],
                               snapshot, {"allowed_keywords": ["return"]})
                self.assertEqual(result["diagnostics"][0]["code"], "KEYWORD_DISABLED", result)
                self.check('@solution fn red(){return 0;}', snapshot=snapshot,
                           allowed_keywords=["return"])

    def test_inherited_parameter_shadow_cannot_erase_keyword_guard(self):
        inherited = compile_program('fn helper(helper){if(1){return 1;}return 0;}@solution fn old(){return 0;}')
        snapshot = {"variables": {}, "functions": inherited["functions"], "last": {}}
        result = judge('@solution fn red(){return helper(1);}', [{"input": [], "expected": 1}],
                       snapshot, {"allowed_keywords": ["return"]})
        self.assertEqual(result["diagnostics"][0]["code"], "KEYWORD_DISABLED", result)

    def test_contract_probes_are_independent_of_challenge_keyword_policy(self):
        inherited = compile_program('@length fn <list> helper(blue){if(0){return 0;}return __builtin_length__(blue);}@solution fn old(){return 0;}')
        snapshot = {"variables": {}, "functions": inherited["functions"], "last": {}}
        for cheap in (False, True):
            with self.subTest(cheap=cheap):
                options = {"allowed_keywords": ["return"], "cheap_invariants": cheap}
                self.check('@solution fn red(){return 0;}', snapshot=snapshot, **options)
                errors = validate_publication({}, {"functions": inherited["functions"]}, options)
                self.assertEqual(errors[0]["code"], "KEYWORD_DISABLED", errors)
                result = judge('@solution fn red(){return length([]);}', [{"input": [], "expected": 0}], snapshot, options)
                self.assertEqual(result["diagnostics"][0]["code"], "KEYWORD_DISABLED", result)

    def test_inherited_comefrom_cannot_bypass_function_keyword_guards(self):
        inherited = compile_program('fn helper(){comefrom blue;if(1){return 3;}}fn target(){blue:return 2;}@solution fn old(){return 0;}')
        snapshot = {"variables": {}, "functions": inherited["functions"], "last": {}}
        allowed = self.check('@solution fn red(){return target();}', 3, snapshot=snapshot,
                             allowed_keywords=["return", "comefrom", "if"])
        self.assertTrue({"@control", "helper", "target"} <= set(allowed["dependencies"]))
        result = judge('@solution fn red(){return target();}', [{"input": [], "expected": 3}],
                       snapshot, {"allowed_keywords": ["return", "comefrom"]})
        self.assertEqual(result["diagnostics"][0]["code"], "KEYWORD_DISABLED", result)
        result = judge('@solution fn red(){return target();}', [{"input": [], "expected": 3}],
                       snapshot, {"allowed_keywords": ["return", "if"]})
        self.assertEqual(result["diagnostics"][0]["code"], "KEYWORD_DISABLED", result)

    def test_editor_fire_does_not_change_judging_even_with_legacy_options(self):
        code = '@solution fn red(){\nlet blue=1;\nblue=2;blue=3;\nreturn blue;\n}'
        ordinary = self.check(code, 3)
        legacy = self.check(code, 3, datacenter_fire=True, datacenter_fire_seed='legacy-seed')
        self.assertEqual(legacy["changes"], ordinary["changes"])
        self.assertEqual(legacy["changes"]["variables"]["blue"], 3)
        self.assertIn('blue=2;blue=3;', legacy["changes"]["functions"]["red"]["source"])


if __name__ == '__main__':
    unittest.main()
