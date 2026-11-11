"""Independent regression checks for the November spec's boundary changes."""
import unittest

from server.langwarsscript import judge, validate_publication
from server.langwarsscript.runtime import Parser


class SpecRevisionEdgesTests(unittest.TestCase):
    def assert_program(self, code, expected, args=None, snapshot=None, options=None):
        result = judge(code, [{"input": args or [], "expected": expected}], snapshot, options)
        self.assertEqual(result["status"], "OK", result)
        return result

    def test_unknown_assignment_is_a_nop_but_evaluates_rhs_and_keeps_mutations(self):
        result = self.assert_program(
            'fn helper(){let touched=7;return 42;} '
            '@solution fn solve(){let items=[1];missing=helper();unused=push_back(items,2);return [missing,touched,items];}',
            [0, 7, [1, 2]],
        )
        self.assertNotIn("missing", result["changes"]["variables"])
        self.assertNotIn("unused", result["changes"]["variables"])
        self.assertEqual(result["changes"]["variables"]["touched"], 7)
        top = self.assert_program('phantom=7;@solution fn solve(){return phantom;}', 0)
        self.assertNotIn("phantom", top["changes"]["variables"])

    def test_existing_assignment_and_frozen_overlay_keep_their_semantics(self):
        self.assert_program('fn helper(){return 1;}@solution fn solve(){helper=9;return helper;}', 9)
        snapshot = {"variables": {"answer": 1}, "functions": {}, "last": {}}
        code = 'answer=2;@solution fn solve(){return answer;}'
        self.assert_program(code, 2, snapshot=snapshot)
        frozen = self.assert_program(code, 1, snapshot=snapshot, options={"read_only": True, "overlay_names": ["answer"]})
        self.assertEqual(frozen["changes"], {})

    def test_builtin_contains_bypasses_user_equality_and_contains_overrides(self):
        prefix = '@eq fn <int,int> equal(left,right){return 1;}@contains fn <list,int> changed(items,value){return 1;}'
        code = prefix + '@cast(int) fn <list> probe(data){return __builtin_contains__(data,2);}@solution fn solve(){return [contains([1],2),probe([1]),probe([2])];}'
        self.assert_program(code, [1, 0, 1])
        dictionary = '@eq fn <int,int> equal(left,right){return 1;}@cast(int) fn <dict> probe(data){return __builtin_contains__(data,3);}@solution fn solve(items){return [contains(items,3),probe(items)];}'
        self.assert_program(dictionary, [1, 0], args=[{"$dict": [[1, "one"], [2, "two"]]}])

    def test_builtin_contains_has_typed_recursive_equality_and_dict_keys_only(self):
        self.assert_program('@cast(int) fn <list> probe(items){return __builtin_contains__(items,[2]);}@solution fn solve(){return [probe([[2]]),probe([["2"]]),probe([2])];}', [1, 0, 0])
        self.assert_program('@cast(int) fn <dict> probe(data){return __builtin_contains__(data,"cat");}@solution fn solve(){let data={"dog":"cat"};return [probe(data),length(data)];}', [0, 1])
        self.assert_program('@cast(int) fn <string> probe(text){return __builtin_contains__(text,"🙂");}@solution fn solve(){return [probe("a🙂b"),probe("cat")];}', [1, 0])
        self.assert_program('@cast(int) fn <string> probe(text){return __builtin_contains__(text,"");}@solution fn solve(){return probe("");}', 1)

    def test_disabled_contains_override_does_not_disable_the_builtin_escape(self):
        code = '@cast(int) fn <list> probe(items){return __builtin_contains__(items,1);}@solution fn solve(){return probe([1]);}'
        self.assert_program(code, 1, options={"permitted_overrides": ["cast"]})

    def test_identity_dictionary_length_survives_the_random_contract_corpus(self):
        code = '@length fn <dict> size(data){return __builtin_length__(data);}@solution fn solve(items){return length(items);}'
        for data, expected in (({"$dict": []}, 0), ({"$dict": [[1, 2], [3, 4]]}, 2), ({"$dict": [["cat", 2], ["dog", 4]]}, 2)):
            with self.subTest(data=data):
                self.assert_program(code, expected, args=[data])

    def test_shadowed_stdlib_definitions_still_obey_the_new_relations(self):
        # Source-order chooses good for operator dispatch; the bad annotated
        # definition is still callable by its own name and remains published.
        prefixes = (
            '@concat fn <string,string> good(left,right){return __builtin_concat__(left,right);}'
            '@concat fn <string,string> bad(first,second){return first;}',
            '@empty fn <string> good(text){return __builtin_eq__(__builtin_length__(text),0);}'
            '@empty fn <string> bad(word){return 1;}',
        )
        for prefix in prefixes:
            with self.subTest(prefix=prefix):
                result = judge(prefix + '@solution fn solve(){return 0;}', [{"input": [], "expected": 0}])
                self.assertEqual(result["status"], "CE", result)
                self.assertEqual(result["diagnostics"][0]["code"], "CONTRACT")

    def test_builtin_contains_rejects_wrong_arity_or_contract_casts(self):
        for call in ('__builtin_contains__()', '__builtin_contains__([1])', '__builtin_contains__([1],1,2)', '__builtin_contains__(1,1)', '__builtin_contains__("one",1)'):
            with self.subTest(call=call):
                code = '@cast(int) fn <list> probe(items){return ' + call + ';}@solution fn solve(){return probe([]);}'
                result = judge(code, [{"input": [], "expected": 0}])
                self.assertEqual(result["status"], "CE", result)
                self.assertEqual(result["diagnostics"][0]["code"], "CONTRACT")

    def test_builtin_contains_is_rejected_from_all_ordinary_source_paths(self):
        call = '__builtin_contains__([1],1)'
        for code in (
            '@solution fn solve(){return ' + call + ';}',
            'fn unused(){return ' + call + ';}@solution fn solve(){return 0;}',
            '@solution fn solve(){if(0){return ' + call + ';}return 0;}',
            'let value=' + call + ';@solution fn solve(){return 0;}',
        ):
            with self.subTest(code=code):
                result = judge(code, [{"input": [], "expected": 0}])
                self.assertEqual(result["status"], "CE", result)
                self.assertEqual(result["diagnostics"][0]["code"], "BUILTIN_SCOPE")
        for code in ('@solution fn __builtin_contains__(){return 0;}', 'let __builtin_contains__=0;@solution fn solve(){return 0;}'):
            self.assertEqual(judge(code, [{"input": [], "expected": 0}])["status"], "CE")

    def test_legacy_ordinary_builtin_calls_are_guarded_at_runtime_and_publication(self):
        # Parser.parse deliberately bypasses compile_program's new-source check,
        # modelling an old or administratively imported persisted definition.
        legacy = Parser('fn helper(){return __builtin_contains__([1],1);}@solution fn old_answer(){return 0;}', {}).parse()
        snapshot = {"variables": {}, "functions": {"helper": legacy["functions"]["helper"]}, "last": {}}
        self.assert_program('@solution fn solve(){return 0;}', 0, snapshot=snapshot)
        result = judge('@solution fn solve(){return helper();}', [{"input": [], "expected": 1}], snapshot)
        self.assertEqual(result["status"], "CE", result)
        self.assertEqual(result["diagnostics"][0]["code"], "BUILTIN_SCOPE")
        errors = validate_publication({}, {"functions": snapshot["functions"]})
        self.assertEqual(errors[0]["code"], "BUILTIN_SCOPE")


if __name__ == '__main__':
    unittest.main()
