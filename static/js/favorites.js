function kickstartFavs() {
    const favCategories = document.getElementById('favorite-categories');

    const favoriteBands = document.createElement('div');
    favoriteBands.classList.add('favorite-bands');
    favCategories.appendChild(favoriteBands);

    const favBandsTitle = document.createElement('h5');
    favBandsTitle.classList.add('fav-bands-title');
    favBandsTitle.textContent = 'Bands';
    favoriteBands.appendChild(favBandsTitle);

    const horizontalLineBands = document.createElement('hr');
    horizontalLineBands.classList.add('horizontal-line-dotted');
    favoriteBands.appendChild(horizontalLineBands);

    const favBandsContent = document.createElement('div');
    favBandsContent.classList.add('fav-bands-content');
    favoriteBands.appendChild(favBandsContent);

    const bandsList = document.createElement('ul');
    favBandsContent.appendChild(bandsList);

    // Favorite Albums Section
    const favoriteAlbums = document.createElement('div');
    favoriteAlbums.classList.add('favorite-albums');
    favCategories.appendChild(favoriteAlbums);

    const favAlbumsTitle = document.createElement('h5');
    favAlbumsTitle.classList.add('fav-albums-title');
    favAlbumsTitle.textContent = 'Albums';
    favoriteAlbums.appendChild(favAlbumsTitle);

    const horizontalLineAlbums = document.createElement('hr');
    horizontalLineAlbums.classList.add('horizontal-line-dotted');
    favoriteAlbums.appendChild(horizontalLineAlbums);

    const favAlbumsContent = document.createElement('div');
    favAlbumsContent.classList.add('fav-albums-content');
    favoriteAlbums.appendChild(favAlbumsContent);

    const albumsList = document.createElement('ul');
    favAlbumsContent.appendChild(albumsList);

    // Favorite Songs Section
    const favoriteSongs = document.createElement('div');
    favoriteSongs.classList.add('favorite-songs');
    favCategories.appendChild(favoriteSongs);

    const favSongsTitle = document.createElement('h5');
    favSongsTitle.classList.add('fav-songs-title');
    favSongsTitle.textContent = 'Songs';
    favoriteSongs.appendChild(favSongsTitle);

    const horizontalLineSongs = document.createElement('hr');
    horizontalLineSongs.classList.add('horizontal-line-dotted');
    favoriteSongs.appendChild(horizontalLineSongs);

    const favSongsContent = document.createElement('div');
    favSongsContent.classList.add('fav-songs-content');
    favoriteSongs.appendChild(favSongsContent);

    const songsList = document.createElement('ul');
    favSongsContent.appendChild(songsList);

}

// add songs to songs favorites list table
function populateFavoriteSongsList(favoriteSongs) {
    const songsList = document.querySelector('.fav-songs-content ul');
    songsList.innerHTML = ''; // Clear existing list items

    // Sort the favoriteSongs array alphabetically by song_name
    favoriteSongs.sort((a, b) => {
        const songNameA = a.song_name.toLowerCase();
        const songNameB = b.song_name.toLowerCase();
        if (songNameA < songNameB) {
            return -1;
        }
        if (songNameA > songNameB) {
            return 1;
        }
        return 0; // Names are equal
    });

    favoriteSongs.forEach(song => {
        const songItem = document.createElement('li');
        const songName = document.createElement('span');
        songName.textContent = `${song.song_name}`; // Display song and band name
        songItem.appendChild(songName);
        const removeBtn = document.createElement('i');
        removeBtn.classList.add('fav-remove-btn', 'bi', 'bi-dash-square');
        songItem.appendChild(removeBtn);
        songsList.appendChild(songItem);

        // click listener for song
        songName.addEventListener('click', () => {
            if (window.innerWidth < 820) {
                run820SongScroll(song.song_id, song.album_id, song.band_name);
            } else {
                fetchLink('/albums', true, null, song.band_name, () => {
                    showAndScrollTo(song.song_id, song.album_id, song.band_name);
                });
            }
        });

        // Add event listener to the remove button
        removeBtn.addEventListener('click', () => {
            addSongToFavorites(song.song_id);
        });
    });
}

// click song on favorites and scroll to it
function showAndScrollTo(songId, albumId, bandName) {
    console.log(`Attempting to scroll to song ${songId} in album ${albumId}`);
    
    // Give content time to render fully
    setTimeout(() => {
        // First find the album container
        const albumContainer = document.querySelector(`.album-container:has(.album-header[data-album-id="${albumId}"])`);
        
        if (!albumContainer) {
            console.log(`Album container with ID ${albumId} not found`);
            return;
        }
        
        // Find the specific song, song id on heart icon
        const songElement = albumContainer.querySelector(`[data-song-id="${songId}"]`)?.closest('.album-songs-item') || 
                           albumContainer.querySelector(`.album-songs-item:has([data-song-id="${songId}"])`);
        
        if (!songElement) {
            console.log(`Song element with ID ${songId} not found`);
            // Fall back to scrolling to the album if song isn't found
            albumContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Add highlight effect to the song
            albumContainer.classList.add('highlighted-song');
            albumContainer.style.backgroundColor = 'rgba(255, 217, 0, 0.2)';
            albumContainer.style.transition = 'background-color 0.5s ease-in-out';
            
            // Remove highlight after a few seconds
            setTimeout(() => {
                albumContainer.style.backgroundColor = '';
                albumContainer.classList.remove('highlighted-song');
            }, 1500);

            return;
        }
        
        console.log("Song element found, scrolling...");
        
        // Scroll the song into view in the middle of the screen
        songElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' // This centers the element in the viewport
        });
        
        // Add highlight effect to the song
        songElement.classList.add('highlighted-song');
        songElement.style.backgroundColor = 'rgba(255, 217, 0, 0.2)';
        songElement.style.transition = 'background-color 0.5s ease-in-out';
        
        // Remove highlight after a few seconds
        setTimeout(() => {
            songElement.style.backgroundColor = '';
            songElement.classList.remove('highlighted-song');
        }, 3000);

        /* setTimeout(() => {
            scrollValueAlpha = captureLookUpScroll();
            // keep old values in history but replace scrollposition value
            history.replaceState(
                { ...history.state, scrollPosition: scrollValueAlpha }, 
                '', 
                window.location.pathname
            );
        }, 500); */

        
    }, 500); // Delay to ensure DOM is ready
}


// ADD ALBUMS TO FAVORITES TABLE
function populateFavoriteAlbumsList(favoriteAlbums) {
    const albumsList = document.querySelector('.fav-albums-content ul');
    albumsList.innerHTML = ''; // Clear existing list items

    // Sort the favoriteAlbums array alphabetically by album_name
    favoriteAlbums.sort((a, b) => {
        const albumNameA = a.album_name.toLowerCase();
        const albumNameB = b.album_name.toLowerCase();
        if (albumNameA < albumNameB) {
            return -1;
        }
        if (albumNameA > albumNameB) {
            return 1;
        }
        return 0; // Names are equal
    });

    favoriteAlbums.forEach(album => {
        const albumItem = document.createElement('li');
        const albumName = document.createElement('span');
        albumName.textContent = `${album.album_name}`;
        albumItem.appendChild(albumName);
        const removeBtn = document.createElement('i');
        removeBtn.classList.add('fav-remove-btn', 'bi', 'bi-dash-square');
        albumItem.appendChild(removeBtn);
        albumsList.appendChild(albumItem);

        // click listener for album
        albumName.addEventListener('click', () => {
            
            if (window.innerWidth < 820) {
                run820AlbumScroll(album.album_id, album.band_name);
            } else {
                fetchLink('/albums', true, null, album.band_name, () => {
                    showAndScrollTo(null, album.album_id, album.band_name);
                });   
            }
        });


        // Add event listener to the remove button
        removeBtn.addEventListener('click', () => {
            addAlbumToFavorites(album.album_id);
        });
    });
}


// add bands to favorite bands table
function populateFavoriteBandsList(favoriteBands) {
    const bandsList = document.querySelector('.fav-bands-content ul');
    bandsList.innerHTML = ''; // Clear existing list items

    // Sort the favorite Bands array alphabetically by band_name
    favoriteBands.sort((a, b) => {
        const bandNameA = a.band_name.toLowerCase();
        const bandNameB = b.band_name.toLowerCase();
        if (bandNameA < bandNameB) {
            return -1;
        }
        if (bandNameA > bandNameB) {
            return 1;
        }
        return 0; // Names are equal
    });

    favoriteBands.forEach(band => {
        const bandItem = document.createElement('li');
        const bandName = document.createElement('span');
        bandName.textContent = `${band.band_name}`;
        bandItem.appendChild(bandName);
        const removeBtn = document.createElement('i');
        removeBtn.classList.add('fav-remove-btn', 'bi', 'bi-dash-square');
        bandItem.appendChild(removeBtn);
        bandsList.appendChild(bandItem);

        // click listener for band
        bandName.addEventListener('click', () => {
            const albumPageIndentifier = document.querySelector('.albums-page-band-name');
            const bioPageIdentifier = document.getElementById('bio-page-container');

            if (window.innerWidth < 820) {
                run820BandScroll(band.band_id);
            } else if (albumPageIndentifier || bioPageIdentifier) {
                fetchLink('/band-alpha-list', true, null, null, () => {
                    scrollToBand(band.band_id); // delay the execution
                });
            } else {
                scrollToBand(band.band_id);
            }
            
        });


        // Add event listener to the remove button
        removeBtn.addEventListener('click', () => {
            addBandToFavorites(band.band_id);
        });
    });
}

// scroll to band in alpha list page
function scrollToBand(bandId) {

    const targetBand = document.querySelector(`.band-container:has(.band-info-btns[data-band-id="${bandId}"])`);

    if (targetBand) {
    targetBand.style.scrollMarginTop = '200px';
    targetBand.scrollIntoView({ behavior: 'smooth', block: 'start'});

    targetBand.classList.add('highlighted-song');
    targetBand.style.backgroundColor = 'rgba(255, 217, 0, 0.2)';
    targetBand.style.transition = 'background-color 0.5s ease-in-out';
    
    // Remove highlight after a few seconds
    setTimeout(() => {
        targetBand.style.backgroundColor = '';
        targetBand.classList.remove('highlighted-song');
    }, 3000);
    }

}