from __future__ import annotations

import csv
import io
import json
import os
import re
import secrets
import time
from contextlib import asynccontextmanager

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from .auth import issue_session, password_hash, password_matches, prohibited, public_user, revoke_sessions, token_hash
from .seed import OPERATIONS
from .scoring import refresh_ratings, resubmit_penalty, solved_tasks, solved_task_map
from .store import Store, dumps, iso, uid


def fail(status, code, message, headers=None):
    raise HTTPException(status, detail={"code": code, "message": message}, headers=headers)


def text(value, field, minimum=0, maximum=10000):
    if not isinstance(value, str) or not minimum <= len(value) <= maximum:
        fail(422, "BAD_BODY", f"{field} must be text of length {minimum}–{maximum}")
    return value


def integer(value, field, minimum=0, maximum=1000000):
    if type(value) is not int or not minimum <= value <= maximum:
        fail(422, "BAD_BODY", f"{field} must be an integer between {minimum} and {maximum}")
    return value


def words(value, field, maximum=10000):
    if not isinstance(value, list) or len(value) > maximum or any(not isinstance(v, str) or not 1 <= len(v) <= 64 for v in value):
        fail(422, "BAD_BODY", f"{field} must be a list of at most {maximum} nonempty words")
    return sorted(set(value))


def clean_text(value, field, settings, minimum=0, maximum=10000):
    value = text(value, field, minimum, maximum)
    if prohibited(value, settings["denyWords"]):
        fail(422, "DENIED_WORD", f"{field} contains a word blocked by the platform")
    return value


def new_user(username, password, settings, role="user", encoded_password=None):
    return dict(id=uid("usr_"), username=username, displayName=username, role=role,
                passwordHash=encoded_password or password_hash(password), avatarHue=secrets.randbelow(360), rating=0,
                solvedCount=0, streak=0, createdAt=iso(), banned=False,
                nameLimit=settings["defaultNameLimit"], claimedNames=[], adminNote="")


def public_task(task, tx=None, user=None, admin=False):
    result = dict(task)
    if not admin:
        result.pop("tests", None)
    if tx:
        if not hasattr(tx, "public_solves"):
            tx.public_solves = solved_task_map(tx, [player for player in tx.list("users") if not player.get("banned")])
        result["solvedBy"] = sum(task["id"] in solved for solved in tx.public_solves.values())
        result["solved"] = bool(user and task["id"] in tx.public_solves.get(user["id"], set()))
        result["attempted"] = bool(user and tx.execute("SELECT 1 FROM records WHERE kind='submissions' AND task_id=? AND user_id=? LIMIT 1", (task["id"], user["id"])).fetchone())
        result["resubmitPenalty"] = resubmit_penalty(tx, user, task, tx.get("system", "world")["settings"], solved=result["solved"])
    return result


def summary(sub):
    return {key: val for key, val in sub.items() if key not in {"code", "tests", "diagnostics", "stdout", "dependencies", "names", "changes", "lease"}}


def create_app(database_url=None):
    store = Store(database_url)

    @asynccontextmanager
    async def lifespan(app):
        store.initialize()
        username = os.environ.get("BOOTSTRAP_ADMIN_USERNAME")
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD")
        if username and password:
            with store.transaction() as tx:
                world = tx.world()
                if not any(user["role"] == "admin" for user in tx.list("users")):
                    if len(password) < 12 or len(password) > 256 or not re.fullmatch(r"[A-Za-z0-9_]{3,24}", username):
                        raise RuntimeError("Bootstrap requires a valid username and a 12–256 character password")
                    if tx.get("usernames", username.casefold()):
                        raise RuntimeError("Bootstrap admin username is already registered; choose another username")
                    user = new_user(username, password, world["settings"], "admin")
                    tx.put("users", user["id"], user)
                    tx.put("usernames", username.casefold(), user["id"])
                    tx.audit("bootstrap", "create_admin", user["id"])
        yield

    app = FastAPI(title="LangWars API", version="1.0.0", lifespan=lifespan)
    app.state.store = store

    @app.exception_handler(HTTPException)
    async def http_error(request, error):
        detail = error.detail if isinstance(error.detail, dict) else {"code": "HTTP_ERROR", "message": str(error.detail)}
        return JSONResponse({"error": detail}, status_code=error.status_code, headers=error.headers)

    @app.middleware("http")
    async def limits(request, call_next):
        size = 0
        chunks = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 512 * 1024:
                return JSONResponse({"error": {"code": "BODY_TOO_LARGE", "message": "Request exceeds 512 KiB"}}, status_code=413)
            chunks.append(chunk)
        request._body = b"".join(chunks)
        content_type = request.headers.get("content-type", "application/json").split(";", 1)[0].strip().lower()
        if request._body and (content_type == "application/json" or content_type.endswith("+json")):
            try:
                def nonfinite(value):
                    raise ValueError("Non-finite JSON number")
                parsed = json.loads(request._body, parse_constant=nonfinite)
                stack, cells = [(parsed, 0)], 0
                while stack:
                    value, depth = stack.pop()
                    cells += 1
                    if depth > 64 or cells > 100000:
                        raise ValueError("JSON structure exceeds limits")
                    if isinstance(value, str):
                        value.encode("utf-8")
                    if isinstance(value, dict):
                        for key in value:
                            key.encode("utf-8")
                        stack.extend((item, depth + 1) for item in value.values())
                    elif isinstance(value, list):
                        stack.extend((item, depth + 1) for item in value)
            except (ValueError, RecursionError, UnicodeError):
                return JSONResponse({"error": {"code": "BAD_JSON", "message": "Invalid JSON or structure exceeds limits"}}, status_code=400)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    def current(request, tx, required=True, admin=False):
        token = request.headers.get("authorization", "").removeprefix("Bearer ")
        session = tx.get("sessions", token_hash(token)) if token and len(token) <= 256 else None
        user = tx.get("users", session["userId"]) if session and session["expires"] > time.time() else None
        if user and user.get("banned"):
            user = None
        if not user and required:
            fail(401, "UNAUTHORIZED", "Login required")
        if admin and user["role"] != "admin":
            fail(403, "FORBIDDEN", "Admin role required")
        return user

    def find_task(tx, task_id):
        task = tx.get("tasks", task_id)
        if not task:
            task = next((t for t in tx.list("tasks") if t["slug"] == task_id), None)
        if not task:
            fail(404, "NOT_FOUND", "Task not found")
        return task

    def authenticated_response(tx, user):
        ttl = max(1, min(720, int(os.environ.get("SESSION_TTL_HOURS", "168")))) * 3600
        return {"token": issue_session(tx, user, ttl), "user": public_user(user, admin=user["role"] == "admin")}

    def auth_throttle(tx, request, username):
        # Per-client and per-account budgets; no proxy headers are trusted.
        now = time.time()
        for key in ["ip:" + (request.client.host if request.client else "unknown"), "name:" + username.casefold()]:
            hashed = token_hash(key)
            attempts = [t for t in (tx.get("throttle", hashed) or []) if t > now - 60]
            if len(attempts) >= (600 if key.startswith("ip:") else 15):
                return False
            tx.put("throttle", hashed, attempts + [now])
        return True

    @app.get("/api/health")
    def health():
        with store.transaction() as tx:
            tx.execute("SELECT 1")
        return {"status": "ok", "mock": False}

    @app.get("/api/config")
    def config():
        with store.transaction() as tx:
            settings = tx.get("system", "world")["settings"]
            return {key: settings[key] for key in ["registrationMode", "runCooldownSeconds", "submitCooldownSeconds", "allowedWords", "maxNameLength", "resubmitPenaltyEnabled", "resubmitPenaltyPercent"]}

    @app.post("/api/auth/login")
    def login(request: Request, body: dict = Body(...)):
        if set(body) - {"username", "password"}:
            fail(422, "BAD_BODY", "Only username and password are accepted")
        username = text(body.get("username"), "username", 1, 24)
        password = text(body.get("password"), "password", 1, 256)
        account_key = token_hash(username.casefold())
        with store.transaction() as tx:
            tx.world()
            allowed = auth_throttle(tx, request, username)
            failures = tx.get("auth_failures", account_key) or {}
            retry = max(0, failures.get("blockedUntil", 0) - time.time())
            user_id = tx.get("usernames", username.casefold())
            candidate = tx.get("users", user_id) if user_id else None
        if not allowed:
            fail(429, "RATE_LIMIT", "Too many login attempts. Try again in a minute.", {"Retry-After": "60"})
        if retry > 0:
            fail(429, "LOGIN_TIMEOUT", "Login temporarily unavailable. Try again shortly.", {"Retry-After": str(max(1, int(retry + .999)))})
        # Hashing is bounded independently of the request thread pool, and never holds
        # the world lock. Unknown accounts perform the same password work.
        encoded = candidate["passwordHash"] if candidate else DUMMY_HASH
        valid = password_matches(password, encoded)
        with store.transaction() as tx:
            tx.world()
            user = tx.get("users", candidate["id"]) if candidate else None
            failures = tx.get("auth_failures", account_key) or {}
            retry = max(0, failures.get("blockedUntil", 0) - time.time())
            if not retry and user and valid and not user.get("banned") and user["passwordHash"] == encoded and user["username"].casefold() == username.casefold():
                tx.delete("auth_failures", account_key)
                return authenticated_response(tx, user)
            if not retry:
                now = time.time()
                count = min(16, failures.get("failures", 0) + 1) if failures.get("lastFailure", 0) > now - 900 else 1
                delay = min(60, 2 ** (count - 3)) if count >= 3 else 0
                tx.put("auth_failures", account_key, {"failures": count, "lastFailure": now, "blockedUntil": now + delay})
        # Raise only after committing the failed-attempt record.
        if retry:
            fail(429, "LOGIN_TIMEOUT", "Login temporarily unavailable. Try again shortly.", {"Retry-After": str(max(1, int(retry + .999)))})
        fail(401, "BAD_CREDENTIALS", "Wrong username or password")

    def registration_access(tx, username, code):
        settings = tx.get("system", "world")["settings"]
        if settings["registrationMode"] == "closed":
            fail(403, "REGISTRATION_CLOSED", "Registration is closed")
        clean_text(username, "username", settings)
        if tx.get("usernames", username.casefold()):
            fail(409, "USERNAME_TAKEN", "Username is already taken")
        invite = None
        if settings["registrationMode"] == "invite":
            from datetime import datetime
            invite = tx.get("invites", token_hash(code)) if code else None
            if not invite or invite["uses"] >= invite["maxUses"] or datetime.fromisoformat(invite["expiresAt"].replace("Z", "+00:00")).timestamp() <= time.time():
                fail(403, "INVALID_INVITE", "A valid unexpired invitation is required")
        return settings, invite

    @app.post("/api/auth/register", status_code=201)
    def register(request: Request, body: dict = Body(...)):
        if set(body) - {"username", "password", "inviteCode"}:
            fail(422, "BAD_BODY", "Only username, password and invitation code are accepted")
        username = text(body.get("username"), "username", 3, 24)
        password = text(body.get("password"), "password", 12, 256)
        code = text(body.get("inviteCode", ""), "inviteCode", 0, 128)
        if not re.fullmatch(r"[A-Za-z0-9_]+", username):
            fail(422, "BAD_BODY", "Invalid username")
        with store.transaction() as tx:
            tx.world()
            allowed = auth_throttle(tx, request, username)
        if not allowed:
            fail(429, "RATE_LIMIT", "Too many registration attempts", {"Retry-After": "60"})
        # Reject unusable invitations before spending password-hashing CPU.
        with store.transaction() as tx:
            registration_access(tx, username, code)
        encoded_password = password_hash(password)
        with store.transaction() as tx:
            world = tx.world()
            settings, invite = registration_access(tx, username, code)
            user = new_user(username, password, settings, encoded_password=encoded_password)
            tx.put("users", user["id"], user)
            tx.put("usernames", username.casefold(), user["id"])
            if invite:
                invite["uses"] += 1
                invite.update(lastUsedAt=iso(), usedBy=user["id"])
                if invite["uses"] >= invite["maxUses"]:
                    invite["usedAt"] = iso()
                tx.put("invites", token_hash(code), invite)
            return authenticated_response(tx, user)

    @app.post("/api/auth/logout", status_code=204)
    def logout(request: Request):
        with store.transaction() as tx:
            current(request, tx)
            token = request.headers["authorization"].removeprefix("Bearer ")
            tx.delete("sessions", token_hash(token))
        return Response(status_code=204)

    @app.get("/api/me")
    def me(request: Request):
        with store.transaction() as tx:
            user = current(request, tx)
            return public_user(user, user["role"] == "admin")

    @app.patch("/api/me")
    def edit_me(request: Request, body: dict = Body(...)):
        with store.transaction() as tx:
            user = current(request, tx)
            settings = tx.world()["settings"]
            if "displayName" in body:
                user["displayName"] = clean_text(body["displayName"], "displayName", settings, 1, 64)
            if "avatarHue" in body:
                user["avatarHue"] = integer(body["avatarHue"], "avatarHue", 0, 360)
            tx.put("users", user["id"], user)
            return public_user(user)

    @app.get("/api/tasks")
    def tasks(request: Request):
        with store.transaction() as tx:
            user = current(request, tx, required=False)
            return [public_task(t, tx, user) for t in tx.list("tasks")]

    @app.get("/api/tasks/{task_id}")
    def task_detail(task_id: str, request: Request):
        with store.transaction() as tx:
            return public_task(find_task(tx, task_id), tx, current(request, tx, required=False))

    def enqueue(task_id, request, body, mode):
        code = text(body.get("code"), "code", 1, 65536)
        version = body.get("languageVersion", "v0.3")
        if version != "v0.3":
            fail(422, "UNSUPPORTED_VERSION", "This server supports LWLang v0.3")
        with store.transaction() as tx:
            world = tx.world()
            user = current(request, tx)
            task = find_task(tx, task_id)
            settings = world["settings"]
            clean_text(code, "code", settings, 1, 65536)
            cooldown = settings["runCooldownSeconds" if mode == "run" else "submitCooldownSeconds"]
            field = "lastRun" if mode == "run" else "lastSubmit"
            now = time.time()
            remaining = user.get(field, 0) + cooldown - now
            if remaining > 0:
                fail(429, "COOLDOWN", f"Try again in {remaining:.1f} seconds", {"Retry-After": str(max(1, int(remaining + .999)))})
            pending = tx.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running') AND id NOT LIKE 'recheck_%'").fetchone()[0]
            mine = tx.execute("SELECT COUNT(*) FROM jobs WHERE user_id=? AND status IN ('queued','running') AND id NOT LIKE 'recheck_%'", (user["id"],)).fetchone()[0]
            if pending >= settings["maxQueuedJobs"] or mine >= 2:
                fail(429, "QUEUE_FULL", "The queue is full. Try again shortly.", {"Retry-After": "5"})
            penalty = resubmit_penalty(tx, user, task, settings) if mode == "submit" else {"points": 0}
            if penalty["points"] and (body.get("acceptResubmitPenalty") is not True or type(body.get("expectedPenaltyPoints")) is not int or body["expectedPenaltyPoints"] != penalty["points"]):
                raise HTTPException(409, detail={"code": "PENALTY_CONFIRMATION_REQUIRED", "message": f"Submitting this solved task costs {penalty['points']} points", "points": penalty["points"]})
            job = {"id": uid("job_"), "userId": user["id"], "taskId": task["id"], "code": code,
                   "languageVersion": version, "mode": mode, "createdAt": iso(), "penaltyPoints": penalty["points"]}
            tx.execute("INSERT INTO jobs(id,user_id,status,created,data) VALUES(?,?,'queued',?,?)", (job["id"], user["id"], now, dumps(job)))
            user[field] = now
            user["submissionPenalties"] = user.get("submissionPenalties", 0) + penalty["points"]
            user["rating"] -= penalty["points"]
            tx.put("users", user["id"], user)
            return {"jobId": job["id"], "penaltyPoints": penalty["points"]}

    @app.post("/api/tasks/{task_id}/run", status_code=202)
    def run(task_id: str, request: Request, body: dict = Body(...)):
        return enqueue(task_id, request, body, "run")

    @app.post("/api/tasks/{task_id}/submit", status_code=202)
    def submit(task_id: str, request: Request, body: dict = Body(...)):
        return enqueue(task_id, request, body, "submit")

    @app.get("/api/jobs/{job_id}")
    def job_status(job_id: str, request: Request):
        with store.transaction() as tx:
            user = current(request, tx)
            row = tx.execute("SELECT user_id,status,data FROM jobs WHERE id=?", (job_id,)).fetchone()
            if not row or (row[0] != user["id"] and user["role"] != "admin"):
                fail(404, "NOT_FOUND", "Job not found")
            job = json.loads(row[2])
            return {key: val for key, val in {"status": row[1], "result": job.get("result"), "error": job.get("error")}.items() if val is not None}

    def submission_list(tx, task_id=None, user_id=None, limit=50, before_created=None, before_id=None):
        if (before_created is None) != (before_id is None):
            fail(422, "BAD_CURSOR", "beforeCreated and beforeId must be supplied together")
        if before_created is not None:
            text(before_created, "beforeCreated", 20, 32)
            text(before_id, "beforeId", 1, 96)
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", before_created) or not re.fullmatch(r"[A-Za-z0-9_-]+", before_id):
                fail(422, "BAD_CURSOR", "Invalid submission history cursor")
            try:
                from datetime import datetime
                datetime.fromisoformat(before_created.replace("Z", "+00:00"))
            except ValueError:
                fail(422, "BAD_CURSOR", "Invalid submission cursor date")
        values = tx.list("submissions", task_id=task_id, user_id=user_id, limit=max(1, min(limit, 500)), before_created=before_created, before_id=before_id)
        return [summary(s) for s in values]

    @app.get("/api/submissions")
    def submissions(request: Request, taskId: str | None = None, userId: str | None = None, limit: int = 50, beforeCreated: str | None = None, beforeId: str | None = None):
        with store.transaction() as tx:
            current(request, tx)
            return submission_list(tx, taskId, userId, limit, beforeCreated, beforeId)

    @app.get("/api/tasks/{task_id}/submissions")
    def task_submissions(task_id: str, request: Request, scope: str = "mine", limit: int = 50, beforeCreated: str | None = None, beforeId: str | None = None):
        with store.transaction() as tx:
            user = current(request, tx)
            task = find_task(tx, task_id)
            return submission_list(tx, task["id"], None if scope == "all" else user["id"], limit, beforeCreated, beforeId)

    @app.get("/api/submissions/{submission_id}")
    def submission_detail(submission_id: str, request: Request):
        with store.transaction() as tx:
            user = current(request, tx)
            value = tx.get("submissions", submission_id)
            if not value:
                fail(404, "NOT_FOUND", "Submission not found")
            if value["userId"] != user["id"] and user["role"] != "admin":
                fail(403, "FORBIDDEN", "Code is private to its author")
            result = {key: val for key, val in value.items() if key not in {"dependencies", "names", "changes"}}
            previous = tx.execute("SELECT data FROM records WHERE kind='submissions' AND user_id=? AND task_id=? AND created<? ORDER BY created DESC LIMIT 1", (value["userId"], value["taskId"], value["createdAt"])).fetchone()
            if previous:
                previous = json.loads(previous[0])
                result.update(previousId=previous["id"], previousCode=previous["code"])
            return result

    descriptor = {"id": "global", "title": "World ranking", "description": "Scores for unique tasks with a currently passing solution", "columns": [{"key": "score", "label": "Score", "align": "right"}, {"key": "solved", "label": "Solved", "align": "right"}]}

    @app.get("/api/rating/tables")
    def rating_tables():
        with store.transaction() as tx:
            tasks = tx.list("tasks")
            events = sorted({t["ratingTable"] for t in tasks if t.get("ratingTable")})
            return [descriptor] + [{**descriptor, "id": event, "title": event, "description": "Event ranking"} for event in events] + [{**descriptor, "id": "task:" + task["id"], "title": task["title"], "description": "Task ranking"} for task in tasks]

    @app.get("/api/rating")
    def rating(request: Request, table: str = "global", q: str = ""):
        q = text(q, "q", 0, 64).casefold().strip()
        with store.transaction() as tx:
            user = current(request, tx, required=False)
            users = [u for u in tx.list("users") if not u.get("banned")]
            selected_descriptor = descriptor
            if table != "global":
                tasks = tx.list("tasks")
                selected_tasks = [t for t in tasks if table == "task:" + t["id"] or t.get("ratingTable") == table]
                if not selected_tasks:
                    fail(404, "NOT_FOUND", "Rating table not found")
                selected = {task["id"]: task for task in selected_tasks}
                solves = solved_task_map(tx, users, selected)
                users = [{**u, "rating": sum(selected[key]["score"] for key in solves[u["id"]]), "solvedCount": len(solves[u["id"]])} for u in users]
                selected_descriptor = {**descriptor, "id": table, "title": selected_tasks[0]["title"] if table.startswith("task:") else table}
            users.sort(key=lambda u: (-u["rating"], u["createdAt"]))
            rows = [{"rank": i + 1, "userId": u["id"], "username": u["username"], "score": u["rating"], "solved": u["solvedCount"], "extra": {}} for i, u in enumerate(users)]
            return {"descriptor": selected_descriptor, "rows": [row for row in rows if q in row["username"].casefold()], "me": next((r for r in rows if user and r["userId"] == user["id"]), None)}

    @app.get("/api/tasks/{task_id}/insights")
    def insights(task_id: str):
        with store.transaction() as tx:
            task = find_task(tx, task_id)
            total, users = tx.execute("SELECT COUNT(*),COUNT(DISTINCT user_id) FROM records WHERE kind='submissions' AND task_id=?", (task["id"],)).fetchone()
            solved = tx.execute("SELECT COUNT(DISTINCT user_id) FROM records WHERE kind='submissions' AND task_id=? AND state='OK'", (task["id"],)).fetchone()[0]
            breakdown = dict(tx.execute("SELECT state,COUNT(*) FROM records WHERE kind='submissions' AND task_id=? GROUP BY state", (task["id"],)).fetchall())
            fastest = tx.execute("SELECT MIN(duration) FROM records WHERE kind='submissions' AND task_id=? AND state='OK'", (task["id"],)).fetchone()[0] or 0
            top = []
            for user_id, attempts, passed in tx.execute("SELECT user_id,COUNT(*),MAX(CASE WHEN state='OK' THEN 1 ELSE 0 END) FROM records WHERE kind='submissions' AND task_id=? GROUP BY user_id ORDER BY MAX(CASE WHEN state='OK' THEN 1 ELSE 0 END) DESC,COUNT(*) DESC LIMIT 5", (task["id"],)).fetchall():
                user = tx.get("users", user_id)
                top.append({"userId": user_id, "username": user["username"] if user else "deleted", "attempts": attempts, "solved": bool(passed)})
            return {"kind": "stats", "data": {"taskTitle": task["title"], "totalSubmissions": total, "uniqueCats": users, "solvedCats": solved, "solveRate": solved / max(1, users), "averageAttempts": total / max(1, users), "fastestMs": fastest, "statusBreakdown": breakdown, "topCats": top, "recent": submission_list(tx, task["id"], limit=5)}}

    @app.get("/api/namespace")
    def namespace(request: Request):
        with store.transaction() as tx:
            world = tx.get("system", "world")
            user = current(request, tx, required=False)
            admin = bool(user and user["role"] == "admin")
            policies = world["settings"]["worldVisibility"]
            visibility = {kind: {field: admin or policies[kind][field] == "public" for field in ("names", "values")} for kind in ("variables", "functions")}
            for policy in visibility.values():
                policy["values"] = policy["values"] and policy["names"]
            result = {"version": world["version"], "visibility": visibility, "values": {}, "functions": {}, "last": {}}
            for kind, section in [("variables", "values"), ("functions", "functions")]:
                policy = visibility[kind]
                if policy["names"]:
                    result[section] = {name: value if policy["values"] else None for name, value in world["snapshot"][kind].items()}
            if visibility["functions"]["values"]:
                fields = ("name", "params", "types", "annotation", "cast_to", "source")
                result["functions"] = {name: {key: definition.get(key) for key in fields} for name, definition in result["functions"].items()}
                result["last"] = {name: value for name, value in world["snapshot"].get("last", {}).items() if name in result["functions"]}
            return result

    def change_world_name(name, request, version, body=None):
        version = integer(version, "version", 0, 1000000000)
        if body is not None and set(body) - {"version", "kind", "value", "code"}:
            fail(422, "BAD_BODY", "Unknown state edit field")
        with store.transaction() as tx:
            current(request, tx, admin=True)
            original = tx.get("system", "world")
            if original["version"] != version:
                fail(409, "WORLD_CHANGED", "The world changed; refresh before editing")
        from .worker import sandbox, schedule_rechecks
        result = sandbox({"action": "edit", "snapshot": original["snapshot"], "name": name,
                          "kind": body.get("kind") if body else None, "delete": body is None,
                          "code": body.get("code") if body else None, "value": body.get("value") if body else None})
        if not isinstance(result, dict) or "snapshot" not in result:
            errors = result.get("errors", []) if isinstance(result, dict) else []
            raise HTTPException(422, detail={"code": "INVALID_STATE", "message": errors[0]["message"] if errors else "State validation exceeded its budget", "diagnostics": errors})
        snapshot = result["snapshot"]
        if len(dumps(snapshot)) > 4 * 1024 * 1024 or len(set(snapshot["variables"]) | set(snapshot["functions"])) > 20000:
            fail(422, "WORLD_LIMIT", "The shared world exceeds its size limit")
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            if world["version"] != version:
                fail(409, "WORLD_CHANGED", "The world changed; refresh before editing")
            world["snapshot"] = snapshot
            if body is None:
                world["owners"].pop(name, None)
                world.setdefault("ownerUsers", {}).pop(name, None)
            elif body.get("kind") != "last":
                world["owners"][name] = "admin:" + admin["id"]
                world.setdefault("ownerUsers", {})[name] = admin["id"]
            world["version"] += 1
            tx.save_world(world)
            schedule_rechecks(tx, {}, world, all_submissions=True)
            tx.audit(admin["id"], "delete_global" if body is None else "edit_global", name, kind=body.get("kind") if body else None)
            return {"version": world["version"]}

    @app.patch("/api/admin/world/{name}")
    def edit_world(name: str, request: Request, body: dict = Body(...)):
        return change_world_name(name, request, body.get("version"), body)

    @app.delete("/api/admin/world/{name}")
    def delete_world_name(name: str, request: Request, version: int):
        return change_world_name(name, request, version)

    @app.get("/api/news")
    def news():
        with store.transaction() as tx:
            return sorted(tx.list("news"), key=lambda n: (n["pinned"], n["createdAt"]), reverse=True)

    @app.get("/api/news/{news_id}")
    def news_item(news_id: str):
        with store.transaction() as tx:
            result = tx.get("news", news_id)
            if not result:
                fail(404, "NOT_FOUND", "News item not found")
            return result

    @app.get("/api/admin/summary")
    def admin_summary(request: Request):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            counts = {kind: tx.execute("SELECT COUNT(*) FROM records WHERE kind=?", (kind,)).fetchone()[0] for kind in ["users", "tasks", "submissions", "news"]}
            return {**counts, "pendingReports": 0, "recent": submission_list(tx, limit=10), "queuedJobs": tx.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0]}

    @app.get("/api/admin/settings")
    def settings(request: Request):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            return tx.get("system", "world")["settings"]

    @app.patch("/api/admin/settings")
    def edit_settings(request: Request, body: dict = Body(...)):
        with store.transaction() as tx:
            admin = current(request, tx, admin=True)
            world = tx.world()
            settings = world["settings"]
            if set(body) - set(settings):
                fail(422, "BAD_BODY", "Unknown setting")
            for key, value in body.items():
                if key == "registrationMode":
                    if value not in ["open", "invite", "closed"]:
                        fail(422, "BAD_BODY", "Invalid registration mode")
                elif key == "worldVisibility":
                    if not isinstance(value, dict) or set(value) != {"variables", "functions"}:
                        fail(422, "BAD_BODY", "Visibility must define variables and functions")
                    for policy in value.values():
                        if not isinstance(policy, dict) or set(policy) != {"names", "values"} or any(choice not in ("public", "admin_only") for choice in policy.values()):
                            fail(422, "BAD_BODY", "Each visibility policy needs names and values set to public or admin_only")
                elif key == "maxNameLength":
                    value = integer(value, key, 1, 128)
                elif key == "resubmitPenaltyEnabled":
                    if type(value) is not bool:
                        fail(422, "BAD_BODY", "resubmitPenaltyEnabled must be boolean")
                elif key == "resubmitPenaltyPercent":
                    value = integer(value, key, 0, 100)
                elif key in ["allowedWords", "denyWords", "permittedOverrides"]:
                    value = words(value, key)
                    if key == "allowedWords" and any(not re.fullmatch("[a-zA-Z]+", word) for word in value):
                        fail(422, "BAD_BODY", "Dictionary entries must contain English letters only")
                    if key == "permittedOverrides" and set(value) - set(OPERATIONS):
                        fail(422, "BAD_BODY", "Unknown core operation")
                else:
                    upper = 86400 if "Cooldown" in key else (10000 if key == "defaultNameLimit" else (1000 if key == "maxQueuedJobs" else 32))
                    value = integer(value, key, 1 if key == "maxQueuedJobs" else 0, upper)
                settings[key] = value
            world["version"] += 1
            tx.save_world(world)
            tx.audit(admin["id"], "update_settings", fields=sorted(body))
            return settings

    @app.post("/api/admin/dictionary")
    def dictionary(request: Request, body: dict = Body(...)):
        source = text(body.get("csv"), "csv", 0, 256000)
        values = sorted({cell.strip() for row in csv.reader(io.StringIO(source)) for cell in row if cell.strip()})
        return edit_settings(request, {"allowedWords": values})

    @app.get("/api/admin/users")
    def admin_users(request: Request):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            users = tx.list("users")
            solves = solved_task_map(tx, users)
            return [{**public_user(u, True), "solvedTaskIds": sorted(solves[u["id"]])} for u in users]

    def protect_admin(tx, admin, user, body, deletion=False):
        removing = deletion or body.get("banned") is True or ("role" in body and body["role"] != "admin")
        if removing and user["id"] == admin["id"]:
            fail(409, "SELF_LOCKOUT", "You cannot delete, ban or demote your own account")
        if removing and user["role"] == "admin" and len([u for u in tx.list("users") if u["role"] == "admin" and not u.get("banned")]) <= 1:
            fail(409, "LAST_ADMIN", "At least one active administrator is required")

    @app.patch("/api/admin/users/{user_id}")
    def edit_user(user_id: str, request: Request, body: dict = Body(...)):
        if set(body) - {"role", "banned", "nameLimit", "adminNote", "username", "rating", "solvedTaskIds", "purgeState"}:
            fail(422, "BAD_BODY", "Unknown user setting")
        if "purgeState" in body and type(body["purgeState"]) is not bool:
            fail(422, "BAD_BODY", "purgeState must be boolean")
        if body.get("purgeState") and body.get("banned") is not True:
            fail(422, "BAD_BODY", "State removal must be requested together with a ban")
        purge = None
        if body.get("purgeState"):
            from .admin_world import purge_user_state
            from .worker import sandbox
            with store.transaction() as tx:
                admin = current(request, tx, admin=True)
                user = tx.get("users", user_id)
                if not user:
                    fail(404, "NOT_FOUND", "User not found")
                protect_admin(tx, admin, user, body)
                original = tx.get("system", "world")
                purge = purge_user_state(tx, original, user_id)
            validation = sandbox({"action": "validate", "snapshot": purge["snapshot"], "changes": {}, "options": {"permitted_overrides": [], "max_overrides": 1000}})
            if validation is None or validation:
                fail(409, "CONTRACT_CONFLICT", "Removing this state conflicts with another override; restore related operations first")
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            user = tx.get("users", user_id)
            if not user:
                fail(404, "NOT_FOUND", "User not found")
            protect_admin(tx, admin, user, body)
            if purge is not None:
                if world["version"] != original["version"]:
                    fail(409, "WORLD_CHANGED", "The world changed; retry the ban")
                from .worker import schedule_rechecks
                purge["version"] += 1
                world = purge
                tx.save_world(world)
                schedule_rechecks(tx, {}, world, all_submissions=True)
            if "username" in body:
                username = clean_text(body["username"], "username", world["settings"], 3, 24)
                if not re.fullmatch(r"[A-Za-z0-9_]+", username):
                    fail(422, "BAD_BODY", "Invalid username")
                owner = tx.get("usernames", username.casefold())
                if owner and owner != user_id:
                    fail(409, "USERNAME_TAKEN", "Username is already taken")
                tx.delete("usernames", user["username"].casefold())
                tx.put("usernames", username.casefold(), user_id)
                if user.get("displayName") == user["username"]:
                    user["displayName"] = username
                user["username"] = username
                for submission in tx.list("submissions", user_id=user_id):
                    submission["username"] = username
                    tx.put("submissions", submission["id"], submission)
            if "solvedTaskIds" in body:
                selected = words(body["solvedTaskIds"], "solvedTaskIds", 10000)
                task_ids = {task["id"] for task in tx.list("tasks")}
                if set(selected) - task_ids:
                    fail(422, "BAD_BODY", "Unknown task in solvedTaskIds")
                natural = solved_tasks(tx, {**user, "solvedOverrides": {}})
                user["solvedOverrides"] = {task_id: task_id in selected for task_id in task_ids if (task_id in natural) != (task_id in selected)}
            if "rating" in body:
                target = integer(body["rating"], "rating", -1000000000, 1000000000)
                tasks = {task["id"]: task for task in tx.list("tasks")}
                base = sum(tasks[key]["score"] for key in solved_tasks(tx, user, tasks))
                user["ratingAdjustment"] = target - base + user.get("submissionPenalties", 0)
            if "role" in body:
                if body["role"] not in ["admin", "user"]:
                    fail(422, "BAD_BODY", "Invalid role")
                if user["role"] != body["role"]:
                    revoke_sessions(tx, user_id)
                user["role"] = body["role"]
            if "banned" in body:
                if type(body["banned"]) is not bool:
                    fail(422, "BAD_BODY", "banned must be boolean")
                if user.get("banned") != body["banned"]:
                    revoke_sessions(tx, user_id)
                user["banned"] = body["banned"]
            if "nameLimit" in body:
                user["nameLimit"] = integer(body["nameLimit"], "nameLimit", 0, 10000)
            if "adminNote" in body:
                user["adminNote"] = text(body["adminNote"], "adminNote", 0, 1000)
            tx.put("users", user_id, user)
            refresh_ratings(tx)
            tx.audit(admin["id"], "update_user", user_id, fields=sorted(body))
            user = tx.get("users", user_id)
            return {**public_user(user, True), "solvedTaskIds": sorted(solved_tasks(tx, user))}

    @app.post("/api/admin/users/{user_id}/password", status_code=204)
    def reset_password(user_id: str, request: Request, body: dict = Body(...)):
        password = text(body.get("password"), "password", 12, 256)
        with store.transaction() as tx:
            current(request, tx, admin=True)
        encoded_password = password_hash(password)
        with store.transaction() as tx:
            tx.world()
            admin = current(request, tx, admin=True)
            user = tx.get("users", user_id)
            if not user:
                fail(404, "NOT_FOUND", "User not found")
            user["passwordHash"] = encoded_password
            tx.put("users", user_id, user)
            revoke_sessions(tx, user_id)
            tx.audit(admin["id"], "reset_password", user_id)
        return Response(status_code=204)

    @app.delete("/api/admin/users/{user_id}", status_code=204)
    def delete_user(user_id: str, request: Request):
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            user = tx.get("users", user_id)
            if not user:
                fail(404, "NOT_FOUND", "User not found")
            protect_admin(tx, admin, user, {}, True)
            from .ownership import remember_owners
            remember_owners(tx, world)
            world["version"] += 1
            tx.save_world(world)
            revoke_sessions(tx, user_id)
            tx.delete("users", user_id)
            tx.delete("usernames", user["username"].casefold())
            tx.execute("DELETE FROM dependencies WHERE submission_id IN (SELECT id FROM records WHERE kind='submissions' AND user_id=?)", (user_id,))
            tx.execute("DELETE FROM records WHERE kind='submissions' AND user_id=?", (user_id,))
            tx.execute("DELETE FROM jobs WHERE user_id=?", (user_id,))
            tx.audit(admin["id"], "delete_user", user_id)
        return Response(status_code=204)

    @app.get("/api/admin/invites")
    def invites(request: Request):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            return tx.list("invites")

    @app.post("/api/admin/invites", status_code=201)
    def create_invite(request: Request, body: dict = Body(default={})):
        from datetime import datetime, timezone
        if set(body) - {"maxUses", "expiresInHours"}:
            fail(422, "BAD_BODY", "Unknown invitation setting")
        uses = integer(body.get("maxUses", 1), "maxUses", 1, 500)
        hours = integer(body.get("expiresInHours", 24), "expiresInHours", 1, 168)
        code = secrets.token_urlsafe(24)
        with store.transaction() as tx:
            admin = current(request, tx, admin=True)
            expires = datetime.fromtimestamp(time.time() + hours * 3600, timezone.utc).isoformat().replace("+00:00", "Z")
            invite = {"id": uid("inv_"), "createdAt": iso(), "uses": 0, "maxUses": uses, "expiresAt": expires}
            tx.put("invites", token_hash(code), invite)
            tx.audit(admin["id"], "create_invite", invite["id"])
            return {**invite, "code": code}

    @app.delete("/api/admin/invites/{invite_id}", status_code=204)
    def delete_invite(invite_id: str, request: Request):
        with store.transaction() as tx:
            tx.world()
            admin = current(request, tx, admin=True)
            found = False
            for row in tx.execute("SELECT id,data FROM records WHERE kind='invites'").fetchall():
                if json.loads(row[1])["id"] == invite_id:
                    tx.delete("invites", row[0])
                    found = True
            if not found:
                fail(404, "NOT_FOUND", "Invite not found")
            tx.audit(admin["id"], "delete_invite", invite_id)
        return Response(status_code=204)

    @app.get("/api/admin/submissions")
    def admin_submissions(request: Request, limit: int = 100, beforeCreated: str | None = None, beforeId: str | None = None):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            return submission_list(tx, limit=limit, before_created=beforeCreated, before_id=beforeId)

    @app.get("/api/admin/audit")
    def audit(request: Request):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            return tx.list("audit", limit=200)

    def news_body(body, old=None):
        item = dict(old or {"id": uid("news_"), "createdAt": iso(), "pinned": False, "category": "update", "accent": "cyan", "body": ""})
        for key in ["title", "body", "startsAt", "endsAt"]:
            if key in body:
                item[key] = text(body[key], key, 0, 20000 if key == "body" else 256)
        if not item.get("title"):
            fail(422, "BAD_BODY", "title is required")
        for key, choices in [("category", ["event", "update", "maintenance", "holiday"]), ("accent", ["cyan", "magenta", "violet", "amber"])]:
            if key in body:
                if body[key] not in choices:
                    fail(422, "BAD_BODY", f"Invalid {key}")
                item[key] = body[key]
        if "pinned" in body:
            if type(body["pinned"]) is not bool:
                fail(422, "BAD_BODY", "pinned must be boolean")
            item["pinned"] = body["pinned"]
        if "cta" in body:
            cta = body["cta"]
            if cta is None:
                item.pop("cta", None)
            elif isinstance(cta, dict) and isinstance(cta.get("href"), str) and (cta["href"].startswith("/") and not cta["href"].startswith("//")):
                item["cta"] = {"label": text(cta.get("label"), "cta label", 1, 80), "href": text(cta["href"], "cta href", 1, 256)}
            else:
                fail(422, "BAD_BODY", "CTA must link to a path on this site")
        return item

    @app.post("/api/admin/news", status_code=201)
    def create_news(request: Request, body: dict = Body(...)):
        with store.transaction() as tx:
            admin = current(request, tx, admin=True)
            item = news_body(body)
            tx.put("news", item["id"], item)
            tx.audit(admin["id"], "create_news", item["id"])
            return item

    @app.patch("/api/admin/news/{news_id}")
    def edit_news(news_id: str, request: Request, body: dict = Body(...)):
        with store.transaction() as tx:
            admin = current(request, tx, admin=True)
            old = tx.get("news", news_id)
            if not old:
                fail(404, "NOT_FOUND", "News item not found")
            item = news_body(body, old)
            tx.put("news", news_id, item)
            tx.audit(admin["id"], "update_news", news_id)
            return item

    @app.delete("/api/admin/news/{news_id}", status_code=204)
    def delete_news(news_id: str, request: Request):
        with store.transaction() as tx:
            admin = current(request, tx, admin=True)
            tx.delete("news", news_id)
            tx.audit(admin["id"], "delete_news", news_id)
        return Response(status_code=204)

    def validate_task(body, old=None):
        item = dict(old or {"id": uid("tsk_"), "solvedBy": 0, "languageVersion": "v0.3", "addonPacks": ["core"], "tags": [], "score": 50, "difficulty": "easy", "statement": "", "constraints": [], "examples": [], "entryPoint": "solve", "timeLimitMs": 1000, "coreOverrideLimit": 2, "allowedWords": None, "starterCode": ""})
        for key in ["slug", "title", "statement", "starterCode", "entryPoint"]:
            if key in body:
                item[key] = text(body[key], key, 0, 65536 if key == "starterCode" else 20000)
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item.get("slug", "")):
            fail(422, "BAD_BODY", "A lowercase hyphenated slug is required")
        for key in ["tags"]:
            if key in body:
                item[key] = words(body[key], key, 100)
        if "constraints" in body:
            if not isinstance(body["constraints"], list) or len(body["constraints"]) > 100:
                fail(422, "BAD_BODY", "constraints must be a list of at most 100 strings")
            item["constraints"] = [text(value, "constraint", 0, 2000) for value in body["constraints"]]
        for key, lower, upper in [("score", 0, 10000), ("timeLimitMs", 10, 5000), ("coreOverrideLimit", 0, 32)]:
            if key in body:
                item[key] = integer(body[key], key, lower, upper)
        if "difficulty" in body:
            if body["difficulty"] not in ["easy", "medium", "hard", "nightmare"]:
                fail(422, "BAD_BODY", "Invalid difficulty")
            item["difficulty"] = body["difficulty"]
        if "allowedWords" in body:
            item["allowedWords"] = None if body["allowedWords"] is None else words(body["allowedWords"], "allowedWords")
            if item["allowedWords"] and any(not re.fullmatch("[a-zA-Z]+", word) for word in item["allowedWords"]):
                fail(422, "BAD_BODY", "Dictionary entries must contain English letters only")
        if "ratingTable" in body:
            item["ratingTable"] = text(body["ratingTable"], "ratingTable", 0, 80)
            if item["ratingTable"] == "global" or item["ratingTable"].startswith("task:"):
                fail(422, "BAD_BODY", "This rating table name is reserved")
        if "tests" in body:
            tests = body["tests"]
            if not isinstance(tests, list) or not 1 <= len(tests) <= 100:
                fail(422, "BAD_BODY", "Supply 1–100 tests")
            for test in tests:
                if not isinstance(test, dict) or not isinstance(test.get("input"), list) or "expected" not in test or len(dumps(test)) > 20000:
                    fail(422, "BAD_BODY", "Each test needs input argument array and expected value")
                if "hidden" in test and type(test["hidden"]) is not bool:
                    fail(422, "BAD_BODY", "hidden must be boolean")
                if len(test["input"]) > 32:
                    fail(422, "BAD_BODY", "Tests may have at most 32 input arguments")
                stack, cells = [(test["input"], 0), (test["expected"], 0)], 0
                while stack:
                    value, depth = stack.pop()
                    cells += 1
                    if depth > 32 or cells > 10000:
                        fail(422, "BAD_BODY", "Test values exceed depth or size limits")
                    if type(value) is int and -1000000 <= value <= 1000000:
                        continue
                    if isinstance(value, str) and len(value) <= 10000:
                        continue
                    if isinstance(value, list):
                        stack.extend((item, depth + 1) for item in value)
                    elif isinstance(value, dict) and set(value) == {"$dict"} and isinstance(value["$dict"], list) and all(isinstance(pair, list) and len(pair) == 2 for pair in value["$dict"]):
                        stack.extend((item, depth + 1) for pair in value["$dict"] for item in pair)
                    else:
                        fail(422, "BAD_BODY", "Tests support bounded integers, strings, lists and {$dict: [[key,value]]} dictionaries")
            item["tests"] = tests
            item["examples"] = [{"input": dumps(t["input"]), "output": dumps(t["expected"])} for t in tests if not t.get("hidden")]
        if not item.get("tests"):
            fail(422, "BAD_BODY", "Tests are required")
        if "translations" in body:
            translations = body["translations"]
            if not isinstance(translations, dict) or not translations or set(translations) - {"en", "ru"}:
                fail(422, "BAD_BODY", "Supply at least one English or Russian translation")
            cleaned = {}
            for locale, translated in translations.items():
                if not isinstance(translated, dict) or set(translated) - {"title", "statement", "constraints", "examples"}:
                    fail(422, "BAD_BODY", "Invalid task translation")
                entry = {"title": text(translated.get("title"), "translated title", 1, 256), "statement": text(translated.get("statement"), "translated statement", 1, 20000)}
                if not entry["title"].strip() or not entry["statement"].strip():
                    fail(422, "BAD_BODY", "Each translation needs a title and statement")
                constraints = translated.get("constraints", [])
                if not isinstance(constraints, list) or len(constraints) > 100:
                    fail(422, "BAD_BODY", "Translated constraints must be a list of at most 100 strings")
                entry["constraints"] = [text(value, "translated constraint", 0, 2000) for value in constraints]
                examples = translated.get("examples", item["examples"])
                if not isinstance(examples, list) or len(examples) > 100:
                    fail(422, "BAD_BODY", "Translated examples must be a list of at most 100 examples")
                entry["examples"] = []
                for example in examples:
                    if not isinstance(example, dict) or set(example) - {"input", "output", "explanation"}:
                        fail(422, "BAD_BODY", "Invalid translated example")
                    clean = {key: text(example.get(key), "example " + key, 0, 20000) for key in ("input", "output")}
                    if "explanation" in example:
                        clean["explanation"] = text(example["explanation"], "example explanation", 0, 20000)
                    entry["examples"].append(clean)
                cleaned[locale] = entry
            item["translations"] = cleaned
        elif not item.get("translations"):
            if not item.get("title") or not item.get("title", "").strip():
                fail(422, "BAD_BODY", "A title is required")
            item["translations"] = {"en": {key: item[key] for key in ("title", "statement", "constraints", "examples")}}
        else:
            preferred = "en" if "en" in item["translations"] else "ru"
            item["translations"] = {key: dict(value) for key, value in item["translations"].items()}
            for field in ("title", "statement", "constraints", "examples"):
                if field in body or (field == "examples" and "tests" in body):
                    item["translations"][preferred][field] = item[field]
        preferred = item["translations"].get("en") or item["translations"]["ru"]
        for translated in item["translations"].values():
            for field, maximum in (("title", 256), ("statement", 20000)):
                value = text(translated.get(field), "translated " + field, 1, maximum)
                if not value.strip():
                    fail(422, "BAD_BODY", "Each translation needs a title and statement")
        for field in ("title", "statement", "constraints", "examples"):
            item[field] = preferred[field]
        return item

    @app.get("/api/admin/tasks")
    def admin_tasks(request: Request):
        with store.transaction() as tx:
            current(request, tx, admin=True)
            return tx.list("tasks")

    @app.post("/api/admin/tasks", status_code=201)
    def create_task(request: Request, body: dict = Body(...)):
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            body.setdefault("coreOverrideLimit", world["settings"]["defaultCoreOverrideLimit"])
            item = validate_task(body)
            if any(t["slug"] == item["slug"] for t in tx.list("tasks")):
                fail(409, "SLUG_TAKEN", "Task slug is already taken")
            tx.put("tasks", item["id"], item)
            tx.audit(admin["id"], "create_task", item["id"])
            return item

    @app.patch("/api/admin/tasks/{task_id}")
    def edit_task(task_id: str, request: Request, body: dict = Body(...)):
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            item = validate_task(body, find_task(tx, task_id))
            if any(t["slug"] == item["slug"] and t["id"] != item["id"] for t in tx.list("tasks")):
                fail(409, "SLUG_TAKEN", "Task slug is already taken")
            tx.put("tasks", item["id"], item)
            world["version"] += 1
            tx.save_world(world)
            from .worker import schedule_rechecks, refresh_ratings
            schedule_rechecks(tx, {}, world, all_submissions=True, task_id=item["id"])
            refresh_ratings(tx)
            tx.audit(admin["id"], "update_task", item["id"])
            return item

    @app.delete("/api/admin/tasks/{task_id}", status_code=204)
    def delete_task(task_id: str, request: Request):
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            task = find_task(tx, task_id)
            from .ownership import remember_owners
            remember_owners(tx, world)
            tx.delete("tasks", task["id"])
            tx.execute("DELETE FROM dependencies WHERE submission_id IN (SELECT id FROM records WHERE kind='submissions' AND task_id=?)", (task["id"],))
            tx.execute("DELETE FROM records WHERE kind='submissions' AND task_id=?", (task["id"],))
            world["version"] += 1
            tx.save_world(world)
            from .worker import refresh_ratings
            refresh_ratings(tx)
            tx.audit(admin["id"], "delete_task", task["id"])
        return Response(status_code=204)

    @app.post("/api/admin/overrides/restore")
    def restore(request: Request, body: dict = Body(default={})):
        selected = words(body.get("operations", OPERATIONS), "operations", len(OPERATIONS))
        if set(selected) - set(OPERATIONS):
            fail(422, "BAD_BODY", "Unknown core operation")
        # Queue restoration so all contract validation happens in a killable interpreter subprocess.
        with store.transaction() as tx:
            world = tx.world()
            admin = current(request, tx, admin=True)
            job = {"id": uid("job_"), "userId": admin["id"], "mode": "restore", "operations": selected, "createdAt": iso()}
            tx.execute("INSERT INTO jobs(id,user_id,status,created,data) VALUES(?,?,'queued',?,?)", (job["id"], admin["id"], time.time(), dumps(job)))
            tx.audit(admin["id"], "request_restore", operations=selected)
            return {"jobId": job["id"], "restored": selected, "version": world["version"]}

    return app


DUMMY_HASH = password_hash("unusable-dummy-password")
app = create_app()
