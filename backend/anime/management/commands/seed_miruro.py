import json
import os
import urllib.parse
import urllib.request

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from anime.models import Anime, Episode, Genre

MIRURO_BASE = os.environ.get('MIRURO_BASE', 'http://localhost:3000/api')

HLS_TEST_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

COLLECTIONS = {
    'trending': '/trending',
    'popular': '/popular',
    'top': '/top',
    'recent': '/recent',
    'upcoming': '/upcoming',
}

DEFAULT_EPISODES_MAX = 100


def _fetch_json(url, retries=3):
    last_error = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'anime-project/1.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode('utf-8'))
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries - 1:
                import time
                time.sleep(2)
    raise RuntimeError(f'MiruroAPI request failed: {last_error}')


def _result_to_item(entry):
    title_obj = entry.get('title') or {}
    title = (
        title_obj.get('english')
        or title_obj.get('romaji')
        or title_obj.get('native')
        or 'Unknown'
    )
    cover = entry.get('coverImage') or {}
    studios = entry.get('studios') or {}
    nodes = studios.get('nodes') or []
    studio = next((s.get('name') for s in nodes if s.get('isAnimationStudio')), '')
    return {
        'anilist_id': entry.get('id'),
        'title': title,
        'synopsis': entry.get('synopsis') or '',
        'genres': entry.get('genres') or [],
        'studio': studio or '',
        'release_year': entry.get('seasonYear'),
        'episodes': entry.get('episodes') or 0,
        'cover_image': cover.get('extraLarge') or cover.get('large') or '',
    }


def _sync_genres(self, anime, names):
    genres = []
    for name in names:
        genre, _ = Genre.objects.get_or_create(name=name, defaults={'slug': slugify(name)})
        genres.append(genre)
    anime.genres.set(genres)


def _sync_episodes(self, anime, count):
    count = min(max(int(count), 0), DEFAULT_EPISODES_MAX)
    anime.episodes.exclude(number__lte=count).delete()
    for number in range(1, count + 1):
        Episode.objects.update_or_create(
            anime=anime,
            number=number,
            defaults={
                'title': f'Episode {number}',
                'thumbnail': '',
                'video_url': HLS_TEST_STREAM,
                'duration': None,
            },
        )


def _upsert_anime(self, item):
    anime, created = Anime.objects.update_or_create(
        anilist_id=item['anilist_id'],
        defaults={
            'title': item['title'],
            'synopsis': item['synopsis'],
            'studio': item['studio'],
            'release_year': item['release_year'],
            'cover_image': item['cover_image'],
            'is_published': True,
        },
    )
    _sync_genres(self, anime, item['genres'])
    _sync_episodes(self, anime, item['episodes'])
    return anime, created


class Command(BaseCommand):
    help = 'Seed the database with real anime from the local MiruroAPI (AniList-backed).'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=20, help='Number of anime to fetch.')
        parser.add_argument(
            '--source',
            choices=COLLECTIONS.keys(),
            default='trending',
            help='MiruroAPI collection to pull from.',
        )
        parser.add_argument('--flush', action='store_true', help='Delete all existing anime/episodes/genres first.')
        parser.add_argument('--episodes-max', type=int, default=DEFAULT_EPISODES_MAX, help='Max episodes per anime.')
        parser.add_argument('--no-info', action='store_true', help='Skip per-anime info fetch (synopsis).')

    def handle(self, *args, **options):
        global DEFAULT_EPISODES_MAX
        DEFAULT_EPISODES_MAX = options['episodes_max']

        if options['flush']:
            Episode.objects.all().delete()
            Anime.objects.all().delete()
            Genre.objects.all().delete()
            self.stdout.write('Flushed existing anime data.')

        endpoint = COLLECTIONS[options['source']]
        payload = _fetch_json(f'{MIRURO_BASE}{endpoint}?per_page={options["limit"]}')
        results = (payload.get('results') or {}).get('results') or []

        if not results:
            self.stderr.write(f'No anime returned from {MIRURO_BASE}{endpoint}.')
            return

        for entry in results:
            item = _result_to_item(entry)
            if not options['no_info'] and item['anilist_id']:
                try:
                    info = _fetch_json(f'{MIRURO_BASE}/info/{item["anilist_id"]}')
                    item['synopsis'] = info.get('synopsis') or item['synopsis']
                except RuntimeError as exc:
                    self.stderr.write(f'  info fetch failed for {item["title"]}: {exc}')

            anime, created = _upsert_anime(self, item)
            self.stdout.write(
                f'  {"created" if created else "updated"} '
                f'#{item["anilist_id"]} {item["title"]} ({item["episodes"]} eps)'
            )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {Anime.objects.count()} anime, {Episode.objects.count()} episodes, '
            f'{Genre.objects.count()} genres from MiruroAPI ({MIRURO_BASE}).'
        ))
