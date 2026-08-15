from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from anime.auth_views import (
    FavoriteDetailView,
    FavoritesView,
    LogoutView,
    MeView,
    RegisterView,
    UserListView,
    WatchHistoryView,
)
from anime.views import AnimeViewSet, EpisodeViewSet, GenreViewSet


def health(request):
    return JsonResponse({"status": "ok"})


router = DefaultRouter()
router.register('anime', AnimeViewSet, basename='anime')
router.register('episodes', EpisodeViewSet, basename='episode')
router.register('genres', GenreViewSet, basename='genre')

auth_urls = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('me/favorites/', FavoritesView.as_view(), name='auth-favorites'),
    path('me/favorites/<int:anime_id>/', FavoriteDetailView.as_view(), name='auth-favorite-detail'),
    path('me/watch-history/', WatchHistoryView.as_view(), name='auth-watch-history'),
    path('users/', UserListView.as_view(), name='auth-users'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/', include(router.urls)),
    path('api/auth/', include(auth_urls)),
]
