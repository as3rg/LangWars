from .store import iso

OPERATIONS = ["eq", "cmp", "cast", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat"]
WORDS = "a b c x y z n i j k in out input output value values result answer solve main first second third left right total sum count index item items number numbers list dictionary key keys text string word words length size current next previous start end low high middle maximum minimum max min target found data temporary temp copy accumulator product difference double triple square reverse palindrome sort sorted compare equal add remove update test cat dog hello world zero one two three four five six seven eight nine ten new old global local shared state safe break function custom default integer boolean truth false true sign absolute positive negative factorial fibonacci power limit loop step position element collection array map pair pairs front back head tail separator space character characters unique merge filter reduce search swap append push back empty contains get set cast truthy concat eq cmp builtin solution mirror forever source destination remainder divisor dividend quotient prefix suffix amount return keep change core operation alpha beta gamma delta echo identity calculate stable guard helper mark label jump from before after mutable public private d e f g h l m o p q r s t u v w cyclic range window tally running median ordered medians cursor pass".split()


def initial_world():
    return {"version": 0, "snapshot": {"variables": {}, "functions": {}, "last": {}}, "owners": {}, "settings": {
        "registrationMode": "invite", "defaultNameLimit": 100, "maxNameLength": 48,
        "worldVisibility": {
            "variables": {"names": "public", "values": "admin_only"},
            "functions": {"names": "public", "values": "admin_only"},
        },
        "runCooldownSeconds": 2, "submitCooldownSeconds": 10,
        "allowedWords": sorted(set(WORDS)), "denyWords": [],
        "permittedOverrides": OPERATIONS, "defaultCoreOverrideLimit": 2, "maxQueuedJobs": 300,
    }}


def task(slug, title, difficulty, score, statement, parameters, tests, types, entry=None, constraints=()):
    import json
    entry = entry or slug.replace("-", "_") + "_answer"
    annotation = "<" + ", ".join(types) + "> " if types else ""
    starter = f"@solution\nfn {annotation}{entry}({parameters}) {{\n    // Write your solution here.\n    return 0;\n}}\n"
    public_tests = [test for test in tests if not test.get("hidden")]
    return {"id": slug, "slug": slug, "title": title, "difficulty": difficulty,
            "score": score, "tags": ["shared-state", difficulty], "solvedBy": 0,
            "languageVersion": "v0.3", "addonPacks": ["core"], "statement": statement,
            "constraints": ["Every test starts from the same shared world snapshot.", "Exactly one @solution function is required.", "All names, including parameters, are global.", *constraints],
            "examples": [{"input": json.dumps(test["input"], ensure_ascii=False), "output": json.dumps(test["expected"], ensure_ascii=False)} for test in public_tests],
            "starterCode": starter, "entryPoint": entry, "timeLimitMs": 1000,
            "coreOverrideLimit": 2, "allowedWords": None, "tests": tests}


def initial_tasks():
    return [
        task("shared-sum", "A shared sum", "easy", 50,
             "Return the sum of the two integer arguments. Arithmetic wraps in the range -1000000 through 1000000. Your parameter names can be changed by other players.", "left, right",
             [{"input": [2, 3], "expected": 5}, {"input": [-7, 4], "expected": -3}, {"input": [1000000, 1], "expected": -1000000, "hidden": True}, {"input": [0, 0], "expected": 0, "hidden": True}],
             ["int", "int"], entry="sum_answer"),
        task("cyclic-access", "Around the list", "easy", 70,
             "Return the element at the supplied index. Indices wrap around the list; an empty list returns integer zero.", "items, index",
             [{"input": [[4, 8, 15], 4], "expected": 8}, {"input": [[], 12], "expected": 0}, {"input": [[1, 2, 3], -1], "expected": 3, "hidden": True}, {"input": [["cat"], 99], "expected": "cat", "hidden": True}],
             ["list", "int"], entry="cyclic_answer"),
        task("list-sum", "Sum in a changing world", "medium", 130,
             "Return the sum of all integers in the input list. Empty lists sum to zero. Arithmetic and conversions follow the current shared world.", "items",
             [{"input": [[1, 2, 3]], "expected": 6}, {"input": [[]], "expected": 0}, {"input": [[-10, 4, 1]], "expected": -5, "hidden": True}, {"input": [[1000000, 1000000]], "expected": -1, "hidden": True}],
             ["list"], entry="list_answer", constraints=["The input list contains at most 100 integers."]),
        task("mirror-text", "Mirror text", "medium", 150,
             "Return the input string with its characters in reverse order. Characters are Unicode code points, including emoji. An empty string stays empty.", "text",
             [{"input": ["cat"], "expected": "tac"}, {"input": [""], "expected": ""}, {"input": ["a b"], "expected": "b a", "hidden": True}, {"input": ["🙂ab"], "expected": "ba🙂", "hidden": True}],
             ["string"], entry="mirror_answer", constraints=["The input contains at most 100 characters."]),
        task("positive-count", "Above zero", "easy", 80,
             "Count how many integers in the input list are strictly greater than zero. Zero does not count, and an empty list has count zero.", "items",
             [{"input": [[-2, 0, 3, 4]], "expected": 2}, {"input": [[0, -1]], "expected": 0}, {"input": [[]], "expected": 0, "hidden": True}, {"input": [[1000000, -1000000, 1, 1, 0]], "expected": 3, "hidden": True}],
             ["list"], constraints=["The list contains at most 100 integers."]),
        task("range-total", "Between two numbers", "easy", 100,
             "Return the sum of every integer from low to high, including both endpoints. If low is greater than high, return zero. Apply the language's integer wrapping rules to the result.", "low, high",
             [{"input": [2, 5], "expected": 14}, {"input": [4, 2], "expected": 0}, {"input": [-3, 2], "expected": -3, "hidden": True}, {"input": [7, 7], "expected": 7, "hidden": True}, {"input": [999, 1000], "expected": 1999, "hidden": True}, {"input": [-1000, 1000], "expected": 0, "hidden": True}],
             ["int", "int"], constraints=["Both endpoints are between -1000 and 1000."]),
        task("text-window", "A window around the world", "medium", 150,
             "Return count consecutive characters from text, starting at start. Reading continues cyclically past either end of the string. Return an empty string when text is empty or count is zero.", "text, start, count",
             [{"input": ["cat", 2, 5], "expected": "tcatc"}, {"input": ["hello", 1, 3], "expected": "ell"}, {"input": ["🙂ab", -1, 4], "expected": "b🙂ab", "hidden": True}, {"input": ["", 99, 5], "expected": "", "hidden": True}, {"input": ["cat", -12, 0], "expected": "", "hidden": True}, {"input": ["x", 1000000, 4], "expected": "xxxx", "hidden": True}],
             ["string", "int", "int"], constraints=["Text has at most 100 Unicode characters; count is between 0 and 100."]),
        task("unique-values", "Keep the first appearance", "medium", 170,
             "Return a new list containing each distinct input integer once, in the order of its first appearance. Do not sort the values. An empty list produces an empty list.", "items",
             [{"input": [[3, 1, 3, 2, 1]], "expected": [3, 1, 2]}, {"input": [[0, 0, 0]], "expected": [0]}, {"input": [[]], "expected": [], "hidden": True}, {"input": [[-1, 1, -1, 0, 1, -1000000, 1000000]], "expected": [-1, 1, 0, -1000000, 1000000], "hidden": True}, {"input": [[4, 3, 2, 1]], "expected": [4, 3, 2, 1], "hidden": True}],
             ["list"], constraints=["The list contains at most 80 integers."]),
        task("dictionary-tally", "Every word counts", "medium", 190,
             "Return a dictionary mapping every distinct input string to its number of occurrences. Empty strings are valid keys. The order of dictionary entries does not matter.", "items",
             [{"input": [["cat", "dog", "cat"]], "expected": {"cat": 2, "dog": 1}}, {"input": [["", "", "cat"]], "expected": {"": 2, "cat": 1}}, {"input": [[]], "expected": {}, "hidden": True}, {"input": [["A", "a", "A", "🙂", "🙂"]], "expected": {"A": 2, "a": 1, "🙂": 2}, "hidden": True}, {"input": [["one", "two", "three"]], "expected": {"one": 1, "two": 1, "three": 1}, "hidden": True}],
             ["list"], constraints=["The list contains at most 80 strings, each at most 30 Unicode characters."]),
        task("running-median", "The median moves", "hard", 260,
             "For every nonempty prefix of the input integer list, find its lower median. The lower median is the middle value after sorting; when there are two middle values, choose the smaller one. Return the prefix medians in a list. Do not average the middle values. An empty input produces an empty list.", "items",
             [{"input": [[3, 1, 4, 1, 5]], "expected": [3, 1, 3, 1, 3]}, {"input": [[2, 2, 2]], "expected": [2, 2, 2]}, {"input": [[]], "expected": [], "hidden": True}, {"input": [[-5, 10, 0, -10]], "expected": [-5, -5, 0, -5], "hidden": True}, {"input": [[1000000, -1000000, 0, 999999, -999999]], "expected": [1000000, -1000000, 0, 0, 0], "hidden": True}, {"input": [[9, 8, 7, 6, 5, 4]], "expected": [9, 8, 8, 7, 7, 6], "hidden": True}],
             ["list"], constraints=["The input list contains at most 25 integers."]),
    ]


def initial_news():
    return [{"id": "welcome", "title": "The world is shared", "body": "Accepted submissions publish their names to the world and can break earlier solutions. Rankings reflect solutions that still pass. Administrators control which shared names and values are visible. Registration for this first test is by invitation.", "category": "update", "pinned": True, "accent": "cyan", "createdAt": iso()}]
