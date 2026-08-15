from django.db.models import Count
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Anime, Episode, Genre
from .serializers import (
    AnimeDetailSerializer,
    AnimeListSerializer,
    EpisodeDetailSerializer,
    EpisodeSerializer,
    GenreSerializer,
)


class AnimeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Anime.objects.filter(is_published=True)
    serializer_class = AnimeListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'synopsis', 'studio']
    ordering_fields = ['title', 'release_year', 'studio']
    ordering = ['-release_year', 'title']

    def get_queryset(self):
        queryset = self.queryset.annotate(episode_count=Count('episodes'))
        genre = self.request.query_params.get('genre')
        if genre:
            queryset = queryset.filter(genres__slug=genre)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AnimeDetailSerializer
        return AnimeListSerializer

    @action(detail=True, methods=['get'])
    def episodes(self, request, pk=None):
        anime = self.get_object()
        episodes = anime.episodes.all()
        page = self.paginate_queryset(episodes)
        if page is not None:
            serializer = EpisodeSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = EpisodeSerializer(episodes, many=True)
        return Response(serializer.data)


class EpisodeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EpisodeDetailSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['number', 'title']
    ordering = ['anime_id', 'number']

    def get_queryset(self):
        queryset = Episode.objects.select_related('anime').all()
        anime_id = self.request.query_params.get('anime')
        if anime_id:
            queryset = queryset.filter(anime_id=anime_id)
        return queryset


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.annotate(anime_count=Count('animes')).order_by('name')
    serializer_class = GenreSerializer
