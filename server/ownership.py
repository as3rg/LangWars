"""Keep namespace authorship after task/submission history is removed."""


def remember_owners(tx, world):
    users = world.setdefault("ownerUsers", {})
    missing = {owner for name, owner in world.get("owners", {}).items() if name not in users and not owner.startswith("admin:")}
    if not missing:
        return
    authors = {identifier: user_id for identifier, user_id in tx.execute("SELECT id,user_id FROM records WHERE kind='submissions'").fetchall() if identifier in missing}
    for name, owner in world.get("owners", {}).items():
        if owner in authors:
            users.setdefault(name, authors[owner])
