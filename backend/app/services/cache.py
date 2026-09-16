"""
A small in-process cache for query results that are expensive but change only when the monthly
bulk data is imported: site-wide counts, sitemap chunks. One entry per distinct argument tuple.
"""
import threading
import time
from functools import wraps


def ttl_cache(seconds: float):
    def decorator(fn):
        lock = threading.Lock()
        store: dict = {}

        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            with lock:
                hit = store.get(key)
                if hit and hit[0] > now:
                    return hit[1]
            value = fn(*args, **kwargs)
            with lock:
                store[key] = (now + seconds, value)
            return value

        def clear():
            with lock:
                store.clear()

        wrapper.cache_clear = clear
        return wrapper

    return decorator
