"""Bounded state repairs, prepared in the interpreter process before versioned commit."""
import copy
import re

from .langwarsscript.runtime import RESERVED, Rejected, compile_program, diagnostic, validate_publication
from .ownership import remember_owners


def value_shape(value):
    stack, cells = [(value, 0)], 0
    while stack:
        current, depth = stack.pop()
        cells += 1
        if depth > 32 or cells > 10000:
            raise Rejected("Values exceed depth or size limits", "VALUE_LIMIT")
        if type(current) is int and -1000000 <= current <= 1000000:
            continue
        if isinstance(current, str) and len(current) <= 10000:
            continue
        if isinstance(current, list):
            stack.extend((item, depth + 1) for item in current)
        elif isinstance(current, dict) and set(current) == {"$dict"} and isinstance(current["$dict"], list) and all(isinstance(pair, list) and len(pair) == 2 for pair in current["$dict"]):
            stack.extend((item, depth + 1) for pair in current["$dict"] for item in pair)
        else:
            raise Rejected("Use bounded integers, strings, lists or {$dict: [[key,value]]}", "INVALID_VALUE")


def prepare_edit(snapshot, name, kind, code=None, value=None, delete=False):
    try:
        if not isinstance(name, str) or len(name) > 128 or not re.fullmatch(r"[A-Za-z]+(?:_[A-Za-z]+)*", name) or name in RESERVED:
            raise Rejected("Invalid global name", "INVALID_NAME")
        candidate = copy.deepcopy(snapshot)
        exists = name in candidate["variables"] or name in candidate["functions"]
        if delete:
            if not exists:
                raise Rejected("Global name not found", "NOT_FOUND")
            for section in ("variables", "functions", "last"):
                candidate[section].pop(name, None)
            errors = validate_publication(candidate, {}, {"permitted_overrides": [], "max_overrides": 1000})
        else:
            changes = {"variables": {}, "functions": {}, "last": {}}
            if kind in ("variable", "last"):
                value_shape(value)
                if kind == "last" and name not in candidate["functions"]:
                    raise Rejected("Last return values belong to functions", "NOT_FOUND")
                changes["variables" if kind == "variable" else "last"][name] = value
            elif kind == "function":
                program = compile_program(code, {"require_solution": False, "max_overrides": 1000})
                if program["top"] or set(program["functions"]) != {name}:
                    raise Rejected("Supply exactly one definition with this global name", "INVALID_PROGRAM")
                function = program["functions"][name]
                function["publication_priority"] = max((fn.get("publication_priority", 0) for fn in candidate["functions"].values()), default=0) + 1
                changes["functions"][name] = function
            else:
                raise Rejected("Choose variable, function or last", "INVALID_KIND")
            errors = validate_publication(candidate, changes, {"max_overrides": 1000})
            if not errors:
                from .langwarsscript.runtime import merge_snapshot
                candidate = merge_snapshot(candidate, changes)
        if errors:
            return {"errors": errors}
        return {"snapshot": candidate}
    except Rejected as error:
        return {"errors": [diagnostic(error)]}


def purge_user_state(tx, world, user_id):
    candidate = copy.deepcopy(world)
    remember_owners(tx, candidate)
    for name, owner in list(candidate["owners"].items()):
        if candidate["ownerUsers"].get(name) == user_id:
            for section in ("variables", "functions", "last"):
                candidate["snapshot"][section].pop(name, None)
            candidate["owners"].pop(name, None)
            candidate["ownerUsers"].pop(name, None)
    return candidate
