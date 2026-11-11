"""Bound one account's retained contribution to the shared namespace."""
from .store import dumps

MAX_ACCOUNT_WORLD_BYTES = 512 * 1024


def account_world_bytes(snapshot, owners, user_id, last_owners=None):
    return len(dumps({section: {name: value for name, value in snapshot.get(section, {}).items()
                              if (last_owners if section == "last" and last_owners is not None else owners).get(name) == user_id}
                      for section in ("variables", "functions", "last")}))


def last_result_owners(world, candidate, changes, user_id):
    """Charge changed last results to their publisher, including inherited calls.

    Definition ownership remains separate: executing somebody else's function
    must not let a publisher allocate retained data against that author's quota.
    """
    before = world["snapshot"].get("last", {})
    owners = {name: world.get("lastOwnerUsers", {}).get(name, world.get("ownerUsers", {}).get(name))
              for name in candidate.get("last", {})}
    for name in changes.get("functions", {}):
        if name in owners:
            owners[name] = user_id
    for name, value in changes.get("last", {}).items():
        if name in owners and (name not in before or value != before[name]):
            owners[name] = user_id
    return owners


def account_growth_allowed(world, candidate, changes, user_id):
    owners = world.get("ownerUsers", {})
    previous_last_owners = {name: world.get("lastOwnerUsers", {}).get(name, owners.get(name))
                            for name in world["snapshot"].get("last", {})}
    before = account_world_bytes(world["snapshot"], owners, user_id, previous_last_owners)
    after_owners = dict(owners)
    for section in ("variables", "functions"):
        after_owners.update({name: user_id for name in changes.get(section, {})})
    after = account_world_bytes(candidate, after_owners, user_id, last_result_owners(world, candidate, changes, user_id))
    # Legacy accounts above the cap can still replace or shrink their data.
    return after <= MAX_ACCOUNT_WORLD_BYTES or after <= before
