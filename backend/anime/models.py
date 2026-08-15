from django.conf import settings
from django.db import models


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Anime(models.Model):
    anilist_id = models.PositiveIntegerField(unique=True, null=True, blank=True)
    title = models.CharField(max_length=255)
    synopsis = models.TextField(blank=True)
    genres = models.ManyToManyField(Genre, related_name='animes')
    studio = models.CharField(max_length=255, blank=True)
    release_year = models.PositiveIntegerField(null=True, blank=True)
    cover_image = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-release_year', 'title']

    def __str__(self):
        return self.title


class Episode(models.Model):
    anime = models.ForeignKey(Anime, related_name='episodes', on_delete=models.CASCADE)
    number = models.PositiveIntegerField()
    title = models.CharField(max_length=255, blank=True)
    video_url = models.URLField(blank=True)
    thumbnail = models.URLField(blank=True)
    duration = models.PositiveIntegerField(help_text='Duration in seconds', null=True, blank=True)

    class Meta:
        ordering = ['number']
        constraints = [
            models.UniqueConstraint(fields=['anime', 'number'], name='unique_anime_episode_number'),
        ]

    def __str__(self):
        return f'{self.anime.title} - Episode {self.number}'


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name='profile',
        on_delete=models.CASCADE,
    )
    avatar = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    favorites = models.ManyToManyField(Anime, related_name='favorited_by', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username


class WatchHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='watch_history', on_delete=models.CASCADE)
    anime = models.ForeignKey(Anime, related_name='watch_history', on_delete=models.CASCADE)
    episode = models.ForeignKey(
        Episode,
        related_name='watch_history',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    progress_seconds = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'anime'], name='unique_user_anime_history'),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.anime.title}'
