from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_artisan_or_ip(request: Request) -> str:
    """
    Rate limit key function: uses user's authorization bearer token if logged in,
    or client IP address as fallback.
    """
    auth = request.headers.get("authorization")
    if auth:
        return auth
    client_ip = get_remote_address(request)
    return client_ip or "127.0.0.1"


limiter = Limiter(key_func=get_artisan_or_ip)
