import unittest
from server.langwarsscript import judge, compile_program, validate_publication
from server.langwarsscript.runtime import merge_snapshot


class LanguageTests(unittest.TestCase):
    def run_code(self, body, expected, args=None, prefix="", options=None):
        return judge(prefix + "\n@solution fn solve(left,right) {" + body + "}", [{"input": args or [], "expected": expected}], options=options)

    def assert_ok(self, body, expected, **kwargs):
        result = self.run_code(body, expected, **kwargs)
        self.assertEqual(result["status"], "OK", result)
        return result

    def test_integer_semantics(self):
        self.assert_ok("return 1000000 + 1;", -1000000)
        self.assert_ok("return -7 / 3;", -3)
        self.assert_ok("return 7 / -3;", -3)
        self.assert_ok("return -7 % -3;", 2)
        self.assert_ok("return 1 / 0 + 8 % 0;", 84)
        self.assert_ok("return 10 - 3 - 2;", 5)

    def test_comparisons_and_precedence(self):
        self.assert_ok("return 1 + 2 * 3 = 7 and not 0;", 1)
        self.assert_ok("return 3 > 2 and 2 <= 2 and 2 != 3;", 1)
        self.assertEqual(self.run_code("return 1 == 1;", 1)["status"], "CE")

    def test_collection_reference_and_wrap(self):
        self.assert_ok("let array = [1,2,3]; let other = array; set(other,-1,9); return get(array,5);", 9)
        self.assert_ok("let array = []; set(array,999,7); return get(array,-1);", 7)
        self.assert_ok('return get("cat",-1);', "t")
        self.assert_ok('return get("",5);', "")
        self.assert_ok('return get([],5);', 0)
        self.assert_ok('let word = "cat"; set(word,0,"dog"); return word;', "cat")

    def test_dictionary_values_and_self(self):
        self.assert_ok("let data = {}; get(data,[1]); return length(data);", 1)
        self.assert_ok("let data = {[1]:3}; set(data,[1],5); return length(data) + get(data,[1]);", 6)
        self.assert_ok("return {1:2,3:4} = {3:4,1:2};", 1)
        self.assert_ok("let array = []; push_back(array,array); return length(get(array,0));", 0)
        self.assert_ok("let data = {}; set(data,0,data); return length(get(data,0));", 0)

    def test_cast_matrix(self):
        self.assert_ok('return int("123");', 3)
        self.assert_ok("return int([1,2,[3]]);", 6)
        self.assert_ok("return int({2:3,4:5});", 26)
        self.assert_ok('return list("cat");', ["c", "a", "t"])
        self.assert_ok("return list({1:2,3:4});", [1,3,2,4])
        self.assert_ok("return length(dict([1,1,2]));", 2)
        self.assert_ok('return string([1,2,3]);', "[1,2,3]")

    def test_functions_global_parameters_varargs_last_result(self):
        self.assert_ok("return helper(1);", 1, prefix="fn helper(first,second) { return first + second; }")
        self.assert_ok("helper(2,3,4); return helper;", 5, prefix="fn helper(first,second) { return first + second; }")
        self.assert_ok("helper(7); return first;", 7, prefix="fn helper(first) { return first; }")
        self.assert_ok("let number = 8; return number(1,2);", 8)
        self.assert_ok("return helper(\"abc\");", 3, prefix="fn <int> helper(first) { return first; }")
        self.assert_ok("return helper();", 0, prefix="fn helper() { let result = 7; }")

    def test_control_flow_and_nested_jumps(self):
        self.assert_ok("let index = 0; let total = 0; while(index < 4) { if(index % 2 = 0) { total = total + 2; } else { total = total + 1; } index = index + 1; } return total;", 6)
        self.assert_ok("if(0) { return 1; } else if(1) { return 2; } else { return 3; }", 2)

    def test_comefrom_label_cross_function_and_unknown(self):
        self.assert_ok("target: return 5; comefrom target; return 7;", 7)
        self.assert_ok("target: return 5;", 9, prefix="fn helper() { comefrom target; return 9; }")
        self.assert_ok("target: let number = 8; comefrom target; return number;", 0)
        self.assertEqual(self.run_code("comefrom absent; return 0;", 0)["status"], "CE")
        self.assertEqual(self.run_code("comefrom 999; return 0;", 0)["status"], "CE")

    def test_core_overrides_and_contracts(self):
        self.assert_ok("return 1 = 2;", 1, prefix="@eq fn <int,int> equal(first,second) { return 1; }")
        self.assertEqual(self.run_code("return 1;", 1, prefix="@eq fn <int,int> equal(first,second) { return 0; }")["status"], "CE")
        self.assert_ok("return 2 = 2;", 1, prefix="@eq fn <int,int> equal(first,second) { return __builtin_eq__(first,second); }")
        self.assertEqual(self.run_code("return 1;", 1, prefix="@eq fn equal(first,second) { return helper(first); }")["status"], "CE")
        self.assertEqual(self.run_code("return 1;", 1, prefix="@eq fn equal(first,second) { return int(first); }")["status"], "CE")
        self.assertEqual(self.run_code("return 1;", 1, prefix='@eq fn <int,string> equal(first,second) { return __builtin_eq__(first,second); }')["status"], "CE")

    def test_cast_override(self):
        self.assert_ok("return list(7);", [42], prefix="@cast(list) fn <int> change(first) { return [42]; }")
        self.assertEqual(self.run_code("return 1;", 1, prefix="@cast(list) fn <int> change(first) { return 7; }")["status"], "CE")

    def test_static_validation(self):
        for code in ("fn solve(){return 1;}", "@solution fn solve(){let number=1;let number=2;return 1;}", "@solution fn solve(){return 1.5;}", "@solution fn eq(){return 0;}", "@solution fn solve(){let digit_two=1;return 0;} @solution fn other(){return 0;}"):
            self.assertEqual(judge(code, [{"input":[],"expected":0}])["status"], "CE")
        self.assertEqual(self.run_code("return 1;", 1, options={"allowed_words":["other"]})["status"], "CE")
        self.assertEqual(self.run_code("return 1;", 1, prefix="@eq fn equal(first,second){return 1;}", options={"permitted_overrides":[]})["status"], "CE")

    def test_shared_overlay_recheck_and_no_publication(self):
        code = "@solution fn solve(){ let answer = 10; return answer + 1; }"
        first = judge(code, [{"input":[],"expected":11}])
        self.assertEqual(first["status"], "OK", first)
        state = merge_snapshot({}, first["changes"])
        state["variables"]["answer"] = 50
        recheck = judge(code, [{"input":[],"expected":11}], state, {"read_only":True,"overlay_names":["answer"]})
        self.assertEqual(recheck["status"], "WRONG_ANSWER", recheck)
        self.assertEqual(recheck["tests"][0]["actual"], "51")
        self.assertEqual(recheck["changes"], {})

    def test_contract_shadowing_publication(self):
        code = "@eq fn <int,int> equal(first,second){let middle=first;return __builtin_eq__(middle,second);}\n@solution fn solve(){return 1;}"
        first = judge(code, [{"input":[],"expected":1}])
        self.assertEqual(first["status"], "OK", first)
        state = merge_snapshot({}, first["changes"])
        errors = validate_publication(state, {"variables":{"middle":42}})
        self.assertTrue(errors)
        self.assertIn("middle", errors[0]["message"])
        self.assertIn("@eq", errors[0]["message"])
        self.assertNotIn("equal", errors[0]["message"])

    def test_resource_limits(self):
        self.assertEqual(self.run_code("while(1){} return 0;", 0, options={"max_steps":1000})["status"], "TLE")
        self.assertEqual(self.run_code("return helper();", 0, prefix="fn helper(){return helper();}")["status"], "TLE")
        self.assertEqual(self.run_code("let array=[]; while(1){push_back(array,1);} return 0;", 0, options={"max_steps":100000,"max_cells":1000})["status"], "TLE")
        result = self.run_code("let left_array=[];let right_array=[];push_back(left_array,right_array);push_back(right_array,left_array);return int(left_array);", 0)
        self.assertEqual(result["status"], "TLE", result)

    def test_empty_dictionary_policy_and_case(self):
        self.assertEqual(self.run_code("return 0;", 0, options={"allowed_words": []})["status"], "CE")
        self.assert_ok("return left;", 3, args=[3], options={"allowed_words": ["SOLVE", "LEFT", "RIGHT"]})

    def test_builtin_domains_and_source_tie_order(self):
        override = "@eq fn <int,int> equal(first,second){return 1;}"
        self.assert_ok("return [1] = [2];", 0, prefix=override)
        self.assert_ok('return "a" = "b";', 0, prefix=override)
        self.assert_ok("return 1 = 2;", 1, prefix=override)
        second = "@eq fn <int,int> other(third,fourth){return __builtin_eq__(third,fourth);}"
        self.assert_ok("return 1 = 2;", 1, prefix=override + second)

    def test_frozen_overlay_blocks_alias_and_nested_mutations(self):
        snapshot = {"variables": {"items": [[1], 2]}, "functions": {}, "last": {}}
        code = "@solution fn solve(){let alias=items;set(alias,1,9);push_back(get(alias,0),7);return items;}"
        result = judge(code, [{"input": [], "expected": [[1],2]}], snapshot, {"read_only": True, "overlay_names": ["items"]})
        self.assertEqual(result["status"], "OK", result)
        self.assertEqual(result["changes"], {})

    def test_snapshot_mutation_is_in_publication(self):
        snapshot = {"variables": {"items": [1,2]}, "functions": {}, "last": {}}
        result = judge("@solution fn solve(){let alias=items;set(alias,0,8);return 1;}", [{"input": [], "expected": 1}], snapshot)
        self.assertEqual(result["status"], "OK", result)
        self.assertEqual(result["changes"]["variables"]["items"], [8,2])

    def test_escaped_deny_words_are_moderated(self):
        result = self.run_code('return "\\u0062\\u0061\\u0064";', "bad", options={"deny_words": ["BAD"]})
        self.assertEqual(result["status"], "CE", result)
        self.assertEqual(result["diagnostics"][0]["code"], "DENIED_WORD")

    def test_latest_override_survives_recheck(self):
        old = "@eq fn <int,int> equal(first,second){return __builtin_eq__(first,second);}@solution fn solve(){return 1 = 2;}"
        first = judge(old, [{"input": [], "expected": 0}])
        state = merge_snapshot({}, first["changes"])
        new = "@eq fn <int,int> change(third,fourth){return 1;}@solution fn other(){return 1;}"
        second = judge(new, [{"input": [], "expected": 1}], state)
        self.assertEqual(second["status"], "OK", second)
        state = merge_snapshot(state, second["changes"])
        result = judge(old, [{"input": [], "expected": 0}], state, {"read_only": True, "overlay_names": ["change", "other"]})
        self.assertEqual(result["status"], "WRONG_ANSWER", result)

    def test_string_tokens_cannot_impersonate_syntax(self):
        for code in ('@"solution" fn solve(){return 0;}', '@solution fn <"int"> solve(left){return 0;}', '@solution fn solve"(" ")" {return 0;}', '@solution fn solve(){return 1 "+" 2;}'):
            result = judge(code, [{"input": [], "expected": 0}])
            self.assertEqual(result["status"], "CE", result)
        for value in ("not", "-", "if", ")", "[", "fn"):
            self.assert_ok("return " + __import__("json").dumps(value) + ";", value)

    def test_function_values_use_int_during_adl(self):
        self.assert_ok("helper(); return helper = 3;", 1, prefix='fn helper(){return "cat";}')
        self.assert_ok("helper(); return eq(helper,3);", 1, prefix='fn helper(){return "cat";}')
        self.assert_ok("helper(); return helper;", "cat", prefix='fn helper(){return "cat";}')

    def test_builtin_concat_bypasses_overrides_and_is_allowed_in_contracts(self):
        override = '@concat fn <string,string> change(first,second){return "changed";}'
        self.assert_ok('return concat("a","b");', "changed", prefix=override)
        self.assert_ok('return __builtin_concat__("a","b");', "ab", prefix=override)
        self.assert_ok('return concat("a","b");', "ab", prefix='@concat fn <string,string> change(first,second){return __builtin_concat__(first,second);}')
        self.assert_ok('return __builtin_concat__("🙂","");', "🙂")
        self.assertEqual(self.run_code('return __builtin_concat__(12,"b");', "12b")["status"], "CE")
        self.assertEqual(self.run_code('return __builtin_concat__("a");', "a")["status"], "CE")
        self.assertEqual(judge('@solution fn __builtin_concat__(){return "";}', [{"input": [], "expected": ""}])["status"], "CE")

    def test_builtin_concat_has_string_and_allocation_bounds(self):
        from server.langwarsscript.runtime import Runtime, Exhausted
        runtime = Runtime({"functions": {}, "top": [], "names": []}, options={"max_cells": 200000})
        value = runtime.call("__builtin_concat__", ["a" * 700000, "b" * 700000])
        self.assertEqual(len(value), 1000000)
        self.assertTrue(value.endswith("b" * 300000))
        runtime = Runtime({"functions": {}, "top": [], "names": []}, options={"max_cells": 1000})
        with self.assertRaises(Exhausted):
            runtime.call("__builtin_concat__", ["a" * 10000, "b" * 10000])

    def test_name_length_policy_covers_every_custom_name(self):
        for code in [
            '@solution fn abcde(){return 0;}',
            '@solution fn a(abcde){return 0;}',
            '@solution fn a(){let abcde=0;return 0;}',
            '@solution fn a(){abcde: return 0;}',
            '@solution fn a(){return abcde;}',
            '@solution fn a(){return abcde();}',
        ]:
            result = judge(code, [{"input": [], "expected": 0}], options={"max_name_length": 4})
            self.assertEqual(result["status"], "CE", result)
            self.assertEqual(result["diagnostics"][0]["code"], "NAME_LENGTH", result)
        result = judge('@solution fn a(){return __builtin_concat__("x","y");}', [{"input": [], "expected": "xy"}], options={"max_name_length": 1})
        self.assertEqual(result["status"], "OK", result)
        result = judge('@solution fn abcde(){return 0;}', [{"input": [], "expected": 0}], options={"max_name_length": 5})
        self.assertEqual(result["status"], "OK", result)
        result = judge('@solution fn abcde(){return 0;}', [{"input": [], "expected": 0}], options={"max_name_length": None})
        self.assertEqual(result["status"], "OK", result)

if __name__ == "__main__": unittest.main()
