PUBLIC_API_MAX_AGE = 60


class CacheControlMiddleware:
    """Add Cache-Control headers to anonymous GET responses for public API endpoints."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if (
            request.method == 'GET'
            and request.path.startswith('/api/')
            and response.status_code < 400
            and not request.user.is_authenticated
            and 'Cache-Control' not in response
        ):
            response['Cache-Control'] = f'public, max-age={PUBLIC_API_MAX_AGE}'
        return response
