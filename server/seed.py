from .store import iso

OPERATIONS = ["eq", "cmp", "cast", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat"]
WORDS = "a b c x y z n i j k in out input output value values result answer solve main first second third left right total sum count index item items number numbers list dictionary key keys text string word words length size current next previous start end low high middle maximum minimum max min target found data temporary temp copy accumulator product difference double triple square reverse palindrome sort sorted compare equal add remove update test cat dog hello world zero one two three four five six seven eight nine ten new old global local shared state safe break function custom default integer boolean truth false true sign absolute positive negative factorial fibonacci power limit loop step position element collection array map pair pairs front back head tail separator space character characters unique merge filter reduce search swap append push back empty contains get set cast truthy concat eq cmp builtin solution mirror forever source destination remainder divisor dividend quotient prefix suffix amount return keep change core operation alpha beta gamma delta echo identity calculate stable guard helper mark label jump from before after sum answer helper answer solve my default custom int string list dict left right input output result variable function mutable public private count total a b c d e f g h i j k l m n o p q r s t u v w x y z".split()


def initial_world():
    return {"version": 0, "snapshot": {"variables": {}, "functions": {}, "last": {}}, "owners": {}, "settings": {
        "registrationMode": "open", "defaultNameLimit": 100,
        "runCooldownSeconds": 2, "submitCooldownSeconds": 10,
        "allowedWords": sorted(set(WORDS + ["cyclic", "mirror"])), "denyWords": [],
        "permittedOverrides": OPERATIONS, "defaultCoreOverrideLimit": 2, "maxQueuedJobs": 300,
    }}


def task(slug, title, difficulty, score, statement, parameters, tests, starter):
    public_tests = [test for test in tests if not test.get("hidden")]
    import json
    entry = {"shared-sum": "sum_answer", "cyclic-access": "cyclic_answer", "list-sum": "list_answer", "mirror-text": "mirror_answer"}[slug]
    starter = starter.replace(" solve(", " " + entry + "(")
    return {"id": slug, "slug": slug, "title": title, "difficulty": difficulty,
            "score": score, "tags": ["shared-state", difficulty], "solvedBy": 0,
            "languageVersion": "v0.3", "addonPacks": ["core"], "statement": statement,
            "constraints": ["Every test starts from the same shared world snapshot.", "Exactly one @solution function is required.", "All names, including parameters, are global."],
            "examples": [{"input": json.dumps(t["input"]), "output": json.dumps(t["expected"])} for t in public_tests],
            "starterCode": starter, "entryPoint": entry, "timeLimitMs": 1000,
            "coreOverrideLimit": 2, "allowedWords": None, "tests": tests}


def initial_tasks():
    return [
        task("shared-sum", "A shared sum", "easy", 50,
             "Return the sum of the two integer arguments. Arithmetic wraps in the range -1000000 through 1000000. Your parameter names can be changed by other players.", "left, right",
             [{"input": [2, 3], "expected": 5}, {"input": [-7, 4], "expected": -3}, {"input": [1000000, 1], "expected": -1000000, "hidden": True}, {"input": [0, 0], "expected": 0, "hidden": True}],
             "@solution\nfn <int, int> solve(left, right) {\n    return left + right;\n}\n"),
        task("cyclic-access", "Around the list", "easy", 70,
             "Return the element at the supplied index. Indices wrap around the list; an empty list returns integer zero.", "items, index",
             [{"input": [[4, 8, 15], 4], "expected": 8}, {"input": [[], 12], "expected": 0}, {"input": [[1, 2, 3], -1], "expected": 3, "hidden": True}, {"input": [["cat"], 99], "expected": "cat", "hidden": True}],
             "@solution\nfn solve(items, index) {\n    return get(items, index);\n}\n"),
        task("list-sum", "Sum in a changing world", "medium", 130,
             "Return the sum of all integers in the input list. Empty lists sum to zero. You may use loops or a type conversion; conversions themselves can be overridden in this world.", "items",
             [{"input": [[1, 2, 3]], "expected": 6}, {"input": [[]], "expected": 0}, {"input": [[-10, 4, 1]], "expected": -5, "hidden": True}, {"input": [[1000000, 1000000]], "expected": -1, "hidden": True}],
             "@solution\nfn <list> solve(items) {\n    let total = 0;\n    let index = 0;\n    while (index < length(items)) {\n        total = total + get(items, index);\n        index = index + 1;\n    }\n    return total;\n}\n"),
        task("mirror-text", "Mirror text", "medium", 150,
             "Return the input string with its characters in reverse order. Strings are indexed by Unicode code point. Use get and concat to build your answer.", "text",
             [{"input": ["cat"], "expected": "tac"}, {"input": [""], "expected": ""}, {"input": ["a b"], "expected": "b a", "hidden": True}, {"input": ["🙂ab"], "expected": "ba🙂", "hidden": True}],
             "@solution\nfn <string> solve(text) {\n    let result = \"\";\n    let index = length(text) - 1;\n    while (index >= 0) {\n        result = concat(result, get(text, index));\n        index = index - 1;\n    }\n    return result;\n}\n"),
    ]


def initial_news():
    return [{"id": "welcome", "title": "The world is shared", "body": "Run code to explore a snapshot. Accepted submissions publish their names to the world and can break earlier solutions. Rankings reflect solutions that still pass. Keep an eye on the shared namespace.", "category": "update", "pinned": True, "accent": "cyan", "createdAt": iso()}]
