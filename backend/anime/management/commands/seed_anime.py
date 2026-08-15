import json
import time
import urllib.parse
import urllib.request

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from anime.models import Anime, Episode, Genre

JIKAN_API = 'https://api.jikan.moe/v4'
JIKAN_TOP_URL = f'{JIKAN_API}/top/anime?limit={{limit}}&page={{page}}'
FETCH_CHUNK = 3
DEFAULT_EPISODES = 12
DEFAULT_DURATION = 1440
HLS_TEST_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

FALLBACK_ANIME = [
    {
        'title': 'Steel Horizon',
        'synopsis': 'A young pilot discovers a prototype mech hidden beneath his hometown and gets swept into a war between rival corporations.',
        'genres': ['Action', 'Mecha', 'Sci-Fi'],
        'studio': 'Studio Kage',
        'release_year': 2019,
        'episodes': 12,
    },
    {
        'title': 'Cherry Blossom High',
        'synopsis': 'A transfer student navigates friendships, club drama, and first love in a sleepy coastal high school.',
        'genres': ['Comedy', 'Romance', 'Slice of Life'],
        'studio': 'BloomWorks',
        'release_year': 2021,
        'episodes': 13,
    },
    {
        'title': 'Dungeon Dwellers',
        'synopsis': 'Four misfit adventurers clear floors of a cursed dungeon in exchange for a chance to clear their debts.',
        'genres': ['Action', 'Adventure', 'Fantasy', 'Comedy'],
        'studio': 'Rune Studio',
        'release_year': 2023,
        'episodes': 24,
    },
    {
        'title': 'Midnight Circuit',
        'synopsis': 'In a neon-drenched megacity, an underground racer hunts the driver who framed her brother.',
        'genres': ['Action', 'Thriller', 'Sci-Fi'],
        'studio': 'Neon Frame',
        'release_year': 2022,
        'episodes': 10,
    },
    {
        'title': 'Sakura and the Fox',
        'synopsis': 'A shrine maiden befriends a mischievous fox spirit who only she can see.',
        'genres': ['Fantasy', 'Romance', 'Supernatural'],
        'studio': 'BloomWorks',
        'release_year': 2024,
        'episodes': 12,
    },
    {
        'title': 'Ace Volleyball Club',
        'synopsis': 'An undersized setter joins a high school volleyball team with a star rookie and a bitter rivalry.',
        'genres': ['Sports', 'Drama'],
        'studio': 'SmashHouse',
        'release_year': 2020,
        'episodes': 25,
    },
]


def _fetch_json(url, retries=4):
    last_error = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'anime-project/1.0'})
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 429:
                retry_after = int(exc.headers.get('Retry-After', 3))
                time.sleep(max(retry_after, 2))
            elif attempt < retries - 1:
                time.sleep(3)
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(3)
    raise RuntimeError(f'Jikan request failed: {last_error}')


def _fetch_top_anime(limit):
    raw_entries = []
    page = 1
    while len(raw_entries) < limit:
        chunk = min(FETCH_CHUNK, limit - len(raw_entries))
        payload = _fetch_json(JIKAN_TOP_URL.format(limit=chunk, page=page))
        batch = payload.get('data', [])
        raw_entries.extend(batch)
        last_visible = payload.get('pagination', {}).get('last_visible_page', page)
        if not batch or page >= last_visible:
            break
        page += 1
        time.sleep(1)

    items = []
    for entry in raw_entries[:limit]:
        images = entry.get('images', {}).get('webp', {}) or entry.get('images', {}).get('jpg', {})
        items.append({
            'title': entry.get('title') or entry.get('title_japanese') or 'Unknown',
            'synopsis': entry.get('synopsis') or '',
            'genres': [genre['name'] for genre in entry.get('genres', [])],
            'studio': entry.get('studios', [{}])[0].get('name', '') if entry.get('studios') else '',
            'release_year': entry.get('year'),
            'episodes': entry.get('episodes') or DEFAULT_EPISODES,
            'cover_image': images.get('image_url', ''),
        })
    return items


def _cover_image(title):
    return f'https://picsum.photos/seed/{slugify(title)}/400/560'


def _create_anime(self, item):
    title = item['title']
    anime, _ = Anime.objects.get_or_create(
        title=title,
        defaults={
            'synopsis': item['synopsis'],
            'studio': item['studio'],
            'release_year': item['release_year'],
            'cover_image': item.get('cover_image') or _cover_image(title),
            'is_published': True,
        },
    )

    genre_names = item['genres']
    if genre_names:
        for name in genre_names:
            Genre.objects.get_or_create(name=name, defaults={'slug': slugify(name)})
        anime.genres.set(Genre.objects.filter(name__in=genre_names))

    for number in range(1, item['episodes'] + 1):
        Episode.objects.update_or_create(
            anime=anime,
            number=number,
            defaults={
                'title': f'Episode {number}',
                'thumbnail': f'https://picsum.photos/seed/{slugify(title)}-ep{number}/320/180',
                'video_url': HLS_TEST_STREAM,
                'duration': DEFAULT_DURATION,
            },
        )
    return anime


class Command(BaseCommand):
    help = 'Seed the database with real anime from Jikan (MyAnimeList) with built-in fallback.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=20, help='Number of anime to fetch from Jikan.')
        parser.add_argument('--flush', action='store_true', help='Delete all existing anime/episodes/genres first.')

    def handle(self, *args, **options):
        if options['flush']:
            Episode.objects.all().delete()
            Anime.objects.all().delete()
            Genre.objects.all().delete()
            self.stdout.write('Flushed existing anime data.')

        try:
            items = _fetch_top_anime(options['limit'])
            source = 'Jikan (api.jikan.moe)'
        except RuntimeError as exc:
            self.stderr.write(f'Jikan unreachable ({exc}). Using built-in fallback data.')
            items = FALLBACK_ANIME
            source = 'built-in fallback'

        for item in items:
            _create_anime(self, item)

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {Anime.objects.count()} anime, {Episode.objects.count()} episodes, {Genre.objects.count()} genres from {source}.'
        ))
