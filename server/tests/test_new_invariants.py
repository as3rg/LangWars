import random
import unittest
from unittest.mock import patch

from server.langwarsscript import compile_program, judge, validate_publication
from server.langwarsscript.runtime import Runtime, Rejected, contract_samples


class NewInvariantTests(unittest.TestCase):
    def check(self, prefix, body="return 0;", expected=0):
        return judge(prefix + "\n@solution fn answer(){" + body + "}", [{"input": [], "expected": expected}])

    def assert_contract(self, prefix):
        result = self.check(prefix)
        self.assertEqual(result["status"], "CE", result)
        self.assertEqual(result["diagnostics"][0]["code"], "CONTRACT", result)

    def test_length_nonnegative_and_empty_compose_with_default_operations(self):
        self.assert_contract('@length fn <string> size(text){return -1;}')
        self.assert_contract('@empty fn <string> blank(text){return 1;}')
        # A positive length for the empty string breaks the untouched empty().
        self.assert_contract('@length fn <string> size(text){return __builtin_length__(text)+1;}')
        # The converse is not required: reporting a nonempty value for an empty
        # container is an intentional gameplay option under the one-way rule.
        result = self.check('@empty fn <string> blank(text){return 0;}', 'return empty("");', 0)
        self.assertEqual(result["status"], "OK", result)

    def test_concat_checks_unequal_operands_and_shared_length(self):
        self.assert_contract('@concat fn <string,string> join(first,second){return first;}')
        # The default concat must also compose with a modified length operation.
        self.assert_contract('@length fn <string> size(text){return __builtin_length__(text)*(1-__builtin_eq__(__builtin_length__(text),2));}')
        result = self.check('@concat fn <string,string> join(first,second){return __builtin_concat__(second,first);}', 'return concat("cat","dog");', 'dogcat')
        self.assertEqual(result["status"], "OK", result)

    def test_truthy_requires_witnesses_without_requiring_builtin_truth_table(self):
        for value in (0, 1):
            self.assert_contract(f'@truthy fn <int> truth(number){{return {value};}}')
        result = self.check('@truthy fn <int> truth(number){return __builtin_eq__(number,0);}', 'return [truthy(0),truthy(7)];', [1, 0])
        self.assertEqual(result["status"], "OK", result)
        # Constant-true equality remains permitted; its nondegeneracy requirement
        # is explicitly not part of the specification.
        result = self.check('@eq fn <int,int> equal(first,second){return 1;}', 'return eq(1,99);', 1)
        self.assertEqual(result["status"], "OK", result)

    def test_runtime_guards_cover_untouched_empty_and_concat(self):
        def runtime(prefix):
            program = compile_program(prefix + '@solution fn answer(){return 0;}')
            return Runtime(program)
        with self.assertRaisesRegex(Rejected, 'empty.*length'):
            runtime('@length fn <string> size(text){return __builtin_length__(text)+1;}').call('empty', [''])
        with self.assertRaisesRegex(Rejected, 'concat.*length'):
            runtime('@length fn <string> size(text){return __builtin_length__(text)*(1-__builtin_eq__(__builtin_length__(text),2));}').call('concat', ['a', 'a'])

    def test_fresh_random_probe_corpus_is_bounded_and_not_source_seeded(self):
        # Patch the entropy provider for a reproducible regression; production
        # uses OS randomness and accepts no player-supplied seed.
        with patch('server.langwarsscript.runtime.random.SystemRandom', side_effect=[random.Random(101), random.Random(202)]):
            first, second = contract_samples(), contract_samples()
        self.assertNotEqual(first['int'], second['int'])
        self.assertNotEqual(first['string'], second['string'])
        self.assertTrue(all(len(values) <= 20 for values in first.values()))
        self.assertTrue(all(-1000000 <= value <= 1000000 for value in first['int']))

    def test_concat_runtime_guard_does_not_repeat_stateful_entry_casts(self):
        cast = 'let counter=0; @cast(string) fn <int> word(number){counter=counter+1;return "a";}'
        for concat in ('', '@concat fn <string,string> join(first,second){return __builtin_concat__(first,second);}'):
            with self.subTest(overridden=bool(concat)):
                result = self.check(cast + concat, 'concat(1,2);return counter;', 2)
                self.assertEqual(result['status'], 'OK', result)

    def test_new_global_conflict_names_the_variable_and_operation_without_private_function(self):
        prefix = '@length fn <string> private_size(text){return __builtin_length__(text);}'
        accepted = self.check(prefix)
        self.assertEqual(accepted['status'], 'OK', accepted)
        errors = validate_publication(accepted['changes'], {'variables': {'text': 'x'}})
        self.assertTrue(errors)
        self.assertIn('Variable text', errors[0]['message'])
        self.assertIn('@length', errors[0]['message'])
        self.assertNotIn('private_size', errors[0]['message'])


if __name__ == '__main__':
    unittest.main()
