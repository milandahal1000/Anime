from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase

from .models import Anime, Episode, Genre, Profile


class BaseApiTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.action = Genre.objects.create(name='Action', slug='action')
        cls.romance = Genre.objects.create(name='Romance', slug='romance')

        cls.anime1 = Anime.objects.create(
            title='Steel Horizon',
            synopsis='Mech battles in the sky.',
            studio='Studio Kage',
            release_year=2019,
            cover_image='https://example.com/steel.jpg',
            is_published=True,
        )
        cls.anime1.genres.add(cls.action, cls.romance)

        cls.anime2 = Anime.objects.create(
            title='Dungeon Dwellers',
            synopsis='Adventures underground.',
            studio='Rune Studio',
            release_year=2023,
            cover_image='https://example.com/dungeon.jpg',
            is_published=True,
        )
        cls.anime2.genres.add(cls.action)

        Anime.objects.create(
            title='Unreleased Show',
            synopsis='Not public.',
            release_year=2025,
            is_published=False,
        )

        cls.ep1 = Episode.objects.create(
            anime=cls.anime1, number=1, title='Ignition', video_url='https://example.com/steel-ep1.mp4', duration=1440
        )
        Episode.objects.create(
            anime=cls.anime1, number=2, title='Ascent', video_url='https://example.com/steel-ep2.mp4', duration=1380
        )
        Episode.objects.create(
            anime=cls.anime2, number=1, title='Descent', video_url='https://example.com/dungeon-ep1.mp4', duration=1500
        )

    def auth_client(self):
        user = User.objects.create_user(username='viewer', password='testpass123')
        Profile.objects.create(user=user)
        client = APIClient()
        client.force_authenticate(user=user)
        return client, user


class PublicApiTests(BaseApiTest):
    def test_health(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')

    def test_genre_list(self):
        response = self.client.get('/api/genres/')
        self.assertEqual(response.status_code, 200)
        names = {item['name'] for item in response.data['results']}
        self.assertEqual(names, {'Action', 'Romance'})

    def test_anime_list_excludes_unpublished(self):
        response = self.client.get('/api/anime/')
        self.assertEqual(response.status_code, 200)
        titles = [item['title'] for item in response.data['results']]
        self.assertEqual(len(titles), 2)
        self.assertNotIn('Unreleased Show', titles)

    def test_anime_list_pagination_fields(self):
        response = self.client.get('/api/anime/')
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('results', response.data)

    def test_anime_filter_by_genre(self):
        response = self.client.get('/api/anime/', {'genre': 'romance'})
        titles = [item['title'] for item in response.data['results']]
        self.assertEqual(titles, ['Steel Horizon'])

    def test_anime_search(self):
        response = self.client.get('/api/anime/', {'search': 'dungeon'})
        titles = [item['title'] for item in response.data['results']]
        self.assertEqual(titles, ['Dungeon Dwellers'])

    def test_anime_ordering(self):
        response = self.client.get('/api/anime/', {'ordering': 'title'})
        titles = [item['title'] for item in response.data['results']]
        self.assertEqual(titles, ['Dungeon Dwellers', 'Steel Horizon'])

    def test_anime_detail_includes_episodes(self):
        response = self.client.get(f'/api/anime/{self.anime1.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['episodes']), 2)
        self.assertEqual(response.data['episodes'][0]['number'], 1)
        self.assertEqual(response.data['genres'][0]['name'], 'Action')

    def test_anime_episodes_action(self):
        response = self.client.get(f'/api/anime/{self.anime1.id}/episodes/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['results'][0]['video_url'], 'https://example.com/steel-ep1.mp4')

    def test_episode_list_and_filter(self):
        response = self.client.get('/api/episodes/', {'anime': self.anime2.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['anime_title'], 'Dungeon Dwellers')

    def test_episode_detail(self):
        response = self.client.get(f'/api/episodes/{self.ep1.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['number'], 1)
        self.assertEqual(response.data['anime_title'], 'Steel Horizon')


class AuthApiTests(BaseApiTest):
    def test_register_returns_tokens_and_profile(self):
        response = self.client.post(
            '/api/auth/register/',
            {'username': 'newbie', 'email': 'n@example.com', 'password': 'strongpass1', 'password2': 'strongpass1'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'newbie')
        self.assertTrue(Profile.objects.filter(user__username='newbie').exists())

    def test_register_password_mismatch(self):
        response = self.client.post(
            '/api/auth/register/',
            {'username': 'newbie', 'password': 'strongpass1', 'password2': 'different1'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_login_returns_tokens(self):
        User.objects.create_user(username='viewer', password='testpass123')
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'viewer', 'password': 'testpass123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)

    def test_me_requires_auth(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_me_returns_profile(self):
        client, user = self.auth_client()
        response = client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['username'], 'viewer')
        self.assertIn('profile', response.data)

    def test_logout_requires_refresh(self):
        client, _ = self.auth_client()
        response = client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(response.status_code, 400)


class FavoritesApiTests(BaseApiTest):
    def test_add_list_remove_favorite(self):
        client, _ = self.auth_client()

        response = client.post('/api/auth/me/favorites/', {'anime_id': self.anime1.id}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Steel Horizon')

        response = client.get('/api/auth/me/favorites/')
        self.assertEqual(len(response.data), 1)

        response = client.delete(f'/api/auth/me/favorites/{self.anime1.id}/')
        self.assertEqual(response.status_code, 204)

        response = client.get('/api/auth/me/favorites/')
        self.assertEqual(len(response.data), 0)

    def test_add_favorite_unknown_anime(self):
        client, _ = self.auth_client()
        response = client.post('/api/auth/me/favorites/', {'anime_id': 9999}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_favorites_require_auth(self):
        response = self.client.get('/api/auth/me/favorites/')
        self.assertEqual(response.status_code, 401)


class WatchHistoryApiTests(BaseApiTest):
    def test_upsert_history(self):
        client, _ = self.auth_client()

        response = client.post(
            '/api/auth/me/watch-history/',
            {'anime_id': self.anime1.id, 'episode_id': self.ep1.id, 'progress_seconds': 120, 'is_completed': False},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['progress_seconds'], 120)

        response = client.post(
            '/api/auth/me/watch-history/',
            {'anime_id': self.anime1.id, 'progress_seconds': 500, 'is_completed': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['progress_seconds'], 500)
        self.assertTrue(response.data['is_completed'])

        response = client.get('/api/auth/me/watch-history/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_history_episode_of_other_anime_rejected(self):
        client, _ = self.auth_client()
        response = client.post(
            '/api/auth/me/watch-history/',
            {'anime_id': self.anime2.id, 'episode_id': self.ep1.id},
            format='json',
        )
        self.assertEqual(response.status_code, 404)

    def test_history_requires_auth(self):
        response = self.client.get('/api/auth/me/watch-history/')
        self.assertEqual(response.status_code, 401)
