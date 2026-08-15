from django.contrib import admin

from .models import Anime, Episode, Genre, Profile, WatchHistory


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 0


@admin.register(Anime)
class AnimeAdmin(admin.ModelAdmin):
    list_display = ('title', 'studio', 'release_year', 'is_published', 'created_at')
    list_filter = ('is_published', 'genres')
    search_fields = ('title', 'synopsis', 'studio')
    filter_horizontal = ('genres',)
    inlines = [EpisodeInline]


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ('anime', 'number', 'title', 'duration')
    list_filter = ('anime',)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    filter_horizontal = ('favorites',)
    search_fields = ('user__username',)


@admin.register(WatchHistory)
class WatchHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'anime', 'episode', 'progress_seconds', 'is_completed', 'updated_at')
