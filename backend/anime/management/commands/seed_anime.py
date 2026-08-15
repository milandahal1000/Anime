from django.core.management.base import BaseCommand
from django.utils.text import slugify

from anime.models import Anime, Episode, Genre


GENRES = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Mecha',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Sports',
    'Supernatural',
    'Thriller',
]

ANIME = [
    {
        'title': 'Steel Horizon',
        'synopsis': 'A young pilot discovers a prototype mech hidden beneath his hometown and gets swept into a war between rival corporations.',
        'genres': ['Action', 'Mecha', 'Sci-Fi'],
        'studio': 'Studio Kage',
        'release_year': 2019,
        'cover_image': 'https://picsum.photos/seed/steel-horizon/400/560',
        'episodes': 12,
    },
    {
        'title': 'Cherry Blossom High',
        'synopsis': 'A transfer student navigates friendships, club drama, and first love in a sleepy coastal high school.',
        'genres': ['Comedy', 'Romance', 'Slice of Life'],
        'studio': 'BloomWorks',
        'release_year': 2021,
        'cover_image': 'https://picsum.photos/seed/cherry-blossom/400/560',
        'episodes': 13,
    },
    {
        'title': 'Dungeon Dwellers',
        'synopsis': 'Four misfit adventurers clear floors of a cursed dungeon in exchange for a chance to clear their debts.',
        'genres': ['Action', 'Adventure', 'Fantasy', 'Comedy'],
        'studio': 'Rune Studio',
        'release_year': 2023,
        'cover_image': 'https://picsum.photos/seed/dungeon-dwellers/400/560',
        'episodes': 24,
    },
    {
        'title': 'Midnight Circuit',
        'synopsis': 'In a neon-drenched megacity, an underground racer hunts the driver who framed her brother.',
        'genres': ['Action', 'Thriller', 'Sci-Fi'],
        'studio': 'Neon Frame',
        'release_year': 2022,
        'cover_image': 'https://picsum.photos/seed/midnight-circuit/400/560',
        'episodes': 10,
    },
    {
        'title': 'Sakura and the Fox',
        'synopsis': 'A shrine maiden befriends a mischievous fox spirit who only she can see.',
        'genres': ['Fantasy', 'Romance', 'Supernatural'],
        'studio': 'BloomWorks',
        'release_year': 2024,
        'cover_image': 'https://picsum.photos/seed/sakura-fox/400/560',
        'episodes': 12,
    },
    {
        'title': 'Ace Volleyball Club',
        'synopsis': 'An undersized setter joins a high school volleyball team with a star rookie and a bitter rivalry.',
        'genres': ['Sports', 'Drama'],
        'studio': 'SmashHouse',
        'release_year': 2020,
        'cover_image': 'https://picsum.photos/seed/ace-volleyball/400/560',
        'episodes': 25,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with sample genres and anime.'

    def handle(self, *args, **options):
        for name in GENRES:
            Genre.objects.get_or_create(name=name, defaults={'slug': slugify(name)})

        for item in ANIME:
            anime, created = Anime.objects.get_or_create(
                title=item['title'],
                defaults={
                    'synopsis': item['synopsis'],
                    'studio': item['studio'],
                    'release_year': item['release_year'],
                    'cover_image': item['cover_image'],
                    'is_published': True,
                },
            )
            anime.genres.set(Genre.objects.filter(name__in=item['genres']))

            for number in range(1, item['episodes'] + 1):
                Episode.objects.get_or_create(
                    anime=anime,
                    number=number,
                    defaults={
                        'title': f'Episode {number}',
                        'thumbnail': f'https://picsum.photos/seed/{slugify(anime.title)}-ep{number}/320/180',
                        'video_url': f'https://storage.example.com/{slugify(anime.title)}/ep{number}.mp4',
                        'duration': 1440,
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {Genre.objects.count()} genres, {Anime.objects.count()} anime, {Episode.objects.count()} episodes.'
        ))
