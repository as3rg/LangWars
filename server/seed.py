from .store import iso

OPERATIONS = ["eq", "cmp", "cast", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat"]
DEFAULT_OVERRIDES = tuple(operation for operation in OPERATIONS if operation != "contains")
OVERRIDE_DEFAULTS_REVISION = "contains-opt-in-2026-11"
LANGUAGE_REVISION = "stdlib-invariants-2026-11"
WORDS = "a b c x y z n i j k in out input output value values result answer solve main first second third left right total sum count index item items number numbers list dictionary key keys text string word words length size current next previous start end low high middle maximum minimum max min target found data temporary temp copy accumulator product difference double triple square reverse palindrome sort sorted compare equal add remove update test cat dog hello world zero one two three four five six seven eight nine ten new old global local shared state safe break function custom default integer boolean truth false true sign absolute positive negative factorial fibonacci power limit loop step position element collection array map pair pairs front back head tail separator space character characters unique merge filter reduce search swap append push back empty contains get set cast truthy concat eq cmp builtin solution mirror forever source destination remainder divisor dividend quotient prefix suffix amount return keep change core operation alpha beta gamma delta echo identity calculate stable guard helper mark label jump from before after mutable public private d e f g h l m o p q r s t u v w cyclic range window tally running median ordered medians cursor pass".split()


def initial_world():
    return {"version": 0, "languageRevision": LANGUAGE_REVISION, "overrideDefaultsRevision": OVERRIDE_DEFAULTS_REVISION, "snapshot": {"variables": {}, "functions": {}, "last": {}}, "owners": {}, "settings": {
        "registrationMode": "invite", "defaultNameLimit": 100, "defaultTaskNameLimit": 30, "maxNameLength": 48,
        "worldVisibility": {
            "variables": {"names": "public", "values": "admin_only"},
            "functions": {"names": "public", "values": "admin_only"},
        },
        "runCooldownSeconds": 2, "submitCooldownSeconds": 10,
        "resubmitPenaltyEnabled": False, "resubmitPenaltyPercent": 5,
        "solutionNotificationsEnabled": True, "showBreakerIdentity": False, "breakImpactVisibility": "count",
        "dependencyCausalChecksEnabled": False, "cheapInvariantChecksEnabled": False,
        "allowedWords": sorted(set(WORDS)), "denyWords": [],
        "permittedOverrides": list(DEFAULT_OVERRIDES), "defaultCoreOverrideLimit": 2, "maxQueuedJobs": 300,
    }}


TASKS_RU = {
    "shared-sum": ("Общая сумма", "Верните сумму двух целых аргументов. При выходе за диапазон от −1000000 до 1000000 числа циклически переносятся на другой конец диапазона. Параметры затеняют общие значения на время вызова и сами по себе не публикуются.", []),
    "cyclic-access": ("По кругу списка", "Верните элемент списка по переданному индексу. Индексы циклические: после последнего элемента идёт первый. Для пустого списка верните целый ноль.", []),
    "list-sum": ("Сумма в меняющемся мире", "Верните сумму всех целых чисел в списке. Сумма пустого списка равна нулю. Арифметика и преобразования подчиняются правилам текущего общего мира.", ["Список содержит не более 100 целых чисел."]),
    "mirror-text": ("Зеркальный текст", "Верните входную строку в обратном порядке символов. Символом считается кодовая точка Unicode, в том числе эмодзи. Пустая строка остаётся пустой.", ["Строка содержит не более 100 символов."]),
    "positive-count": ("Выше нуля", "Посчитайте целые числа в списке, которые строго больше нуля. Ноль не учитывается. Для пустого списка результат равен нулю.", ["Список содержит не более 100 целых чисел."]),
    "range-total": ("Между двумя числами", "Верните сумму всех целых чисел от low до high включительно. Если low больше high, верните ноль. К результату применяются правила циклического переноса целых чисел языка.", ["Обе границы находятся в диапазоне от −1000 до 1000."]),
    "text-window": ("Окно вокруг света", "Верните count последовательных символов строки text, начиная с индекса start. Чтение циклически продолжается через оба конца строки. Верните пустую строку, если text пуста или count равен нулю.", ["В строке не более 100 символов Unicode; count — от 0 до 100."]),
    "unique-values": ("Первое появление", "Верните новый список, в котором каждое различное входное целое число встречается один раз, в порядке первого появления. Не сортируйте значения. Для пустого входа верните пустой список.", ["Список содержит не более 80 целых чисел."]),
    "dictionary-tally": ("Каждое слово на счету", "Верните словарь: каждому различному входному слову соответствует число его появлений. Пустая строка тоже может быть ключом. Порядок записей словаря не важен.", ["В списке не более 80 строк, в каждой — не более 30 символов Unicode."]),
    "running-median": ("Подвижная медиана", "Для каждого непустого префикса списка целых чисел найдите нижнюю медиану. Это среднее по позиции значение после сортировки; если средних два, выберите меньшее. Верните список медиан префиксов. Не усредняйте два средних значения. Для пустого входа верните пустой список.", ["В списке не более 25 целых чисел."]),
}


def task(slug, title, difficulty, score, statement, parameters, tests, types, entry=None, constraints=()):
    import json
    entry = entry or slug.replace("-", "_") + "_answer"
    annotation = "<" + ", ".join(types) + "> " if types else ""
    starter = f"@solution\nfn {annotation}{entry}({parameters}) {{\n    // Write your solution here.\n    return 0;\n}}\n"
    public_tests = [test for test in tests if not test.get("hidden")]
    common_constraints = ["Every test starts from the same shared world snapshot.", "Exactly one @solution function is required.", "Variables and helper functions are global. Parameters shadow shared values during calls and do not publish unless explicitly assigned."]
    examples = [{"input": json.dumps(test["input"], ensure_ascii=False), "output": json.dumps(test["expected"], ensure_ascii=False)} for test in public_tests]
    translations = {"en": {"title": title, "statement": statement, "constraints": [*common_constraints, *constraints], "examples": examples}}
    if slug in TASKS_RU:
        ru_title, ru_statement, ru_constraints = TASKS_RU[slug]
        translations["ru"] = {"title": ru_title, "statement": ru_statement,
                              "constraints": ["Каждый тест начинается с одного и того же снимка общего мира.", "Нужна ровно одна функция с аннотацией @solution.", "Переменные и вспомогательные функции глобальные. Параметры затеняют общие значения на время вызова и публикуются только при явном присваивании.", *ru_constraints],
                              "examples": examples}
    return {"id": slug, "slug": slug, "title": title, "difficulty": difficulty,
            "score": score, "tags": ["shared-state", difficulty], "solvedBy": 0,
            "languageVersion": "v0.3", "addonPacks": ["core"], "statement": statement,
            "constraints": [*common_constraints, *constraints], "translations": translations,
            "examples": examples,
            "starterCode": starter, "entryPoint": entry, "timeLimitMs": 1000,
            "coreOverrideLimit": None, "namePublishLimit": None, "allowedWords": None, "visibility": "visible",
            "eventId": None, "maxNameLength": None, "allowedKeywords": None, "datacenterFire": False, "tests": tests}


def refresh_seed_language_copy(task, seeded):
    """Replace only recognized stock copy; keep administrator-authored content."""
    if task.get("tests") != seeded["tests"]:
        return
    old_constraints = {
        "en": "All names, including parameters, are global.",
        "ru": "Все имена, включая параметры, глобальные.",
    }
    old_statements = {
        "en": "Return the sum of the two integer arguments. Arithmetic wraps in the range -1000000 through 1000000. Your parameter names can be changed by other players.",
        "ru": "Верните сумму двух целых аргументов. При выходе за диапазон от −1000000 до 1000000 числа циклически переносятся на другой конец диапазона. Другие игроки могут менять значения ваших глобальных параметров.",
    }
    copies = [(task, seeded, "en")]
    copies.extend((translation, seeded["translations"][locale], locale)
                  for locale, translation in task.get("translations", {}).items()
                  if locale in seeded["translations"])
    for current, target, locale in copies:
        legacy = [old_constraints[locale] if index == 2 else value for index, value in enumerate(target["constraints"])]
        if current.get("constraints") == legacy:
            current["constraints"] = list(target["constraints"])
        if seeded["id"] == "shared-sum" and current.get("statement") == old_statements[locale]:
            current["statement"] = target["statement"]


def initial_tasks():
    return [
        task("shared-sum", "A shared sum", "easy", 50,
             "Return the sum of the two integer arguments. Arithmetic wraps in the range -1000000 through 1000000. Parameters shadow shared values during calls and do not publish by themselves.", "left, right",
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
