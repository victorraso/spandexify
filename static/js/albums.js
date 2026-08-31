let userFavoriteAlbumIds = [];

function fetchAndStoreFavoriteAlbumIds() {
    fetch('/get-all-favorite-albums')
        .then(response => response.json())
        .then(data => {
            if (data.favorite_albums) {
                // Extract only the album_ids from the response
                userFavoriteAlbumIds = data.favorite_albums.map(album => album.album_id);
                populateFavoriteAlbumsList(data.favorite_albums);
                console.log("User favorite albums IDs stored:", userFavoriteAlbumIds);
            } else {
                console.error("Error fetching favorite albums:", data.error);
            }
        })
        .catch(error => {
            console.error("Network error fetching favorite albums:", error);
        });
}


// albumratings recall and store
let userAlbumRatings = [];

function fetchAndStoreAlbumRatings() {
    fetch('/get-all-album-ratings')
        .then(response => response.json())
        .then(data => {
            if (data.album_ratings) {
                userAlbumRatings = data.album_ratings;
                
            } else {
                console.error("Error fetching album ratings:", data.error);
            }
        })
        .catch(error => {
            console.error("Network error fetching album ratings:", error);
        });
}


function kickstartAlbums(bandName) {

    fetchAndStoreAlbumRatings();

    fetch(`/albums-band-data/${bandName}`)
        .then(response => response.json())
        .then(data => {
            const albumsPageContainer = document.getElementById('albums-page-container');
            albumsPageContainer.dataset.bandName = data.band_name;

            const albumsPageHeader = document.createElement('div');
            albumsPageHeader.classList.add('albums-page-header');
            albumsPageContainer.appendChild(albumsPageHeader);

            const albumsPagePic = document.createElement('div');
            albumsPagePic.classList.add('albums-page-header-pic');
            albumsPageHeader.appendChild(albumsPagePic);

            const pageImg = document.createElement('img');
            pageImg.src = '../static/images/page%20imgs/' + data.page_img;
            pageImg.alt = data.band_name;
            albumsPagePic.appendChild(pageImg);

            const albumsPageBandName = document.createElement('span');
            albumsPageBandName.classList.add('albums-page-band-name');
            albumsPageBandName.textContent = data.band_name;
            albumsPageHeader.appendChild(albumsPageBandName);

            const returnButton = document.createElement('div');
            returnButton.classList.add('return-button');
            returnButton.id = 'return-albums';
            albumsPageHeader.appendChild(returnButton);

            const returnBtnCircle = document.createElement('div');
            returnBtnCircle.classList.add('return-button-circle');
            returnButton.appendChild(returnBtnCircle);

            const returnBtnArrow = document.createElement('div');
            returnBtnArrow.classList.add('return-button-arrow');
            returnBtnCircle.appendChild(returnBtnArrow);

            const albumsPageContent = document.createElement('div');
            albumsPageContent.classList.add('albums-page-content');
            albumsPageContainer.appendChild(albumsPageContent);

            const albumsTopFiveContainer = document.createElement('div');
            albumsTopFiveContainer.classList.add('albums-page-top-five-container');
            albumsPageContent.appendChild(albumsTopFiveContainer);

            // call function to create top five
            fetchAndDisplayTopFiveAlbums(bandName, albumsTopFiveContainer);

            const horizontalLine = document.createElement('hr');
            horizontalLine.classList.add('horizontal-line');
            albumsPageContent.appendChild(horizontalLine);

            const albumsPageAlbums = document.createElement('div');
            albumsPageAlbums.classList.add('albums-page-albums');
            albumsPageContent.appendChild(albumsPageAlbums);

            renderAlbums(data.albums, albumsPageAlbums, bandName);

        })
        .catch(error => console.error('Error fetching albums data:', error));

}

// fetch albums page top five 
function fetchAndDisplayTopFiveAlbums(bandName, body) {
    fetch(`/top-five/${bandName}`)
        .then(response => response.json())
        .then(data => {
            body.innerHTML = '';

            const topFiveTitle = document.createElement('span');
            topFiveTitle.classList.add('top-five-title');
            topFiveTitle.textContent = 'Top 5 Songs';
            body.appendChild(topFiveTitle);

            const topFiveList = document.createElement('ul');
            topFiveList.classList.add('top-five-list');
            body.appendChild(topFiveList);

            data.forEach(song => {
                const topFiveItem = document.createElement('li');
                topFiveItem.classList.add('top-five-item');
                topFiveItem.dataset.songId = song.id;
                topFiveList.appendChild(topFiveItem);

                const topFiveItemTop = document.createElement('div');
                topFiveItemTop.classList.add('top-five-item-top');
                topFiveItem.appendChild(topFiveItemTop);

                const topFiveItemName = document.createElement('div');
                topFiveItemName.classList.add('top-five-item-name');
                topFiveItemName.textContent = `${song.song_name}`;
                topFiveItemTop.appendChild(topFiveItemName);

                const playCircleIcon = document.createElement('i');
                playCircleIcon.classList.add('bi', 'bi-play-circle-fill');
                topFiveItemName.appendChild(playCircleIcon);

                const topFiveItemLength = document.createElement('div');
                topFiveItemLength.classList.add('top-five-item-length');
                topFiveItemLength.textContent = `${song.song_length}`;
                topFiveItemTop.appendChild(topFiveItemLength);

                const topFiveItemBottom = document.createElement('div');
                topFiveItemBottom.classList.add('top-five-item-bottom');
                topFiveItem.appendChild(topFiveItemBottom);

                const heartIcon = document.createElement('i');
                heartIcon.classList.add('bi');
                if (userFavoriteSongIds.includes(song.id)) {
                    heartIcon.classList.add('bi-heart-fill', 'text-danger', 'add-song-to-favorites');
                } else {
                    heartIcon.classList.add('bi-heart', 'add-song-to-favorites');
                }
                topFiveItemBottom.prepend(heartIcon);

                heartIcon.addEventListener('click', () => {
                    addSongToFavorites(song.id);
                });

                const musicNoteIcon = document.createElement('i');
                musicNoteIcon.classList.add('bi', 'bi-music-note-list');
                topFiveItemBottom.appendChild(musicNoteIcon);

                musicNoteIcon.addEventListener('click', () => {
                    addToPlaylistModal(bandName, song.song_name); // Call addToPlaylistModal
                });

                const ratingStarsDiv = document.createElement('div');
                ratingStarsDiv.classList.add('rating-stars');
                topFiveItemBottom.appendChild(ratingStarsDiv);

                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('i');
                    star.setAttribute('data-index', i);
                    star.classList.add('bi', 'bi-star', 'song-rating-star');
                    
                    userSongRatings.forEach(songRated => {
                        if (songRated.song_id === song.id && i <= songRated.rating) {
                            star.classList.remove('bi-star');
                            star.classList.add('bi-star-fill');
                        } 
                    });
                    ratingStarsDiv.appendChild(star);
                }

            });

        })
        .catch(error => console.error('Error Fetching Top Five in Albums Page', error));
}

// render albums page albums
function renderAlbums(albums, body, bandName) {
    body.innerHTML = '';

    const albumsPageAlbumsTitle = document.createElement('span');
    albumsPageAlbumsTitle.classList.add('albums-page-albums-title');
    albumsPageAlbumsTitle.textContent = 'Albums';
    body.appendChild(albumsPageAlbumsTitle);

    Object.keys(albums).forEach(albumId => {

        const album = albums[albumId];

        const albumContainer = document.createElement('div');
        albumContainer.classList.add('album-container');
        body.appendChild(albumContainer);

        // Album Header
        const albumHeader = document.createElement('div');
        albumHeader.classList.add('album-header');
        albumHeader.dataset.albumId = albumId;
        albumContainer.appendChild(albumHeader);

        const albumPic = document.createElement('div');
        albumPic.classList.add('album-pic');
        albumHeader.appendChild(albumPic);

        const albumPicImg = document.createElement('img');
        albumPicImg.src = `../static/images/albums/${album.album_img}`;
        albumPic.appendChild(albumPicImg);

        const albumInfo = document.createElement('div');
        albumInfo.classList.add('album-info');
        albumHeader.appendChild(albumInfo);

        // Album Fav and Rating
        const albumFavAndRating = document.createElement('div');
        albumFavAndRating.classList.add('album-fav-and-rating');
        albumInfo.appendChild(albumFavAndRating);

        const albumAddFavsBtn = document.createElement('button');
        albumAddFavsBtn.classList.add('album-addfavs-btn', 'btn');

        if (userFavoriteAlbumIds.includes(album.album_id)) {
            albumAddFavsBtn.classList.add('btn-danger');
            albumAddFavsBtn.innerHTML = `<i class="bi bi-heart-fill text-black"></i>`;
        } else {
            albumAddFavsBtn.classList.add('btn-outline-secondary');
            albumAddFavsBtn.innerHTML = `Add <i class="bi bi-heart"></i>`;
        }
        albumFavAndRating.appendChild(albumAddFavsBtn);

        // album add to fav listener
        albumAddFavsBtn.addEventListener('click', () => {
            addAlbumToFavorites(albumId);
        });

        
        
        function renderAlbumStars(albumId) {
            // Reuse or create the rating stars container
            let ratingStarsAlbum = albumFavAndRating.querySelector('.rating-stars-album');

            if (!ratingStarsAlbum) {
                ratingStarsAlbum = document.createElement('div');
                ratingStarsAlbum.classList.add('rating-stars-album');
                albumFavAndRating.appendChild(ratingStarsAlbum);
            }

            // Clear the existing stars before re-rendering
            ratingStarsAlbum.innerHTML = '';

            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.setAttribute('data-index', i);
                star.classList.add('bi', 'bi-star', 'album-rating-star');
    
                star.addEventListener('click', () => {
                    addAlbumRatingToDB(i, albumId);
                    setTimeout(() => {
                        renderAlbumStars(albumId);
                    }, 500);
                });
                
                userAlbumRatings.forEach(albumRated => {
                    if (albumRated.album_id === albumId && i <= albumRated.rating) {
                        star.classList.remove('bi-star');
                        star.classList.add('bi-star-fill');
                    } 
                });
                ratingStarsAlbum.appendChild(star);
            }
        }

        renderAlbumStars(album.album_id);

        const albumTitle = document.createElement('span');
        albumTitle.classList.add('album-title');
        albumTitle.textContent = album.album_title;
        albumInfo.appendChild(albumTitle);

        const albumYear = document.createElement('span');
        albumYear.classList.add('album-year');
        albumYear.textContent = album.album_release;
        albumInfo.appendChild(albumYear);

        // Album Songs
        const albumSongsContainer = document.createElement('div');
        albumSongsContainer.classList.add('album-songs');
        albumSongsContainer.dataset.albumId = albumId;
        albumContainer.appendChild(albumSongsContainer);

        const albumSongsList = document.createElement('ul');
        albumSongsList.classList.add('album-songs-list', 'songs-list');
        albumSongsContainer.appendChild(albumSongsList);

        album.songs.forEach(song => {

            const albumSongsItem = document.createElement('li');
            albumSongsItem.classList.add('album-songs-item', 'songs-item');
            albumSongsItem.dataset.songId = song.song_id;
            albumSongsList.appendChild(albumSongsItem);

            const albumSongsItemTop = document.createElement('div');
            albumSongsItemTop.classList.add('album-songs-item-top', 'songs-item-top');
            albumSongsItem.appendChild(albumSongsItemTop);

            const albumSongsItemName = document.createElement('div');
            albumSongsItemName.classList.add('album-songs-item-name', 'songs-item-name');
            albumSongsItemTop.appendChild(albumSongsItemName);

            const albumSongsTrackNumber = document.createElement('span');
            albumSongsTrackNumber.classList.add('album-songs-track-number', 'songs-track-number');
            albumSongsTrackNumber.textContent = song.track_number + '. ';
            albumSongsItemName.appendChild(albumSongsTrackNumber);

            const songNameText = document.createTextNode(`${song.song_name}`);
            albumSongsItemName.appendChild(songNameText);

            const playCircleIcon = document.createElement('i');
            playCircleIcon.classList.add('bi', 'bi-play-circle-fill');
            albumSongsItemName.appendChild(playCircleIcon);

            const albumSongsLength = document.createElement('div');
            albumSongsLength.classList.add('album-songs-item-length', 'songs-item-length');
            albumSongsLength.textContent = song.song_length;
            albumSongsItemTop.appendChild(albumSongsLength);

            const albumSongsItemBottom = document.createElement('div');
            albumSongsItemBottom.classList.add('album-songs-item-bottom', 'songs-item-bottom');
            albumSongsItem.appendChild(albumSongsItemBottom);

            const heartIcon = document.createElement('i');
            heartIcon.classList.add('bi');
            heartIcon.dataset.songId = song.song_id;
            if (userFavoriteSongIds.includes(song.song_id)) {
                heartIcon.classList.add('bi-heart-fill', 'text-danger', 'add-song-to-favorites');
            } else {
                heartIcon.classList.add('bi-heart', 'add-song-to-favorites');
            }
            albumSongsItemBottom.prepend(heartIcon);

            heartIcon.addEventListener('click', (event) => {
                const songId = event.target.dataset.songId;
                addSongToFavorites(songId);
            });

            const musicNoteIcon = document.createElement('i');
            musicNoteIcon.classList.add('bi', 'bi-music-note-list');
            albumSongsItemBottom.appendChild(musicNoteIcon);

            musicNoteIcon.addEventListener('click', () => {
                addToPlaylistModal(bandName, song.song_name); // Call addToPlaylistModal
            });

            const ratingStarsDiv = document.createElement('div');
            ratingStarsDiv.classList.add('rating-stars');
            albumSongsItemBottom.appendChild(ratingStarsDiv);

            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.setAttribute('data-index', i);
                star.classList.add('bi', 'bi-star', 'song-rating-star');
                
                userSongRatings.forEach(songRated => {
                    if (songRated.song_id === song.song_id && i <= songRated.rating) {
                        star.classList.remove('bi-star');
                        star.classList.add('bi-star-fill');
                    } 
                });
                ratingStarsDiv.appendChild(star);
            }

        });
    });
}

// refresh albums
function refreshAlbumSongs(bandName) {
    fetch(`/albums-band-data/${bandName}`)
        .then(response => response.json())
        .then(data => {
            const albumsPageAlbums = document.querySelector('.albums-page-albums');
            renderAlbums(data.albums, albumsPageAlbums, bandName);
        })
        .catch(error => console.error('Error fetching albums data for refresh:', error));
}


// document click listener
document.addEventListener('click', (event) => {

    // listener for all song rating star on the entire web site
    if (event.target.closest('.rating-stars')) {

        const albumsPageContainer = document.getElementById('albums-page-container');
        const albumsTopFiveContainer = document.querySelector('.albums-page-top-five-container');
        const bandName = albumsPageContainer?.dataset.bandName;

        rateStars(event.target);
        
        const songId = event.target.closest('.album-songs-item, .top-five-item, .list-group-item').dataset.songId;
        addSongRatingToDB(event.target.dataset.index, songId);

        // double !! converts it to a boolean
        const isInTopFive = !!event.target.closest('.albums-page-top-five-container');
        const isInAlbums = !!event.target.closest('.albums-page-albums');
      
        if (isInTopFive) {
            setTimeout(() => {
                refreshAlbumSongs(bandName);   
            }, 1000);
        } else if (isInAlbums) {
            setTimeout(() => {
                fetchAndDisplayTopFiveAlbums(bandName, albumsTopFiveContainer);   
            }, 1000);
        }
        
    }

    if (event.target.closest('.return-button')) {
        /* window.history.back(); */
        fetchLink('/band-alpha-list', true, scrollValueAlpha);
    }

});


// add album to favorites
function addAlbumToFavorites(albumId) {
    fetch('/add-album-to-favorites', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            album_id: albumId,
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response not ok');
        }
        return response.json();
    })
    .then(data => {
        // Update the userFavoriteAlbumIds array
        if (!userFavoriteAlbumIds.includes(parseInt(albumId))) {
            userFavoriteAlbumIds.push(parseInt(albumId));
        } else if (data.message === 'Album removed from favorites') {
            userFavoriteAlbumIds = userFavoriteAlbumIds.filter(id => id !== parseInt(albumId));
        }

        const albumsPageContainer = document.getElementById('albums-page-container');
        
        // Refresh albums
        if (albumsPageContainer) {
            const bandName = document.querySelector('.albums-page-band-name').textContent.trim();
            refreshAlbumSongs(bandName);
        }
        // Refresh the favorites albums list for favorites table
        fetchAndStoreFavoriteAlbumIds();
    })
    .catch(error => {
        console.error("Error adding album to favorites:", error);
    });
}


// send song rating to database
function addAlbumRatingToDB(albumRating, albumId) {
    fetch('/add-album-rating', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            album_rating: albumRating,
            album_id: albumId,
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
        fetchAndStoreAlbumRatings();
    })
    .catch(error => {
        console.error("Error adding ratig to song:", error);
    });
}
