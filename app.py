import os
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask, g, jsonify, make_response, redirect, render_template, request, send_from_directory, session, url_for
from sqlalchemy import create_engine, text
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)

# Flask Secret Key
app.secret_key = os.urandom(24)

# SQLAlchemy Database URL using mysql-connector and Aiven SSL mode requirement
DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(DATABASE_URL)


# Database connection scope helper
def get_db():
  if not hasattr(g, 'db_conn'):
    try:
      g.db_conn = engine.connect()
    except Exception as err:
      print(f'Database connection error: {err}')
      return None
  return g.db_conn


# Close connection after each request
@app.teardown_appcontext
def close_db(error):
  db_conn = g.pop('db_conn', None)
  if db_conn is not None:
    db_conn.close()


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
  conn = get_db()
  result = conn.execute(
      text('SELECT `id`, `username`, `password` FROM `users` WHERE `username` = :uname'),
      {'uname': username},
  ).fetchone()
  return result


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

  conn = get_db()

  is_registered = conn.execute(
      text('SELECT `username`, `email` FROM `users` WHERE `username` = :uname OR `email` = :umail'),
      {'uname': username, 'umail': email},
  ).fetchone()

  if is_registered:
    if is_registered[0] == username:
      return jsonify({'error': 'Username Already Exists'}), 400
    if is_registered[1] == email:
      return jsonify({'error': 'Email Is Already In Use'}), 400

  try:
    conn.execute(
        text(
            'INSERT INTO `users` (`first_name`, `last_name`, `username`, `email`, `password`) VALUES'
            ' (:fname, :lname, :uname, :umail, :upass)'
        ),
        {
            'fname': first_name,
            'lname': last_name,
            'uname': username,
            'umail': email,
            'upass': hashed_pass,
        },
    )
    conn.commit()
    return jsonify({'status': 'success', 'message': 'User Registered Successfully'}), 201

  except Exception as e:
    conn.rollback()
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
  conn = get_db()

  try:
    result = conn.execute(
        text(
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
    )
    bands = [row._asdict() for row in result]

  except Exception:
    bands = []

  group_bands_per_alpha = {}
  for band in bands:
    first_letter = band['name'][0].upper()
    if first_letter not in group_bands_per_alpha:
      group_bands_per_alpha[first_letter] = []

    band_data = {
        'id': band['id'],
        'name': band['name'],
        'icon_img': band['icon_img'],
        'rating': band['rating'],
    }

    group_bands_per_alpha[first_letter].append(band_data)

  return jsonify(group_bands_per_alpha)


# TOP FIVE FETCH
@app.route('/top-five/<band_name>')
def top_five(band_name):
  conn = get_db()

  try:
    result = conn.execute(
        text(
            '''
            SELECT `songs`.*, 
                ROUND(AVG(`song_ratings`.`rating`), 2) AS avg_rating
            FROM `songs`
            JOIN `albums` ON `albums`.`id` = `songs`.`album_id`
            JOIN `bands` ON `bands`.`id` = `albums`.`band_id`
            LEFT JOIN `song_ratings` ON `song_ratings`.`song_id` = `songs`.`id`
            WHERE `bands`.`name` = :bname
            GROUP BY `songs`.`id`
            ORDER BY 
                IFNULL(AVG(`song_ratings`.`rating`), 0 ) DESC, 
                `songs`.`song_name` ASC
            LIMIT 5
            '''
        ),
        {'bname': band_name},
    )
    top_songs = [dict(row._mapping) for row in result]

    if not top_songs:
      return jsonify({'error': 'No songs found for this band'}), 404

    for song in top_songs:
      if isinstance(song.get('song_length'), timedelta):
        minutes, seconds = divmod(song['song_length'].seconds, 60)
        song['song_length'] = f'{minutes:02}:{seconds:02}'

    return jsonify(top_songs)

  except Exception as e:
    return jsonify({'error': str(e)}), 500


# ALBUMS AND BAND DATA FETCH
@app.route('/albums-band-data/<band_name>')
def albums_band_data(band_name):
  conn = get_db()

  try:
    result = conn.execute(
        text(
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
            WHERE `bands`.`name` = :bname
            '''
        ),
        {'bname': band_name},
    )
    albums = [dict(row._mapping) for row in result]
  except Exception:
    albums = []

  band_data = {'band_id': None, 'band_name': None, 'page_img': None, 'albums': {}}

  for album in albums:
    if isinstance(album.get('song_length'), timedelta):
      minutes, seconds = divmod(album['song_length'].seconds, 60)
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
          'songs': [],
      }

    if album['song_id']:
      band_data['albums'][album_id]['songs'].append({
          'song_id': album['song_id'],
          'song_name': album['song_name'],
          'track_number': album['track_number'],
          'song_length': album['song_length'],
      })

  return jsonify(band_data)


# BIO FETCH AND BAND MEMBERS
@app.route('/bio-data/<band_name>')
def bio_data(band_name):
  conn = get_db()

  try:
    band_info_res = conn.execute(
        text(
            '''
            SELECT 
            `bands`.`id`,
            `bands`.`name`,
            `bands`.`logo_img`,
            `biographies`.`bio`
            FROM `bands`
            JOIN `biographies` ON `biographies`.`band_id` = `bands`.`id`
            WHERE `bands`.`name` = :bname;
            '''
        ),
        {'bname': band_name},
    ).fetchone()

    if not band_info_res:
      return jsonify({'error': 'Band Bio Not Found'}), 404

    band_info = dict(band_info_res._mapping)

    members_res = conn.execute(
        text(
            '''
            SELECT
            `musicians`.`name`,
            `musicians`.`instrument`
            FROM `band_members`
            JOIN `musicians` ON `musicians`.`id` = `band_members`.`musician_id`
            WHERE `band_members`.`band_id` = :bid;
            '''
        ),
        {'bid': band_info['id']},
    )
    members = [dict(row._mapping) for row in members_res]

  except Exception as e:
    return jsonify({'error': str(e)}), 500

  return jsonify({
      'band_id': band_info['id'],
      'band_name': band_info['name'],
      'band_logo': band_info['logo_img'],
      'bio': band_info['bio'],
      'members': [{**m, 'instrument': ',<br>'.join(m['instrument']) if isinstance(m['instrument'], set) else m['instrument']} for m in members],
  })


# FETCH PLAYLIST AND SONGS
@app.route('/fetch-full-playlists')
def fetch_full_playlists():
  conn = get_db()

  try:
    result = conn.execute(
        text(
            '''
            SELECT 
                `playlists`.`id` AS `playlist_id`,
                `playlists`.`playlist_name`,
                `songs`.`id` AS `song_id`,
                `songs`.`song_name`,
                `bands`.`name` AS `band_name`
            FROM `playlists`
            LEFT JOIN `playlist_songs` ON `playlists`.`id` = `playlist_songs`.`playlist_id`
            LEFT JOIN `songs` ON `playlist_songs`.`song_id` = `songs`.`id`
            LEFT JOIN `albums` ON `songs`.`album_id` = `albums`.`id`
            LEFT JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `playlists`.`user_id` = :uid;
            '''
        ),
        {'uid': session['user_id']},
    )
    playlists_with_songs = [dict(row._mapping) for row in result]

    playlists = {}
    for playlist in playlists_with_songs:
      playlist_id = playlist['playlist_id']
      playlist_name = playlist['playlist_name']
      song_name = playlist['song_name']
      band_name = playlist['band_name']
      song_id = playlist['song_id']

      if playlist_name not in playlists:
        playlists[playlist_name] = {'playlist_id': playlist_id, 'playlist_name': playlist_name, 'songs': []}

      if song_name:
        playlists[playlist_name]['songs'].append({'song_name': song_name, 'band_name': band_name, 'song_id': song_id})
      else:
        playlists[playlist_name]['songs'].append({'song_name': 'Playlist is empty', 'band_name': None, 'song_id': None})

    return jsonify(list(playlists.values()))

  except Exception as e:
    return jsonify({'error': 'An error occurred while fetching playlists.'}), 500


# CREATE PLAYLIST
@app.route('/create-playlist', methods=['POST'])
def create_playlist():
  conn = get_db()
  data = request.get_json()
  playlist_name = data.get('playlist_name')

  try:
    conn.execute(
        text('INSERT INTO `playlists` (playlist_name, user_id) VALUES (:pname, :uid)'),
        {'pname': playlist_name, 'uid': session['user_id']},
    )
    conn.commit()
    return jsonify({'message': 'Playlist created successfully'})

  except Exception as e:
    conn.rollback()
    return jsonify({'error': str(e)}), 500


# FETCH EXISTING PLAYLISTS NAMES
@app.route('/get-playlists')
def get_playlists():
  conn = get_db()

  try:
    result = conn.execute(
        text('SELECT * FROM `playlists` WHERE `user_id` = :uid;'),
        {'uid': session['user_id']},
    )
    playlists = [dict(row._mapping) for row in result]
    return jsonify(playlists)
  except Exception as e:
    return jsonify({'error': str(e)}), 500


# DELETE PLAYLISTS
@app.route('/delete-playlists', methods=['POST'])
def delete_playlists():
  data = request.get_json()
  playlist_ids = data.get('ids', [])

  if not playlist_ids:
    return jsonify({'error': 'No playlist selected'}), 400

  conn = get_db()

  try:
    for pid in playlist_ids:
      conn.execute(
          text('DELETE FROM `playlists` WHERE `id` = :pid AND `user_id` = :uid;'),
          {'pid': pid, 'uid': session['user_id']},
      )
    conn.commit()
    return jsonify({'message': 'playlists delete with success'})

  except Exception as e:
    conn.rollback()
    return jsonify({'error': str(e)}), 500


# ADD SONG TO PLAYLIST
@app.route('/add-song-to-playlist', methods=['POST'])
def add_song_to_playlist():
  data = request.get_json()
  playlist_id = data.get('playlist_id')
  song_name = data.get('song_name')
  band_name = data.get('band_name')

  if not all([playlist_id, song_name, band_name]):
    return jsonify({'error': 'Missing data'}), 400

  conn = get_db()

  try:
    song_result = conn.execute(
        text(
            '''
            SELECT `songs`.`id`
            FROM `songs`
            JOIN `albums` ON `songs`.`album_id` = `albums`.`id`
            JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `songs`.`song_name` = :sname AND `bands`.`name` = :bname
            '''
        ),
        {'sname': song_name, 'bname': band_name},
    ).fetchone()

    if not song_result:
      return jsonify({'error': 'Song not found'}), 404

    song_id = song_result[0]

    existing_song = conn.execute(
        text('SELECT 1 FROM `playlist_songs` WHERE `playlist_id` = :pid AND `song_id` = :sid'),
        {'pid': playlist_id, 'sid': song_id},
    ).fetchone()

    if existing_song:
      return jsonify({'message': 'Song already in playlist'})

    conn.execute(
        text('INSERT INTO `playlist_songs` (`playlist_id`, `song_id`) VALUES (:pid, :sid)'),
        {'pid': playlist_id, 'sid': song_id},
    )
    conn.commit()

    return jsonify({'message': 'Song added to playlist'})

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'An error occurred'}), 500


# REMOVE SONG FROM PLAYLIST
@app.route('/remove-song-from-playlist', methods=['POST'])
def remove_song_from_playlist():
  data = request.get_json()
  playlist_id = data['playlist_id']
  song_id = data['song_id']

  conn = get_db()

  try:
    conn.execute(
        text('DELETE FROM `playlist_songs` WHERE `playlist_id` = :pid AND `song_id` = :sid'),
        {'pid': playlist_id, 'sid': song_id},
    )
    conn.commit()
    return jsonify({'message': 'Song remove with success'}), 200

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'Failed to remove song from playlist'}), 500


# ADD SONG TO FAVORITES
@app.route('/add-song-to-favorites', methods=['POST'])
def add_song_to_favorites():
  data = request.get_json()
  song_id = data['song_id']
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'User not authenticated'}), 401

  conn = get_db()

  try:
    existing_favorite = conn.execute(
        text('SELECT `id` FROM `favorite_songs` WHERE `user_id` = :uid AND `song_id` = :sid'),
        {'uid': user_id, 'sid': song_id},
    ).fetchone()

    if existing_favorite:
      conn.execute(
          text('DELETE FROM `favorite_songs` WHERE `user_id` = :uid AND `song_id` = :sid'),
          {'uid': user_id, 'sid': song_id},
      )
      conn.commit()
      return jsonify({'message': 'Song removed from favorites'}), 200
    else:
      conn.execute(
          text('INSERT INTO `favorite_songs` (user_id, song_id) VALUES (:uid, :sid)'),
          {'uid': user_id, 'sid': song_id},
      )
      conn.commit()
      return jsonify({'message': 'Song added to favorites'}), 200

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'Failed to add/remove song to favorites'}), 500


# GET ALL FAVORITE SONGS
@app.route('/get-all-favorite-songs')
def get_all_favorite_songs():
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'Unauthorized'}), 401

  conn = get_db()

  try:
    result = conn.execute(
        text(
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
            WHERE `favorite_songs`.`user_id` = :uid;
            '''
        ),
        {'uid': user_id},
    )

    favorite_songs = [dict(row._mapping) for row in result]
    return jsonify({'favorite_songs': favorite_songs})

  except Exception as e:
    return jsonify({'error': 'Failed to fetch favorite songs'}), 500


# ADD ALBUM TO FAVORITES
@app.route('/add-album-to-favorites', methods=['POST'])
def add_album_to_favorites():
  data = request.get_json()
  album_id = data['album_id']
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'User not authenticated'}), 401

  conn = get_db()

  try:
    existing_favorite = conn.execute(
        text('SELECT `id` FROM `favorite_albums` WHERE `user_id` = :uid AND `album_id` = :aid'),
        {'uid': user_id, 'aid': album_id},
    ).fetchone()

    if existing_favorite:
      conn.execute(
          text('DELETE FROM `favorite_albums` WHERE `user_id` = :uid AND `album_id` = :aid'),
          {'uid': user_id, 'aid': album_id},
      )
      conn.commit()
      return jsonify({'message': 'Album removed from favorites'}), 200
    else:
      conn.execute(
          text('INSERT INTO `favorite_albums` (user_id, album_id) VALUES (:uid, :aid)'),
          {'uid': user_id, 'aid': album_id},
      )
      conn.commit()
      return jsonify({'message': 'Album added to favorites'}), 200

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'Failed to add/remove album to favorites'}), 500


# GET ALL USER FAVORITE ALBUMS
@app.route('/get-all-favorite-albums')
def get_all_favorite_albums():
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'Unauthorized'}), 401

  conn = get_db()

  try:
    result = conn.execute(
        text(
            '''
            SELECT
                `bands`.`name` AS band_name,
                `album_id`,
                `albums`.`title` AS album_name
            FROM `favorite_albums`
            JOIN `albums` ON `albums`.`id` = `favorite_albums`.`album_id`
            JOIN `bands` ON `albums`.`band_id` = `bands`.`id`
            WHERE `favorite_albums`.`user_id` = :uid;
            '''
        ),
        {'uid': user_id},
    )

    favorite_albums = [dict(row._mapping) for row in result]
    return jsonify({'favorite_albums': favorite_albums})

  except Exception as e:
    return jsonify({'error': 'Failed to fetch favorite albums'}), 500


# ADD BAND TO FAVORITES
@app.route('/add-band-to-favorites', methods=['POST'])
def add_band_to_favorites():
  data = request.get_json()
  band_id = data['band_id']
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'User not authenticated'}), 401

  conn = get_db()

  try:
    existing_favorite = conn.execute(
        text('SELECT `id` FROM `favorite_bands` WHERE `user_id` = :uid AND `band_id` = :bid'),
        {'uid': user_id, 'bid': band_id},
    ).fetchone()

    if existing_favorite:
      conn.execute(
          text('DELETE FROM `favorite_bands` WHERE `user_id` = :uid AND `band_id` = :bid'),
          {'uid': user_id, 'bid': band_id},
      )
      conn.commit()
      return jsonify({'message': 'Band removed from favorites'}), 200
    else:
      conn.execute(
          text('INSERT INTO `favorite_bands` (user_id, band_id) VALUES (:uid, :bid)'),
          {'uid': user_id, 'bid': band_id},
      )
      conn.commit()
      return jsonify({'message': 'Band added to favorites'}), 200

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'Failed to add/remove band to favorites'}), 500


# FETCH ALL FAVORITES BANDS
@app.route('/get-all-favorite-bands')
def get_all_favorite_bands():
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'Unauthorized'}), 401

  conn = get_db()

  try:
    result = conn.execute(
        text(
            '''
            SELECT
                `bands`.`name` AS band_name,
                `band_id`
            FROM `favorite_bands`
            JOIN `bands` ON `favorite_bands`.`band_id` = `bands`.`id`
            WHERE `favorite_bands`.`user_id` = :uid;
            '''
        ),
        {'uid': user_id},
    )

    favorite_bands = [dict(row._mapping) for row in result]
    return jsonify({'favorite_bands': favorite_bands})

  except Exception as e:
    return jsonify({'error': 'Failed to fetch favorite bands'}), 500


# INPUT SEARCH QUERY
@app.route('/input-search')
def input_search():
  query = request.args.get('query', '')
  conn = get_db()

  try:
    bands_res = conn.execute(
        text(
            '''
            SELECT `id`, `name` FROM `bands`
            WHERE `name` LIKE :q OR SOUNDEX(`name`) = SOUNDEX(:query_val);
            '''
        ),
        {'q': '%' + query + '%', 'query_val': query},
    )
    bands = [dict(row._mapping) for row in bands_res]

    albums_res = conn.execute(
        text(
            '''
            SELECT `albums`.`id`, `albums`.`title` AS album_name, `bands`.`id` AS band_id, `bands`.`name` AS band_name
            FROM `albums` JOIN `bands` ON `bands`.`id` = `albums`.`band_id`
            WHERE `title` LIKE :q OR SOUNDEX(`title`) = SOUNDEX(:query_val);
            '''
        ),
        {'q': '%' + query + '%', 'query_val': query},
    )
    albums = [dict(row._mapping) for row in albums_res]

    songs_res = conn.execute(
        text(
            '''
            SELECT `songs`.`id`, `songs`.`song_name`, `albums`.`id` AS album_id, `albums`.`title` AS album_name, `bands`.`id` AS band_id, `bands`.`name` AS band_name
            FROM `songs` JOIN `albums` ON `albums`.`id` = `songs`.`album_id` JOIN `bands` ON `bands`.`id` = `albums`.`band_id`
            WHERE `song_name` LIKE :q OR SOUNDEX(`song_name`) = SOUNDEX(:query_val);
            '''
        ),
        {'q': '%' + query + '%', 'query_val': query},
    )
    songs = [dict(row._mapping) for row in songs_res]

    return jsonify({'bands': bands, 'albums': albums, 'songs': songs})

  except Exception as e:
    return jsonify({'error': 'Failed to fetch info for input search query'}), 500


# ADD BAND RATING
@app.route('/add-band-rating', methods=['POST'])
def add_band_rating():
  data = request.get_json()
  band_id = data['band_id']
  rating_value = data['rating_value']
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'User not authenticated'}), 401

  conn = get_db()

  try:
    band_is_rated = conn.execute(
        text('SELECT `band_id` FROM `band_ratings` WHERE `user_id` = :uid AND `band_id` = :bid;'),
        {'uid': user_id, 'bid': band_id},
    ).fetchone()

    if band_is_rated:
      conn.execute(
          text('UPDATE `band_ratings` SET `rating` = :rval WHERE `user_id` = :uid AND `band_id` = :bid;'),
          {'rval': rating_value, 'uid': user_id, 'bid': band_id},
      )
      conn.commit()
      return jsonify({'message': 'Band rating updated'}), 200
    else:
      conn.execute(
          text('INSERT INTO `band_ratings` (user_id, band_id, rating) VALUES (:uid, :bid, :rval);'),
          {'uid': user_id, 'bid': band_id, 'rval': rating_value},
      )
      conn.commit()
      return jsonify({'message': 'Rating added to the band'}), 200

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'Failed to add/update band rating'}), 500


# FETCH ALL USER BAND RATINGS
@app.route('/get-all-band-ratings')
def get_all_band_ratings():
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'Unauthorized'}), 401

  conn = get_db()

  try:
    result = conn.execute(
        text('SELECT * FROM `band_ratings` WHERE `user_id` = :uid;'),
        {'uid': user_id},
    )
    band_ratings = [dict(row._mapping) for row in result]
    return jsonify({'band_ratings': band_ratings})

  except Exception as e:
    return jsonify({'error': 'Failed fetching band ratings'}), 500


# ADD SONG RATING
@app.route('/add-song-rating', methods=['POST'])
def add_song_rating():
  data = request.get_json()
  song_id = data['song_id']
  rating_value = data['song_rating']
  user_id = session.get('user_id')

  if not user_id:
    return jsonify({'error': 'User not authenticated'}), 401

  conn = get_db()

  try:
    song_is_rated = conn.execute(
        text('SELECT `song_id` FROM `song_ratings` WHERE `user_id` = :uid AND `song_id` = :sid;'),
        {'uid': user_id, 'sid': song_id},
    ).fetchone()

    if song_is_rated:
      conn.execute(
          text('UPDATE `song_ratings` SET `rating` = :rval WHERE `user_id` = :uid AND `song_id` = :sid;'),
          {'rval': rating_value, 'uid': user_id, 'sid': song_id},
      )
      conn.commit()
      return jsonify({'message': 'Song rating updated'}), 200
    else:
      conn.execute(
          text('INSERT INTO `song_ratings` (user_id, song_id, rating) VALUES (:uid, :sid, :rval);'),
          {'uid': user_id, 'sid': song_id, 'rval': rating_value},
      )
      conn.commit()
      return jsonify({'message': 'Song rating added'}), 200

  except Exception as e:
    conn.rollback()
    return jsonify({'error': 'Failed to add/update song rating'}), 500


if __name__ == '__main__':
  app.run(debug=True)