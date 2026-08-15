from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Anime, Episode, Genre, Profile, WatchHistory


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'slug']


class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        fields = ['id', 'anime', 'number', 'title', 'video_url', 'thumbnail', 'duration']


class EpisodeDetailSerializer(EpisodeSerializer):
    anime_title = serializers.CharField(source='anime.title', read_only=True)
    anilist_id = serializers.IntegerField(source='anime.anilist_id', read_only=True)

    class Meta(EpisodeSerializer.Meta):
        fields = [
            'id',
            'anime',
            'anime_title',
            'anilist_id',
            'number',
            'title',
            'video_url',
            'thumbnail',
            'duration',
        ]


class AnimeListSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    episode_count = serializers.SerializerMethodField()

    def get_episode_count(self, obj):
        if hasattr(obj, 'episode_count'):
            return obj.episode_count
        return obj.episodes.count()

    class Meta:
        model = Anime
        fields = [
            'id',
            'anilist_id',
            'title',
            'synopsis',
            'genres',
            'studio',
            'release_year',
            'cover_image',
            'episode_count',
        ]


class AnimeDetailSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    episodes = EpisodeSerializer(many=True, read_only=True)

    class Meta:
        model = Anime
        fields = [
            'id',
            'anilist_id',
            'title',
            'synopsis',
            'genres',
            'studio',
            'release_year',
            'cover_image',
            'is_published',
            'created_at',
            'updated_at',
            'episodes',
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    favorites = AnimeListSerializer(many=True, read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'avatar', 'bio', 'favorites', 'created_at']
        read_only_fields = ['id', 'user', 'favorites', 'created_at']


class WatchHistorySerializer(serializers.ModelSerializer):
    anime = AnimeListSerializer(read_only=True)
    episode = EpisodeSerializer(read_only=True)
    anime_id = serializers.PrimaryKeyRelatedField(
        queryset=Anime.objects.all(),
        source='anime',
        write_only=True,
    )
    episode_id = serializers.PrimaryKeyRelatedField(
        queryset=Episode.objects.all(),
        source='episode',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = WatchHistory
        fields = [
            'id',
            'user',
            'anime',
            'anime_id',
            'episode',
            'episode_id',
            'progress_seconds',
            'is_completed',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'anime', 'episode', 'updated_at']

    def validate(self, attrs):
        anime = attrs.get('anime') or self.instance.anime if self.instance else attrs.get('anime')
        episode = attrs.get('episode', None)
        if episode is not None and episode.anime_id != anime.id:
            raise serializers.ValidationError({'episode_id': 'Episode does not belong to the given anime.'})
        return attrs
