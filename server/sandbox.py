"""One untrusted program per OS process. This module never imports the API or database."""
import json
import os
import sys


def main():
    if sys.platform != "win32":
        import resource
        memory = int(os.environ.get("LANGWARS_MEMORY_MB", "256")) * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
        resource.setrlimit(resource.RLIMIT_CPU, (15, 16))
        resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    from .langwarsscript import judge, validate_publication
    payload = json.load(sys.stdin)
    action = payload.pop("action", "judge")
    if action == "validate":
        result = validate_publication(**payload)
    elif action == "edit":
        from .admin_world import prepare_edit
        result = prepare_edit(**payload)
    else:
        result = judge(**payload)
    encoded = json.dumps(result, ensure_ascii=True, separators=(",", ":"), allow_nan=False)
    if len(encoded) > 8 * 1024 * 1024:
        raise ValueError("Interpreter output exceeds process boundary limit")
    sys.stdout.write(encoded)


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        # No host paths, stack traces, credentials, or hidden test values cross this boundary.
        sys.stdout.write('{"sandboxError":"Interpreter process could not complete"}')
        sys.exit(1)
