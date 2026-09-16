from flask import Flask, render_template, g, jsonify, request, url_for, session, redirect, make_response, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
from datetime import timedelta

import psycopg
from psycopg.rows import dict_row
import os


load_dotenv()


app = Flask(__name__)


# Flask Secret Key
app.secret_key = os.urandom(24)


# Database configuration using Neon's DATABASE_URL
DATABASE_URL = os.getenv('DATABASE_URL')


# Check if connection exists
def get_db():
    if not hasattr(g, 'pg_db'):
        g.pg_db = psycopg.connect(DATABASE_URL)

    return g.pg_db


# Close connection after each request
@app.teardown_appcontext
def close_db(error):
    db = getattr(g, 'pg_db', None)

    if db is not None:
        db.close()


# ROUTES
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/mainpage')
def mainpage():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('mainpage.html')


@app.route('/band-alpha-list')
def band_alpha_list():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('band-alpha-list.html')


@app.route('/albums')
def albums():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('albums.html')


@app.route('/biography')
def biography():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('bio.html')


@app.route('/favorites')
def favorites():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('favorites.html')


@app.route('/playlists')
def playlists():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('playlists.html')


@app.route('/search-results')
def search_results():
    if 'user_username' not in session:
        return redirect(url_for('index'))

    return render_template('search-results.html')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        'static',
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )


# USER LOGIN
@app.route('/user-login', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        username = request.form['login-username']
        password = request.form['login-password']

        user_info = get_user_credentials(username)

        if user_info:
            user_id = user_info['id']
            username = user_info['username']
            hashed_pass = user_info['password']

            if check_password_hash(hashed_pass, password):
                session['user_logged_in'] = True
                session['user_id'] = user_id
                session['user_username'] = username

                return jsonify({
                    'status': 'success',
                    'redirect_url': url_for('mainpage')
                })

            else:
                return jsonify({'error': 'Invalid Password'}), 400

        else:
            return jsonify({'error': 'Username Not Found'}), 400


def get_user_credentials(username):
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            'SELECT id, username, password FROM users WHERE username = %s',
            (username,)
        )

        return cursor.fetchone()


# USER REGISTRATION
@app.route('/user-registration', methods=['POST'])
def user_registration():
    first_name = request.form['register-firstname']
    last_name = request.form['register-lastname']
    username = request.form['register-username']
    email = request.form['register-email']
    password = request.form['register-password']
    confirm_pass = request.form['register-confirm-pass']

    if password != confirm_pass:
        return jsonify({'error': 'Passwords Do Not Match'}), 400

    hashed_pass = generate_password_hash(password)

    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT username, email
            FROM users
            WHERE username = %s OR email = %s
            ''',
            (username, email)
        )

        is_registered = cursor.fetchone()

        if is_registered:
            if is_registered['username'] == username:
                return jsonify({'error': 'Username Already Exists'}), 400

            if is_registered['email'] == email:
                return jsonify({'error': 'Email Is Already In Use'}), 400

        try:
            cursor.execute(
                '''
                INSERT INTO users
                    (first_name, last_name, username, email, password)
                VALUES
                    (%s, %s, %s, %s, %s)
                ''',
                (first_name, last_name, username, email, hashed_pass)
            )

            db.commit()

            return jsonify({
                'status': 'success',
                'message': 'User Registered Successfully'
            }), 201

        except Exception as e:
            db.rollback()

            return jsonify({'error': str(e)}), 500


# USER LOGOUT
@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'

    return response


@app.route('/user-logout')
def user_logout():
    session.clear()

    response = make_response(redirect(url_for('index')))

    return response


# BAND ALPHA LIST
@app.route('/alpha-list')
def alpha_list():
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT
                bands.id,
                bands.name,
                bands.icon_img,
                ROUND(AVG(band_ratings.rating), 2) AS rating
            FROM bands
            LEFT JOIN band_ratings
                ON bands.id = band_ratings.band_id
            GROUP BY
                bands.id,
                bands.name,
                bands.icon_img
            ORDER BY bands.name
            '''
        )

        bands = cursor.fetchall()

    group_bands_per_alpha = {}

    for band in bands:
        first_letter = band['name'][0].upper()

        if first_letter not in group_bands_per_alpha:
            group_bands_per_alpha[first_letter] = []

        band_data = {
            'id': band['id'],
            'name': band['name'],
            'icon_img': band['icon_img'],
            'rating': float(band['rating'])
            if band['rating'] is not None
            else None
        }

        group_bands_per_alpha[first_letter].append(band_data)

    return jsonify(group_bands_per_alpha)


# TOP FIVE FETCH
@app.route('/top-five/<band_name>')
def top_five(band_name):
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        try:
            cursor.execute(
                '''
                SELECT songs.*,
                    ROUND(AVG(song_ratings.rating), 2) AS avg_rating
                FROM songs
                JOIN albums
                    ON albums.id = songs.album_id
                JOIN bands
                    ON bands.id = albums.band_id
                LEFT JOIN song_ratings
                    ON song_ratings.song_id = songs.id
                WHERE bands.name = %s
                GROUP BY songs.id
                ORDER BY
                    COALESCE(AVG(song_ratings.rating), 0) DESC,
                    songs.song_name ASC
                LIMIT 5
                ''',
                (band_name,)
            )

            top_songs = cursor.fetchall()

            if not top_songs:
                return jsonify({
                    'error': 'No songs found for this band'
                }), 404

            for song in top_songs:
                if isinstance(song['song_length'], timedelta):
                    minutes, seconds = divmod(
                        int(song['song_length'].total_seconds()),
                        60
                    )

                    song['song_length'] = f'{minutes:02}:{seconds:02}'

                if song.get('avg_rating') is not None:
                    song['avg_rating'] = float(song['avg_rating'])

            return jsonify(top_songs)

        except Exception as e:
            return jsonify({'error': str(e)}), 500


# ALBUMS AND BAND DATA FETCH
@app.route('/albums-band-data/<band_name>')
def albums_band_data(band_name):
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT
                bands.id AS band_id,
                bands.name AS band_name,
                bands.page_img,
                albums.id AS album_id,
                albums.title AS album_title,
                albums.year_release AS album_release,
                albums.album_img,
                songs.id AS song_id,
                songs.song_name,
                songs.track_number,
                songs.song_length
            FROM bands
            JOIN albums
                ON albums.band_id = bands.id
            LEFT JOIN songs
                ON songs.album_id = albums.id
            WHERE bands.name = %s
            ''',
            (band_name,)
        )

        albums = cursor.fetchall()

    band_data = {
        'band_id': None,
        'band_name': None,
        'page_img': None,
        'albums': {}
    }

    for album in albums:
        if isinstance(album['song_length'], timedelta):
            minutes, seconds = divmod(
                int(album['song_length'].total_seconds()),
                60
            )

            album['song_length'] = f'{minutes:02}:{seconds:02}'

        if band_data['band_id'] is None:
            band_data['band_id'] = album['band_id']
            band_data['band_name'] = album['band_name']
            band_data['page_img'] = album['page_img']

        album_id = album['album_id']

        if album_id not in band_data['albums']:
            band_data['albums'][album_id] = {
                'album_id': album_id,
                'album_title': album['album_title'],
                'album_release': album['album_release'],
                'album_img': album['album_img'],
                'songs': []
            }

        if album['song_id']:
            band_data['albums'][album_id]['songs'].append({
                'song_id': album['song_id'],
                'song_name': album['song_name'],
                'track_number': album['track_number'],
                'song_length': album['song_length']
            })

    return jsonify(band_data)


# BIO FETCH AND BAND MEMBERS
@app.route('/bio-data/<band_name>')
def bio_data(band_name):
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT
                bands.id,
                bands.name,
                bands.logo_img,
                biographies.bio
            FROM bands
            JOIN biographies
                ON biographies.band_id = bands.id
            WHERE bands.name = %s;
            ''',
            (band_name,)
        )

        band_info = cursor.fetchone()

        if not band_info:
            return jsonify({
                'error': 'Band Bio Not Found'
            }), 404

        cursor.execute(
            '''
            SELECT
                musicians.name,
                musicians.instrument
            FROM band_members
            JOIN musicians
                ON musicians.id = band_members.musician_id
            WHERE band_members.band_id = %s;
            ''',
            (band_info['id'],)
        )

        members = cursor.fetchall()

    return jsonify({
        'band_id': band_info['id'],
        'band_name': band_info['name'],
        'band_logo': band_info['logo_img'],
        'bio': band_info['bio'],
        'members': members
    })


# FETCH PLAYLIST AND SONGS FOR USER PLAYLISTS LIST
@app.route('/fetch-full-playlists')
def fetch_full_playlists():
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT
                playlists.id AS playlist_id,
                playlists.playlist_name,
                songs.id AS song_id,
                songs.song_name,
                bands.name AS band_name
            FROM playlists
            LEFT JOIN playlist_songs
                ON playlists.id = playlist_songs.playlist_id
            LEFT JOIN songs
                ON playlist_songs.song_id = songs.id
            LEFT JOIN albums
                ON songs.album_id = albums.id
            LEFT JOIN bands
                ON albums.band_id = bands.id
            WHERE playlists.user_id = %s;
            ''',
            (session['user_id'],)
        )

        playlists_with_songs = cursor.fetchall()

    playlists = {}

    for playlist in playlists_with_songs:
        playlist_id = playlist['playlist_id']
        playlist_name = playlist['playlist_name']
        song_name = playlist['song_name']
        band_name = playlist['band_name']
        song_id = playlist['song_id']

        if playlist_name not in playlists:
            playlists[playlist_name] = {
                'playlist_id': playlist_id,
                'playlist_name': playlist_name,
                'songs': []
            }

        if song_name:
            playlists[playlist_name]['songs'].append({
                'song_name': song_name,
                'band_name': band_name,
                'song_id': song_id
            })

        else:
            playlists[playlist_name]['songs'].append({
                'song_name': 'Playlist is empty',
                'band_name': None,
                'song_id': None
            })

    return jsonify(list(playlists.values()))


# CREATE PLAYLIST
@app.route('/create-playlist', methods=['POST'])
def create_playlist():
    data = request.get_json()
    playlist_name = data.get('playlist_name')

    db = get_db()

    with db.cursor() as cursor:
        try:
            cursor.execute(
                '''
                INSERT INTO playlists
                    (playlist_name, user_id)
                VALUES
                    (%s, %s)
                ''',
                (playlist_name, session['user_id'])
            )

            db.commit()

            return jsonify({
                'message': 'Playlist created successfully'
            })

        except Exception as e:
            db.rollback()

            return jsonify({'error': str(e)}), 500


# FETCH EXISTING PLAYLISTS NAMES
@app.route('/get-playlists')
def get_playlists():
    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            'SELECT * FROM playlists WHERE user_id = %s;',
            (session['user_id'],)
        )

        playlists = cursor.fetchall()

    return jsonify(playlists)


# DELETE PLAYLISTS
@app.route('/delete-playlists', methods=['POST'])
def delete_playlists():
    data = request.get_json()
    playlist_ids = data.get('ids', [])

    if not playlist_ids:
        return jsonify({
            'error': 'No playlist selected'
        }), 400

    db = get_db()

    with db.cursor() as cursor:
        try:
            for playlist_id in playlist_ids:
                cursor.execute(
                    '''
                    DELETE FROM playlists
                    WHERE id = %s AND user_id = %s;
                    ''',
                    (playlist_id, session['user_id'])
                )

            db.commit()

            return jsonify({
                'message': 'playlists delete with success'
            })

        except Exception as e:
            db.rollback()

            return jsonify({
                'error': str(e)
            }), 500


# ADD SONG TO PLAYLIST
@app.route('/add-song-to-playlist', methods=['POST'])
def add_song_to_playlist():
    data = request.get_json()

    playlist_id = data.get('playlist_id')
    song_name = data.get('song_name')
    band_name = data.get('band_name')

    if not all([playlist_id, song_name, band_name]):
        return jsonify({
            'error': 'Missing data'
        }), 400

    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        try:
            cursor.execute(
                '''
                SELECT songs.id
                FROM songs
                JOIN albums
                    ON songs.album_id = albums.id
                JOIN bands
                    ON albums.band_id = bands.id
                WHERE songs.song_name = %s
                    AND bands.name = %s
                ''',
                (song_name, band_name)
            )

            song_result = cursor.fetchone()

            if not song_result:
                return jsonify({
                    'error': 'Song not found'
                }), 404

            song_id = song_result['id']

            cursor.execute(
                '''
                SELECT 1
                FROM playlist_songs
                WHERE playlist_id = %s
                    AND song_id = %s
                ''',
                (playlist_id, song_id)
            )

            if cursor.fetchone():
                return jsonify({
                    'message': 'Song already in playlist'
                })

            cursor.execute(
                '''
                INSERT INTO playlist_songs
                    (playlist_id, song_id)
                VALUES
                    (%s, %s)
                ''',
                (playlist_id, song_id)
            )

            db.commit()

            return jsonify({
                'message': 'Song added to playlist'
            })

        except Exception:
            db.rollback()

            return jsonify({
                'error': 'An error occurred'
            }), 500


# REMOVE SONG FROM PLAYLIST
@app.route('/remove-song-from-playlist', methods=['POST'])
def remove_song_from_playlist():
    data = request.get_json()

    playlist_id = data['playlist_id']
    song_id = data['song_id']

    db = get_db()

    with db.cursor() as cursor:
        try:
            cursor.execute(
                '''
                DELETE FROM playlist_songs
                WHERE playlist_id = %s
                    AND song_id = %s
                ''',
                (playlist_id, song_id)
            )

            db.commit()

            return jsonify({
                'message': 'Song remove with success'
            }), 200

        except Exception:
            db.rollback()

            return jsonify({
                'error': 'Failed to remove song from playlist'
            }), 500


# ADD SONG TO FAVORITES
@app.route('/add-song-to-favorites', methods=['POST'])
def add_song_to_favorites():
    data = request.get_json()
    song_id = data['song_id']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({
            'error': 'User not authenticated'
        }), 401

    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        try:
            cursor.execute(
                '''
                SELECT id
                FROM favorite_songs
                WHERE user_id = %s
                    AND song_id = %s
                ''',
                (user_id, song_id)
            )

            if cursor.fetchone():
                cursor.execute(
                    '''
                    DELETE FROM favorite_songs
                    WHERE user_id = %s
                        AND song_id = %s
                    ''',
                    (user_id, song_id)
                )

                db.commit()

                return jsonify({
                    'message': 'Song removed from favorites'
                }), 200

            else:
                cursor.execute(
                    '''
                    INSERT INTO favorite_songs
                        (user_id, song_id)
                    VALUES
                        (%s, %s)
                    ''',
                    (user_id, song_id)
                )

                db.commit()

                return jsonify({
                    'message': 'Song added to favorites'
                }), 200

        except Exception:
            db.rollback()

            return jsonify({
                'error': 'Failed to add/remove song'
            }), 500


# GET ALL FAVORITE SONGS
@app.route('/get-all-favorite-songs')
def get_all_favorite_songs():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({
            'error': 'Unauthorized'
        }), 401

    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT
                songs.id AS song_id,
                songs.song_name,
                bands.name AS band_name,
                albums.id AS album_id
            FROM favorite_songs
            JOIN songs
                ON favorite_songs.song_id = songs.id
            JOIN albums
                ON songs.album_id = albums.id
            JOIN bands
                ON albums.band_id = bands.id
            WHERE favorite_songs.user_id = %s;
            ''',
            (user_id,)
        )

        favorite_songs = cursor.fetchall()

    return jsonify({
        'favorite_songs': favorite_songs
    })


# INPUT SEARCH QUERY
@app.route('/input-search')
def input_search():
    query = request.args.get('query', '')

    db = get_db()

    with db.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            '''
            SELECT id, name
            FROM bands
            WHERE name ILIKE %s;
            ''',
            ('%' + query + '%',)
        )

        bands = cursor.fetchall()

        cursor.execute(
            '''
            SELECT
                albums.id,
                albums.title AS album_name,
                bands.id AS band_id,
                bands.name AS band_name
            FROM albums
            JOIN bands
                ON bands.id = albums.band_id
            WHERE albums.title ILIKE %s;
            ''',
            ('%' + query + '%',)
        )

        albums = cursor.fetchall()

        cursor.execute(
            '''
            SELECT
                songs.id,
                songs.song_name,
                albums.id AS album_id,
                albums.title AS album_name,
                bands.id AS band_id,
                bands.name AS band_name
            FROM songs
            JOIN albums
                ON albums.id = songs.album_id
            JOIN bands
                ON bands.id = albums.band_id
            WHERE songs.song_name ILIKE %s;
            ''',
            ('%' + query + '%',)
        )

        songs = cursor.fetchall()

    return jsonify({
        'bands': bands,
        'albums': albums,
        'songs': songs
    })


if __name__ == '__main__':
    app.run(debug=True)