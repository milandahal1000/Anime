from django.contrib.auth.models import User
from django.http import Http404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Anime, Episode, WatchHistory
from .serializers import (
    AnimeListSerializer,
    RegisterSerializer,
    UserSerializer,
    WatchHistorySerializer,
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'refresh': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        return Response(
            {
                'user': UserSerializer(request.user).data,
                'profile': {
                    'id': profile.id,
                    'avatar': profile.avatar,
                    'bio': profile.bio,
                    'favorites': AnimeListSerializer(profile.favorites.all(), many=True).data,
                },
            }
        )


class FavoritesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        serializer = AnimeListSerializer(profile.favorites.all(), many=True)
        return Response(serializer.data)

    def post(self, request):
        anime_id = request.data.get('anime_id')
        if not anime_id:
            return Response(
                {'anime_id': 'This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            anime = Anime.objects.filter(is_published=True).get(pk=anime_id)
        except Anime.DoesNotExist:
            raise Http404
        request.user.profile.favorites.add(anime)
        return Response(AnimeListSerializer(anime).data, status=status.HTTP_200_OK)


class FavoriteDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, anime_id):
        profile = request.user.profile
        profile.favorites.remove(anime_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class WatchHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        history = request.user.watch_history.prefetch_related('anime__genres', 'anime__episodes', 'episode')
        serializer = WatchHistorySerializer(history, many=True)
        return Response(serializer.data)

    def post(self, request):
        anime_id = request.data.get('anime_id')
        episode_id = request.data.get('episode_id')
        if not anime_id:
            return Response(
                {'anime_id': 'This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            anime = Anime.objects.filter(is_published=True).get(pk=anime_id)
        except Anime.DoesNotExist:
            raise Http404

        episode = None
        if episode_id:
            try:
                episode = anime.episodes.get(pk=episode_id)
            except Episode.DoesNotExist:
                raise Http404

        history, _ = WatchHistory.objects.update_or_create(
            user=request.user,
            anime=anime,
            defaults={
                'episode': episode,
                'progress_seconds': request.data.get('progress_seconds', 0),
                'is_completed': request.data.get('is_completed', False),
            },
        )
        serializer = WatchHistorySerializer(history)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.all()
        return Response(UserSerializer(users, many=True).data)
