"""Read-only concurrent HTTP probe; this does not benchmark interpreter throughput.

Example: python scripts/load_probe.py --url http://127.0.0.1:8080 --clients 150
"""
import argparse
import json
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8080")
    parser.add_argument("--clients", type=int, default=50)
    parser.add_argument("--requests", type=int, default=300)
    args = parser.parse_args()
    if not 1 <= args.clients <= 200 or not 1 <= args.requests <= 10000:
        parser.error("clients must be 1–200; requests must be 1–10000")
    paths = ["/api/tasks", "/api/rating", "/api/news", "/api/config"]

    def request(index):
        start = time.monotonic()
        try:
            with urllib.request.urlopen(args.url.rstrip("/") + paths[index % len(paths)], timeout=30) as response:
                response.read()
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        except OSError:
            status = 0
        return status, (time.monotonic() - start) * 1000

    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=args.clients) as pool:
        responses = list(pool.map(request, range(args.requests)))
    durations = sorted(duration for _, duration in responses)
    statuses = {str(status): sum(code == status for code, _ in responses) for status, _ in responses}
    print(json.dumps({"clients": args.clients, "requests": args.requests, "elapsedSeconds": round(time.monotonic() - started, 2), "statuses": statuses, "medianMs": round(statistics.median(durations), 2), "p95Ms": round(durations[min(len(durations) - 1, int(len(durations) * .95))], 2)}, indent=2))
    if any(status != 200 for status, _ in responses):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
