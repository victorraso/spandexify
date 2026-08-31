from flask import Flask, render_template, g, jsonify, request, url_for, session, redirect, make_response, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
from datetime import timedelta

import mysql.connector
import os

load_dotenv()

app = Flask(__name__)

# Flask Secret Key
app.secret_key = os.urandom(24)

# Database configuration (REPLACE WITH YOUR CREDENTIALS)
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': os.getenv('DB_PORT'),
    'ssl_ca': "ca.pem"
}

# Check if connection exists
def get_db():
    if not hasattr(g, 'mysql_db'):
        try:
            g.mysql_db = mysql.connector.connect(**DB_CONFIG) # Use config dictionary
        except mysql.connector.Error as err:
            print(f'Database connection error: {err}')
            return None  # Or raise the exception if you prefer
    return g.mysql_db

# Important: Close connection after each request
@app.teardown_appcontext 
def close_db(error):
    if hasattr(g, 'mysql_db'):
        g.mysql_db.close()


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
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')


# USER LOGIN
@app.route('/user-login', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        username = request.form['login-username']
        password = request.form['login-password']

        user_info = get_user_credentials(username)

        if user_info:
            user_id = user_info[0]
            username = user_info[1]
            hashed_pass = user_info[2]
            if check_password_hash(hashed_pass, password):
                session['user_logged_in'] = True
                session['user_id'] = user_id
                session['user_username'] = username
                return jsonify({'status': 'success', 'redirect_url': url_for('mainpage')})
            else:
                return jsonify({'error': 'Invalid Password'}), 400
        else:
            return jsonify({'error': 'Username Not Found'}), 400


def get_user_credentials(username):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT `id`, `username`, `password` FROM `users` WHERE `username` = %s', (username,))
    user = cursor.fetchone()
    cursor.close()
    db.close()
    return user


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
    cursor = db.cursor()

    cursor.execute(
        'SELECT `username`, `email` FROM `users` WHERE `username` = %s OR `email` = %s', (username, email)
    )
    is_registered = cursor.fetchone()

    if is_registered:
        if is_registered and is_registered[0] == username:
            return jsonify({'error': 'Username Already Exists'}), 400
        if is_registered and is_registered[1] == email:
            return jsonify({'error': 'Email Is Already In Use'}), 400

    try:
        cursor.execute(
            'INSERT INTO `users` (`first_name`, `last_name`, `username`, `email`, `password`) VALUES (%s, %s, %s, %s, %s)', (first_name, last_name, username, email, hashed_pass)
        )
        db.commit()
        return jsonify({'status': 'success', 'message': 'User Registered Successfully'}), 201
    
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    
    finally:
        cursor.close()
        db.close()


# USER LOGOUT
# Create a response and force a redirect to the login page
@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route("/user-logout")
def user_logout():
    session.clear()  # Remove all session data
    response = make_response(redirect(url_for('index')))
    return response


# BAND ALPHA LIST
@app.route('/alpha-list')
def alpha_list():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT 
                `bands`.`id`, 
                `bands`.`name`, 
                `bands`.`icon_img`, 
                ROUND(AVG(`band_ratings`.`rating`), 2) AS `rating`
            FROM `bands`
            LEFT JOIN `band_ratings` ON `bands`.`id` = `band_ratings`.`band_id`
            GROUP BY `bands`.`id`
            ORDER BY `bands`.`name`
            '''
        )
        bands = cursor.fetchall()

    finally:
        cursor.close()

    group_bands_per_alpha = {}
    for band in bands:
        first_letter = band['name'][0].upper()
        if first_letter not in group_bands_per_alpha:
            group_bands_per_alpha[first_letter] = []

        band_data = {
            'id': band['id'],
            'name': band['name'],
            'icon_img': band['icon_img'],
            'rating': band['rating']
        }

        group_bands_per_alpha[first_letter].append(band_data)

    return jsonify(group_bands_per_alpha)


# TOP FIVE FETCH
@app.route('/top-five/<band_name>')
def top_five(band_name):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT `songs`.*, 
                ROUND(AVG(`song_ratings`.`rating`), 2) AS avg_rating
            FROM `songs`
            JOIN `albums` ON `albums`.`id` = `songs`.`album_id`
            JOIN `bands` ON `bands`.`id` = `albums`.`band_id`
            LEFT JOIN `song_ratings` ON `song_ratings`.`song_id` = `songs`.`id`
            WHERE `bands`.`name` = %s
            GROUP BY `songs`.`id`
            ORDER BY 
                IFNULL(AVG(`song_ratings`.`rating`), 0 ) DESC, 
                `songs`.`song_name` ASC
            LIMIT 5
            ''', (band_name,)
        )
        top_songs = cursor.fetchall()

        if not top_songs:
            return jsonify({"error": "No songs found for this band"}), 404
        
        # convert song length into string in order to send with json
        for song in top_songs:
            # checks if song length is from the class/type timedelta
            if isinstance(song['song_length'], timedelta):
                minutes, seconds = divmod(song['song_length'].seconds, 60)
                song['song_length'] = f'{minutes:02}:{seconds:02}'
        
        return jsonify(top_songs)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()


# ALBUMS AND BAND DATA FETCH
@app.route('/albums-band-data/<band_name>')
def albums_band_data(band_name):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT 
                `bands`.`id` AS band_id, 
                `bands`.`name` AS band_name, 
                `bands`.`page_img`, 
                `albums`.`id` AS album_id, 
                `albums`.`title` AS album_title, 
                `albums`.`year_release` AS album_release, 
                `albums`.`album_img`, 
                `songs`.`id` AS song_id, 
                `songs`.`song_name`, 
                `songs`.`track_number`, 
                `songs`.`song_length`
            FROM `bands`
            JOIN `albums` ON `albums`.`band_id` = `bands`.`id`
            LEFT JOIN `songs` ON `songs`.`album_id` = `albums`.`id`
            WHERE `bands`.`name` = %s
            ''', (band_name,)
        )
        albums = cursor.fetchall()

    finally:
        cursor.close()

    band_data = {
        'band_id': None,
        'band_name': None,
        'page_img': None,
        'albums': {}
    }

    for album in albums:
        if isinstance(album['song_length'], timedelta):
            minutes, seconds = divmod(album['song_length'].seconds, 60)
            album['song_length'] = f'{minutes:02}:{seconds:02}'

        # Set band info only once
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
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT 
            `bands`.`id`,
            `bands`.`name`,
            `bands`.`logo_img`,
            `biographies`.`bio`
            FROM `bands`
            JOIN `biographies` ON `biographies`.`band_id` = `bands`.`id`
            WHERE `bands`.`name` = %s;
            ''', (band_name,)
        )
        band_info = cursor.fetchone()

        if not band_info:
            db.close()
            return jsonify({'error': 'Band Bio Not Found'}), 404
    
        cursor.execute(
            '''
            SELECT
            `musicians`.`name`,
            `musicians`.`instrument`
            FROM `band_members`
            JOIN `musicians` ON `musicians`.`id` = `band_members`.`musician_id`
            WHERE `band_members`.`band_id` = %s;
            ''', (band_info['id'],)
        )
        members = cursor.fetchall()

    finally:
        cursor.close()

    return jsonify({
        'band_id': band_info['id'],
        'band_name': band_info['name'],
        'band_logo': band_info['logo_img'],
        'bio': band_info['bio'],
        'members': [{**member, 'instrument': ',<br>'.join(member['instrument']) if isinstance(member['instrument'], set) else member['instrument']} for member in members]
    })


# FETCH PLAYLIST AND SONGS FOR USER PLAYLISTS LIST
@app.route('/fetch-full-playlists')
def fetch_full_playlists():
    
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT 
                `playlists`.`id` AS `playlist_id`,
                `playlists`.`playlist_name`,
                `songs`.`id` AS `song_id`, #Added song id
                `songs`.`song_name`,
                `bands`.`name` AS `band_name`
            FROM `playlists`
            LEFT JOIN `playlist_songs` ON `playlists`.`id` = `playlist_songs`.`playlist_id`
            LEFT JOIN `songs` ON `playlist_songs`.`song_id` = `songs`.`id`
            LEFT JOIN `albums` ON `songs`.`album_id` = `albums`.`id`
            LEFT JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `playlists`.`user_id` = %s;
            ''', (session['user_id'],)
        )
        playlists_with_songs = cursor.fetchall()

        playlists = {}
        for playlist in playlists_with_songs:
            playlist_id = playlist['playlist_id'] #Get the playlist_id
            playlist_name = playlist['playlist_name']
            song_name = playlist['song_name']
            band_name = playlist['band_name']
            song_id = playlist['song_id'] #get song id

            if playlist_name not in playlists:
                playlists[playlist_name] = {"playlist_id": playlist_id, "playlist_name": playlist_name, "songs": []} #add playlist id

            if song_name:
                playlists[playlist_name]["songs"].append({"song_name": song_name, "band_name": band_name, "song_id":song_id}) #add song id
            else:
                playlists[playlist_name]["songs"].append({"song_name": "Playlist is empty", "band_name": None, "song_id": None})

        playlists_data = list(playlists.values())

        return jsonify(playlists_data)

    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({"error": "An error occurred while fetching playlists."}), 500

    finally:
        cursor.close()


# CREATE PLAYLIST
@app.route('/create-playlist', methods=['POST'])
def create_playlist():
    db = get_db()
    cursor = db.cursor()

    data = request.get_json()
    playlist_name = data.get('playlist_name')

    try:
        cursor.execute(
            '''
            INSERT INTO `playlists`
            (playlist_name, user_id)
            VALUES
            (%s, %s)
            ''', (playlist_name, session['user_id'])
        )
        db.commit()
        return jsonify({'message': 'Playlist created successfully'})

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    
    finally:
        cursor.close()


# FETCH EXISTING PLAYLISTS NAMES
@app.route('/get-playlists')
def get_playlists():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT * FROM `playlists`
            WHERE `user_id` = %s;
            ''', (session['user_id'],)
        )
        playlists = cursor.fetchall()

    finally:
        cursor.close()

    return jsonify(playlists)


# DELETE PLAYLISTS
@app.route('/delete-playlists', methods=['POST'])
def delete_playlists():
    data = request.get_json()  # Get the data from the request (the playlist IDs)
    playlist_ids = data.get('ids', [])  # Extract the list of IDs

    if not playlist_ids:
        return jsonify({'error': 'No playlist selected'}), 400
    
    db = get_db()
    cursor = db.cursor()

    try:
        cursor.executemany(
            '''
            DELETE FROM `playlists`
            WHERE `id` = %s AND `user_id` = %s;
            ''', [(playlist_id, session['user_id']) for playlist_id in playlist_ids]
        )
        db.commit()
        return jsonify({'message': 'playlists delete with success'})
    
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


# ADD SONG TO PLAYLIST
@app.route('/add-song-to-playlist', methods=['POST'])
def add_song_to_playlist():
    data = request.get_json()
    playlist_id = data.get('playlist_id')
    song_name = data.get('song_name')
    band_name = data.get('band_name')

    if not all([playlist_id, song_name, band_name]):
        return jsonify({'error': 'Missing data'}), 400

    db = get_db()
    cursor = db.cursor()

    try:
        # Find the song_id
        cursor.execute(
            '''
            SELECT `songs`.`id`
            FROM `songs`
            JOIN `albums` ON `songs`.`album_id` = `albums`.`id`
            JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `songs`.`song_name` = %s AND `bands`.`name` = %s
            ''',
            (song_name, band_name)
        )
        song_result = cursor.fetchone()

        if not song_result:
            return jsonify({'error': 'Song not found'}), 404

        song_id = song_result[0]

        # Check if the song is already in the playlist
        cursor.execute(
            '''
            SELECT 1
            FROM `playlist_songs`
            WHERE `playlist_id` = %s AND `song_id` = %s
            ''',
            (playlist_id, song_id)
        )
        existing_song = cursor.fetchone()

        if existing_song:
            return jsonify({'message': 'Song already in playlist'})

        # Insert into playlist_songs (only if not already present)
        cursor.execute(
            '''
            INSERT INTO `playlist_songs` (`playlist_id`, `song_id`)
            VALUES (%s, %s)
            ''',
            (playlist_id, song_id)
        )
        db.commit()

        return jsonify({'message': 'Song added to playlist'})

    except Exception as e:
        print(f"Error adding song to playlist: {e}")
        db.rollback()
        return jsonify({'error': 'An error occurred'}), 500

    finally:
        cursor.close()


# REMOVE SONG FROM PLAYLIST
@app.route('/remove-song-from-playlist', methods=['POST'])
def remove_song_from_playlist():
    data = request.get_json()
    playlist_id = data['playlist_id']
    song_id = data['song_id']

    db = get_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            '''
            DELETE FROM `playlist_songs`
            WHERE `playlist_id` = %s
            AND
            `song_id` = %s
            ''', (playlist_id, song_id)
        )
        db.commit()
        return jsonify({'message': 'Song remove with success'}), 200
    
    except Exception as e:
        db.rollback()
        return jsonify({'error': 'Failed to remove song from playlist'}), 500
    
    finally:
        cursor.close()


# ADD SONG TO FAVORITES
@app.route('/add-song-to-favorites', methods=['POST'])
def add_song_to_favorites():
    data = request.get_json()
    song_id = data['song_id']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the song is already in favorites
        cursor.execute(
            'SELECT `id` FROM `favorite_songs` WHERE `user_id` = %s AND `song_id` = %s',
            (user_id, song_id)
        )
        existing_favorite = cursor.fetchone()

        if existing_favorite:
            # If the song is already a favorite, remove it
            cursor.execute(
                'DELETE FROM `favorite_songs` WHERE `user_id` = %s AND `song_id` = %s',
                (user_id, song_id)
            )
            db.commit()
            return jsonify({'message': 'Song removed from favorites'}), 200
        else:
            # If the song is not a favorite, add it
            cursor.execute(
                'INSERT INTO `favorite_songs` (user_id, song_id) VALUES (%s, %s)',
                (user_id, song_id)
            )
            db.commit()
            return jsonify({'message': 'Song added to favorites'}), 200

    except Exception as e:
        db.rollback()
        print(f"Error adding/removing song to favorites: {e}")
        return jsonify({'error': 'Failed to add/remove song to favorites'}), 500

    finally:
        cursor.close()


# GET ALL FAVORITE SONGS
@app.route('/get-all-favorite-songs')
def get_all_favorite_songs():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT
                `songs`.`id` AS song_id,
                `songs`.`song_name`,
                `bands`.`name` AS band_name,
                `albums`.`id` AS album_id
            FROM `favorite_songs`
            JOIN `songs` ON `favorite_songs`.`song_id` = `songs`.`id`
            JOIN `albums` ON `songs`.`album_id` = `albums`.`id`
            JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `favorite_songs`.`user_id` = %s;
            ''',
            (user_id,)
        )

        favorite_songs = cursor.fetchall()
        return jsonify({'favorite_songs': favorite_songs})

    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed to fetch favorite songs'}), 500

    finally:
        cursor.close()


# ADD ALBUM TO FAVORITES
@app.route('/add-album-to-favorites', methods=['POST'])
def add_album_to_favorites():
    data = request.get_json()
    album_id = data['album_id']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the album is already in favorites
        cursor.execute(
            'SELECT `id` FROM `favorite_albums` WHERE `user_id` = %s AND `album_id` = %s',
            (user_id, album_id)
        )
        existing_favorite = cursor.fetchone()

        if existing_favorite:
            # If the album is already a favorite, remove it
            cursor.execute(
                'DELETE FROM `favorite_albums` WHERE `user_id` = %s AND `album_id` = %s',
                (user_id, album_id)
            )
            db.commit()
            return jsonify({'message': 'Album removed from favorites'}), 200
        else:
            # If the album is not a favorite, add it
            cursor.execute(
                'INSERT INTO `favorite_albums` (user_id, album_id) VALUES (%s, %s)',
                (user_id, album_id)
            )
            db.commit()
            return jsonify({'message': 'Album added to favorites'}), 200

    except Exception as e:
        db.rollback()
        print(f"Error adding/removing album to favorites: {e}")
        return jsonify({'error': 'Failed to add/remove album to favorites'}), 500

    finally:
        cursor.close()


# GET ALL USER FAVORITE ALBUMS
@app.route('/get-all-favorite-albums')
def get_all_favorite_albums():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT
                `bands`.`name` AS band_name,
                `album_id`,
                `albums`.`title` AS album_name
            FROM `favorite_albums`
            JOIN `albums` ON `albums`.`id` = `favorite_albums`.`album_id`
            JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `favorite_albums`.`user_id` = %s;
            ''',
            (user_id,)
        )

        favorite_albums = cursor.fetchall()
        return jsonify({'favorite_albums': favorite_albums})

    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed to fetch favorite albums'}), 500

    finally:
        cursor.close()


# ADD BAND TO FAVORITES
@app.route('/add-band-to-favorites', methods=['POST'])
def add_band_to_favorites():
    data = request.get_json()
    band_id = data['band_id']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the band is already in favorites
        cursor.execute(
            'SELECT `id` FROM `favorite_bands` WHERE `user_id` = %s AND `band_id` = %s',
            (user_id, band_id)
        )
        existing_favorite = cursor.fetchone()

        if existing_favorite:
            # If the band is already a favorite, remove it
            cursor.execute(
                'DELETE FROM `favorite_bands` WHERE `user_id` = %s AND `band_id` = %s',
                (user_id, band_id)
            )
            db.commit()
            return jsonify({'message': 'Band removed from favorites'}), 200
        else:
            # If the band is not a favorite, add it
            cursor.execute(
                'INSERT INTO `favorite_bands` (user_id, band_id) VALUES (%s, %s)',
                (user_id, band_id)
            )
            db.commit()
            return jsonify({'message': 'Band added to favorites'}), 200

    except Exception as e:
        db.rollback()
        print(f"Error adding/removing band to favorites: {e}")
        return jsonify({'error': 'Failed to add/remove band to favorites'}), 500

    finally:
        cursor.close()


# FETCH ALL FAVORITES BANDS
@app.route('/get-all-favorite-bands')
def get_all_favorite_bands():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT
                `bands`.`name` AS band_name,
                `band_id`
            FROM `favorite_bands`
            JOIN `bands` ON `favorite_bands`.`band_id` = `bands`.`id`
            WHERE `favorite_bands`.`user_id` = %s;
            ''',
            (user_id,)
        )

        favorite_bands = cursor.fetchall()
        return jsonify({'favorite_bands': favorite_bands})

    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed to fetch favorite bands'}), 500

    finally:
        cursor.close()


# INPUT SEARCH QUERY
@app.route('/input-search')
def input_search():
    query = request.args.get('query', '') # '' ensures the query is never none

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # fetch bands
        cursor.execute(
            '''
            SELECT
                `id`,
                `name`
            FROM `bands`
            WHERE `name` LIKE %s
               OR SOUNDEX(`name`) = SOUNDEX(%s);
            ''', ('%' + query + '%', query)
        )
        bands = cursor.fetchall()

        # fetch albums
        cursor.execute(
            '''
            SELECT
                `albums`.`id`,
                `albums`.`title` AS album_name,
                `bands`.`id` AS band_id,
                `bands`.`name` AS band_name
            FROM `albums`
            JOIN `bands` ON `bands`.`id` = `albums`.`band_id`
            WHERE `title` LIKE %s
               OR SOUNDEX(`title`) = SOUNDEX(%s);
            ''', ('%' + query + '%', query)
        )
        albums = cursor.fetchall()

        # fetch songs
        cursor.execute(
            '''
            SELECT
                `songs`.`id`,
                `songs`.`song_name`,
                `albums`.`id` AS album_id,
                `albums`.`title` AS album_name,
                `bands`.`id` AS band_id,
                `bands`.`name` AS band_name
            FROM `songs`
            JOIN `albums` ON `albums`.`id` = `songs`.`album_id`
            JOIN `bands` ON `bands`.`id` = `albums`.`band_id`
            WHERE `song_name` LIKE %s
               OR SOUNDEX(`song_name`) = SOUNDEX(%s);
            ''', ('%' + query + '%', query)
        )
        songs = cursor.fetchall()

        return jsonify({'bands': bands, 'albums': albums, 'songs': songs})

    except Exception as e:
        return jsonify({'error': 'Failed to fetch info for input search query'}), 500

    finally:
        cursor.close()
    

# ADD BAND RATING
@app.route('/add-band-rating', methods=['POST'])
def add_band_rating():
    data = request.get_json()
    band_id = data['band_id']
    rating_value = data['rating_value']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the band is already rated
        cursor.execute(
            '''
            SELECT `band_id` FROM `band_ratings` WHERE `user_id` = %s AND `band_id` = %s;
            ''',
            (user_id, band_id)
        )
        band_is_rated = cursor.fetchone()

        if band_is_rated:
            # If the band is already rated change rate to new value
            cursor.execute(
                '''
                UPDATE `band_ratings`
                SET `rating` = %s
                WHERE `user_id` = %s
                AND `band_id` = %s;
                ''',
                (rating_value, user_id, band_id)
            )
            db.commit()
            return jsonify({'message': 'Band rating updated'}), 200
        else:
            # If the band is not rated
            cursor.execute(
                '''
                INSERT INTO `band_ratings` (user_id, band_id, rating) VALUES (%s, %s, %s);
                ''',
                (user_id, band_id, rating_value)
            )
            db.commit()
            return jsonify({'message': 'Rating added to the band'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({'error': 'Failed to add/update band rating'}), 500

    finally:
        cursor.close()


# FETCH ALL USER BAND RATINGS
@app.route('/get-all-band-ratings')
def get_all_band_ratings():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT
                *
            FROM `band_ratings`
            WHERE `user_id` = %s;
            ''',
            (user_id,)
        )

        band_ratings = cursor.fetchall()
        return jsonify({'band_ratings': band_ratings})

    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed fetching band ratings'}), 500

    finally:
        cursor.close()


# ADD SONG RATING
@app.route('/add-song-rating', methods=['POST'])
def add_song_rating():
    data = request.get_json()
    song_id = data['song_id']
    rating_value = data['song_rating']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the song is already rated
        cursor.execute(
            '''
            SELECT `song_id` FROM `song_ratings` WHERE `user_id` = %s AND `song_id` = %s;
            ''',
            (user_id, song_id)
        )
        song_is_rated = cursor.fetchone()

        if song_is_rated:
            # If the song is already rated change rate to new value
            cursor.execute(
                '''
                UPDATE `song_ratings`
                SET `rating` = %s
                WHERE `user_id` = %s
                AND `song_id` = %s;
                ''',
                (rating_value, user_id, song_id)
            )
            db.commit()
            return jsonify({'message': 'Song rating updated'}), 200
        else:
            # If the song is not rated
            cursor.execute(
                '''
                INSERT INTO `song_ratings` (user_id, song_id, rating) VALUES (%s, %s, %s);
                ''',
                (user_id, song_id, rating_value)
            )
            db.commit()
            return jsonify({'message': 'Rating added to the song'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({'error': 'Failed to add/update song rating'}), 500

    finally:
        cursor.close()


# FETCH ALL USER SONG RATINGS
@app.route('/get-all-song-ratings')
def get_all_song_ratings():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT
                *
            FROM `song_ratings`
            WHERE `user_id` = %s;
            ''',
            (user_id,)
        )

        song_ratings = cursor.fetchall()
        return jsonify({'song_ratings': song_ratings})

    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed fetching song ratings'}), 500

    finally:
        cursor.close()


# ADD ALBUM RATING
@app.route('/add-album-rating', methods=['POST'])
def add_album_rating():
    data = request.get_json()
    album_id = data['album_id']
    rating_value = data['album_rating']
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the album is already rated
        cursor.execute(
            '''
            SELECT `album_id` FROM `album_ratings` WHERE `user_id` = %s AND `album_id` = %s;
            ''',
            (user_id, album_id)
        )
        album_is_rated = cursor.fetchone()

        if album_is_rated:
            # If the album is already rated change rate to new value
            cursor.execute(
                '''
                UPDATE `album_ratings`
                SET `rating` = %s
                WHERE `user_id` = %s
                AND `album_id` = %s;
                ''',
                (rating_value, user_id, album_id)
            )
            db.commit()
            return jsonify({'message': 'Album rating updated'}), 200
        else:
            # If the album is not rated
            cursor.execute(
                '''
                INSERT INTO `album_ratings` (user_id, album_id, rating) VALUES (%s, %s, %s);
                ''',
                (user_id, album_id, rating_value)
            )
            db.commit()
            return jsonify({'message': 'Rating added to the album'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({'error': 'Failed to add/update album rating'}), 500

    finally:
        cursor.close()


# FETCH ALL USER ALBUM RATINGS
@app.route('/get-all-album-ratings')
def get_all_album_ratings():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            '''
            SELECT
                *
            FROM `album_ratings`
            WHERE `user_id` = %s;
            ''',
            (user_id,)
        )

        album_ratings = cursor.fetchall()
        return jsonify({'album_ratings': album_ratings})

    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed fetching album ratings'}), 500

    finally:
        cursor.close()


# MAIN
if __name__ == '__main__':
    app.run(debug=True)