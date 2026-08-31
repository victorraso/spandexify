// user favorite songs recall and store
let userFavoriteSongIds = [];

function fetchAndStoreFavoriteSongIds() {
    fetch('/get-all-favorite-songs')
        .then(response => response.json())
        .then(data => {
            if (data.favorite_songs) {
                // Extract only the song_ids from the response
                userFavoriteSongIds = data.favorite_songs.map(song => song.song_id);
                populateFavoriteSongsList(data.favorite_songs);
                console.log("User favorite song IDs stored:", userFavoriteSongIds);
            } else {
                console.error("Error fetching favorite songs:", data.error);
            }
        })
        .catch(error => {
            console.error("Network error fetching favorite songs:", error);
        });
}

// user favorite bands recall and store
let userFavoriteBandIds = [];

function fetchAndStoreFavoriteBandIds() {
    fetch('/get-all-favorite-bands')
        .then(response => response.json())
        .then(data => {
            if (data.favorite_bands) {
                // Extract only the band_ids from the response
                userFavoriteBandIds = data.favorite_bands.map(band => band.band_id);
                populateFavoriteBandsList(data.favorite_bands);
                console.log("User favorite bands IDs stored:", userFavoriteBandIds);
            } else {
                console.error("Error fetching favorite bands:", data.error);
            }
        })
        .catch(error => {
            console.error("Network error fetching favorite bands:", error);
        });
}

// user band ratings recall and store
let userBandRatings = [];

function fetchAndStoreBandRatings() {
    fetch('/get-all-band-ratings')
        .then(response => response.json())
        .then(data => {
            if (data.band_ratings) {
                userBandRatings = data.band_ratings;

                setTimeout(() => {
                    userBandRatings.forEach(band => {
                        displayBandRating(band.rating, band.band_id);
                    });
                    
                }, 500);
                
            } else {
                console.error("Error fetching band ratings:", data.error);
            }
        })
        .catch(error => {
            console.error("Network error fetching band ratings:", error);
        });
}


// song ratings recall and store
let userSongRatings = [];

function fetchAndStoreSongRatings() {
    fetch('/get-all-song-ratings')
        .then(response => response.json())
        .then(data => {
            if (data.song_ratings) {
                userSongRatings = data.song_ratings;
                
            } else {
                console.error("Error fetching song ratings:", data.error);
            }
        })
        .catch(error => {
            console.error("Network error fetching song ratings:", error);
        });
}


function kickstartAlphaList() {

    fetchAndStoreFavoriteSongIds();
    fetchAndStoreFavoriteAlbumIds();
    fetchAndStoreFavoriteBandIds();
    fetchAndStoreBandRatings();
    fetchAndStoreSongRatings();

    // Fetch data from database to dynamically create content
    fetch('/alpha-list')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('alphabet-container');
        
            Object.keys(data).forEach(letter => {
                const letterContainer = document.createElement('div');
                letterContainer.classList.add('letter-container');
        
                const letterTitle = document.createElement('h1');
                letterTitle.classList.add('letter-title');
                letterTitle.textContent = letter;
                letterTitle.id = `letter-${letter}`;
                letterContainer.appendChild(letterTitle);
        
                const bandList = document.createElement('ul');
                letterContainer.appendChild(bandList);
        
                data[letter].forEach(band => {
                    const sanitizedBandName = sanitizeId(band.name);
        
                    const bandItem = document.createElement('li');
                    bandItem.classList.add('band-container');
        
                    const bandIcon = document.createElement('div');
                    bandIcon.classList.add('band-icon');
                    bandItem.appendChild(bandIcon);
        
                    const bandIconPic = document.createElement('div');
                    bandIconPic.classList.add('band-icon-pic');
                    bandIcon.appendChild(bandIconPic);
        
                    const bandImage = document.createElement('img');
                    bandImage.src = '../static/images/icons/' + band.icon_img;
                    bandImage.alt = band.name;
                    bandIconPic.appendChild(bandImage);
        
                    const bandName = document.createElement('span');
                    bandName.classList.add('band-icon-name');
                    bandName.textContent = band.name;
                    bandIcon.appendChild(bandName);
        
                    const bandInfo = document.createElement('div');
                    bandInfo.classList.add('band-info');
                    bandItem.appendChild(bandInfo);
        
                    const bandInfoTop = document.createElement('div');
                    bandInfoTop.classList.add('band-info-top');
                    bandInfo.appendChild(bandInfoTop);
        
                    const bandInfoBtns = document.createElement('div');
                    bandInfoBtns.classList.add('band-info-btns');
                    bandInfoBtns.dataset.bandId = band.id; 
                    bandInfoTop.appendChild(bandInfoBtns);
        
                    const albumsBtn = document.createElement('button');
                    albumsBtn.classList.add('band-disc-btn', 'btn', 'btn-success');
                    albumsBtn.innerHTML = '<i class="bi bi-disc me-1"></i>Albums';
                    bandInfoBtns.appendChild(albumsBtn);
        
                    const bioBtn = document.createElement('button');
                    bioBtn.classList.add('band-bio-btn', 'btn', 'btn-outline-success');
                    bioBtn.textContent = 'Bio';
                    bandInfoBtns.appendChild(bioBtn);
        
                    // render add to favs button
                    renderAddBandToFavsBtn(bandInfoBtns, band.id);
        
                    const bandInfoRatings = document.createElement('div');
                    bandInfoRatings.classList.add('band-info-ratings');
                    bandInfoTop.appendChild(bandInfoRatings);
        
                    const bandInfoYourRating = document.createElement('div');
                    bandInfoYourRating.classList.add('band-info-your-rating', 'dropdown');
                    bandInfoRatings.appendChild(bandInfoYourRating);
        
                    const ratingButton = document.createElement('button');
                    ratingButton.classList.add('btn', 'dropdown-toggle', 'rating-button');
                    ratingButton.type = 'button';
                    ratingButton.setAttribute('data-bs-toggle', 'dropdown');
                    ratingButton.setAttribute('aria-expanded', 'false');
                    ratingButton.dataset.bandId = band.id; 
                    ratingButton.textContent = 'Rate Me';
                    bandInfoYourRating.appendChild(ratingButton);
        
                    const ratingMenu = document.createElement('ul');
                    ratingMenu.classList.add('dropdown-menu', 'your-rate-menu');
                    bandInfoYourRating.appendChild(ratingMenu);
        
                    const ratingTable = document.createElement('table');
                    ratingTable.classList.add('tablex');
                    ratingMenu.appendChild(ratingTable);
        
                    const tableHead = document.createElement('thead');
                    ratingTable.appendChild(tableHead);
        
                    const headerRow = document.createElement('tr');
                    tableHead.appendChild(headerRow);
        
                    ['Symbol', 'Name', 'Value'].forEach(text => {
                        const th = document.createElement('th');
                        th.textContent = text;
                        headerRow.appendChild(th);
                    });
        
                    const tableBody = document.createElement('tbody');
                    ratingTable.appendChild(tableBody);
        
                    const ratings = [
                        { emoji: '🤘', title: 'Totally Legendary', value: 5 },
                        { emoji: '🔥', title: 'Red Hot and On Fire', value: 4 },
                        { emoji: '🎸', title: 'Decent, Dude', value: 3 },
                        { emoji: '😐', title: 'Bodaciously Bad', value: 2 },
                        { emoji: '🚫', title: 'Whimpers', value: 1 }
                    ];
        
                    ratings.forEach(rating => {
                        const row = document.createElement('tr');
                        row.classList.add('rating-option');
                        row.setAttribute('data-value', rating.value);
                        tableBody.appendChild(row);
        
                        ['emoji', 'title', 'value'].forEach(key => {
                            const cell = document.createElement('td');
                            cell.classList.add(`rating-${key}`);
                            cell.textContent = rating[key];
                            row.appendChild(cell);
                        });

                        row.addEventListener('click', () => {
                            addBandRatingToDB(band.id, rating.value);
                        });

                    });

                    
                    const bandInfoTheirRatings = document.createElement('div');
                    bandInfoTheirRatings.classList.add('band-info-their-ratings');
                    bandInfoRatings.appendChild(bandInfoTheirRatings);
                    
                    const bandRatingSpan = document.createElement('span');
                    bandRatingSpan.classList.add('band-ratings-average');
                    bandRatingSpan.textContent = band.rating ? `⭐ ${band.rating} of 5` : 'No ratings yet';
                    bandInfoTheirRatings.appendChild(bandRatingSpan);
                    

                    // Accordion
                    const bandInfoBottom = document.createElement('div');
                    bandInfoBottom.classList.add('band-info-bottom');
                    bandInfo.appendChild(bandInfoBottom);
        
                    const bandInfoTopFive = document.createElement('div');
                    bandInfoTopFive.classList.add('band-info-topfive');
                    bandInfoBottom.appendChild(bandInfoTopFive);
        
                    const bandAccordion = document.createElement('div');
                    bandAccordion.classList.add('accordion');
                    bandAccordion.id = `bandAccordion-${sanitizedBandName}`; // Unique ID
                    bandInfoTopFive.appendChild(bandAccordion);
        
                    const accordionItem = document.createElement('div');
                    accordionItem.classList.add('accordion-item');
                    bandAccordion.appendChild(accordionItem);
        
                    const accordionHeader = document.createElement('h2');
                    accordionHeader.classList.add('accordion-header');
                    accordionItem.appendChild(accordionHeader);
        
                    const accordionButton = document.createElement('button');
                    accordionButton.classList.add('accordion-button', 'collapsed');
                    accordionButton.type = 'button';
                    accordionButton.setAttribute('data-bs-toggle', 'collapse');
                    accordionButton.setAttribute('data-bs-target', `#topSongs-${sanitizedBandName}`);
                    accordionButton.innerHTML = '<i class="bi bi-file-earmark-music-fill me-1"></i>Top 5 Songs';
                    accordionHeader.appendChild(accordionButton);
        
                    const collapseDiv = document.createElement('div');
                    collapseDiv.id = `topSongs-${sanitizedBandName}`;
                    collapseDiv.classList.add('accordion-collapse', 'collapse');
                    accordionItem.appendChild(collapseDiv);
        
                    const accordionBody = document.createElement('div');
                    accordionBody.classList.add('accordion-body');
                    collapseDiv.appendChild(accordionBody);
        
                    const dottedLine = document.createElement('hr');
                    dottedLine.classList.add('horizontal-line-dotted');
                    bandList.appendChild(dottedLine);
        
                    bandList.appendChild(bandItem);
                });
        
                const fullLine = document.createElement('hr');
                container.appendChild(fullLine);
        
                container.appendChild(letterContainer);
            });
        
        })
        .catch(error => console.error('Error fetching alpha list data:', error));
}


// display band rating
function displayBandRating(ratingValue, bandId) {

    const ratingButton = document.querySelector(`.rating-button[data-band-id="${bandId}"]`);

    const bandInfoTheirRatings = ratingButton.closest('.band-info').querySelector('.band-info-their-ratings');

    const bandInfoYourRating = ratingButton.closest('.band-info-your-rating');

    const ratingRows = bandInfoYourRating.querySelectorAll('.rating-option');
    ratingRows.forEach(row => {

        if (parseInt(row.getAttribute('data-value')) === ratingValue) {

            // Update the button's content here
            const emoji = row.querySelector('.rating-emoji').textContent;
            const title = row.querySelector('.rating-title').textContent;
            ratingButton.innerHTML = `${emoji} ${title}`;

            // Adjust margin
            const buttonWidth = ratingButton.parentElement.offsetWidth;
            const desiredSpacing = 3;
            bandInfoTheirRatings.style.marginLeft = (buttonWidth + desiredSpacing) + 'px';
        }
    });
        
}


// render add to fav button
function renderAddBandToFavsBtn(bandInfoBtns, bandId) {

    // Remove any existing button with the same class
    const existingBtn = bandInfoBtns.querySelector('.band-addfavs-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    const addFavsBtn = document.createElement('button');
    addFavsBtn.classList.add('band-addfavs-btn', 'btn');

    setTimeout(() => {
        if (userFavoriteBandIds.includes(bandId)) {
            addFavsBtn.classList.add('btn-danger');
            addFavsBtn.innerHTML = `<i class="bi bi-heart-fill text-black"></i>`;
        } else {
            addFavsBtn.classList.add('btn-outline-secondary');
            addFavsBtn.innerHTML = `Add <i class="bi bi-heart"></i>`;
        }
        bandInfoBtns.appendChild(addFavsBtn);
    }, 200);

    addFavsBtn.addEventListener('click', () => {
        addBandToFavorites(bandId);
    });

}

// remove unwanted char from name
function sanitizeId(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_'); // Replace special characters with '_'
}

let scrollValueAlpha = 0;

// Click Listener for Btns
document.addEventListener('click', function (event) {

    // Albums Btn and Bio Btn call fetchlink from mainpage
    if (event.target.closest('.band-disc-btn') || event.target.closest('.band-bio-btn')) {
        
        scrollValueAlpha = captureLookUpScroll();
        
        // keep old values in history but replace scrollposition value
        history.replaceState(
            { ...history.state, scrollPosition: scrollValueAlpha }, 
            '', 
            window.location.pathname
        );
        
        const bandContainer = event.target.closest('.band-container');
        const bandName = bandContainer.querySelector('.band-icon-name').textContent.trim();

        if (event.target.closest('.band-disc-btn')) {
            fetchLink('/albums', true, null, bandName);
        } else {
            fetchLink('/biography', true, null, bandName);
        }
        
    }

    // Rate Me Btn
    if (event.target.closest('.rating-option')) {
        event.preventDefault();

        const ratingOption = event.target.closest('.rating-option');
        const ratingButton = ratingOption.closest('.band-info-your-rating').querySelector('.rating-button');
        const bandInfoTheirRatings = ratingOption.closest('.band-info').querySelector('.band-info-their-ratings');

        const emoji = ratingOption.querySelector('.rating-emoji').textContent;
        const title = ratingOption.querySelector('.rating-title').textContent;

        ratingButton.innerHTML = `${emoji} ${title}`;

        // Adjust margin
        const buttonWidth = ratingButton.parentElement.offsetWidth;
        const desiredSpacing = 3;
        bandInfoTheirRatings.style.marginLeft = (buttonWidth + desiredSpacing) + 'px';

        // Disable hover temporarily
        document.querySelectorAll('.band-container').forEach(container => {
            container.classList.add('disable-hover');
        });

        setTimeout(() => {
            document.querySelectorAll('.band-container').forEach(container => {
                container.classList.remove('disable-hover');
            });
        }, 1000);
    }

    // Fix Bootstrap Accordion Toggle for Dynamically Loaded Content
    if (event.target.matches('.accordion-button') || event.target.closest('.accordion-button')) {
        const accordionButton = event.target.closest('.accordion-button');
        const accordionCollapse = document.querySelector(accordionButton.getAttribute('data-bs-target'));
        
        // Ensure Bootstrap's Collapse class is properly initialized
        if (!accordionCollapse.classList.contains('show')) {
            bootstrap.Collapse.getOrCreateInstance(accordionCollapse).show();
        } else {
            bootstrap.Collapse.getOrCreateInstance(accordionCollapse).hide();
        }
    
        // If the target is an accordion button, proceed with fetching the band data
        const bandContainer = accordionButton.closest('.band-container');
        const bandNameElement = bandContainer ? bandContainer.querySelector('.band-icon-name') : null;
        const bandName = bandNameElement ? bandNameElement.textContent.trim() : '';
    
        if (bandName) {
            const accordionBody = accordionButton.closest('.accordion-item').querySelector('.accordion-body');
            // Use the shared function
            fetchAndDisplayTopFive(bandName, accordionBody);
        } else {
            console.error('Band name not found');
        }
    }


});
    
// render top five
function fetchAndDisplayTopFive(bandName, accordionBody) {
    fetch(`/top-five/${bandName}`)
        .then(response => response.json())
        .then(data => {
            accordionBody.innerHTML = ''; // Clear previous content
            if (data.length === 0) {
                accordionBody.innerHTML = 'No top songs available';
            } else {
                const listGroup = document.createElement('ul');
                listGroup.classList.add('list-group');
                accordionBody.appendChild(listGroup);

                data.forEach(song => {
                    const listGroupItem = document.createElement('li');
                    listGroupItem.classList.add('list-group-item');
                    listGroupItem.dataset.songId = song.id;
                    listGroup.appendChild(listGroupItem);

                    const listGroupItemLeft = document.createElement('div');
                    listGroupItemLeft.classList.add('list-group-item-left');
                    listGroupItem.appendChild(listGroupItemLeft);

                    const listGroupItemTrack = document.createElement('div');
                    listGroupItemTrack.classList.add('list-group-item-track');
                    listGroupItemTrack.textContent = `${song.song_name}`;
                    listGroupItemLeft.appendChild(listGroupItemTrack);

                    const listGroupItemFavs = document.createElement('div');
                    listGroupItemFavs.classList.add('list-group-item-favs');
                    listGroupItemLeft.appendChild(listGroupItemFavs);

                    // Generate the heart icon based on the pre-fetched favorites array
                    const heartIcon = document.createElement('i');
                    heartIcon.classList.add('bi');
                    if (userFavoriteSongIds.includes(song.id)) {
                        heartIcon.classList.add('bi-heart-fill', 'text-danger', 'add-song-to-favorites');
                    } else {
                        heartIcon.classList.add('bi-heart', 'add-song-to-favorites');
                    }
                    listGroupItemFavs.prepend(heartIcon);

                    const musicNoteIcon = document.createElement('i');
                    musicNoteIcon.classList.add('bi', 'bi-music-note-list', 'playlist-add-icon');
                    listGroupItemFavs.appendChild(musicNoteIcon);

                    const ratingStarsDiv = document.createElement('div');
                    ratingStarsDiv.classList.add('rating-stars');
                    listGroupItemFavs.appendChild(ratingStarsDiv);

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
                    
                    const listGroupItemRight = document.createElement('div');
                    listGroupItemRight.classList.add('list-group-item-right');
                    listGroupItem.appendChild(listGroupItemRight);

                    const playCircleIcon = document.createElement('i');
                    playCircleIcon.classList.add('bi', 'bi-play-circle-fill');
                    listGroupItemRight.appendChild(playCircleIcon);
                });
                
                // Attach event listeners to the newly created elements
                attachAccordionBodyEventListeners(accordionBody);
            }
        })
        .catch(error => console.error('Error Fetching Top Five', error));
}


// Add song to favorites function
function addSongToFavorites(songId) {
    fetch('/add-song-to-favorites', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            song_id: songId,
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response not ok');
        }
        return response.json();
    })
    .then(data => {
        // Update the userFavoriteSongIds array
        if (!userFavoriteSongIds.includes(parseInt(songId))) {
            userFavoriteSongIds.push(parseInt(songId));
        } else if (data.message === 'Song removed from favorites') {
            userFavoriteSongIds = userFavoriteSongIds.filter(id => id !== parseInt(songId));
        }

        const albumsPageContainer = document.getElementById('albums-page-container');
        const alphabetContainer = document.getElementById('alphabet-container');
        
        // Refresh the top five songs
        if (alphabetContainer) {
            const listItem = document.querySelector(`[data-song-id="${songId}"]`);
            if (listItem) {
                const accordionBody = listItem.closest('.accordion-body');
                const bandName = listItem.closest('.band-container').querySelector('.band-icon-name').textContent.trim();
                fetchAndDisplayTopFive(bandName, accordionBody);
            } else {
                console.log('no accordion is opened');
            }

        } else if (albumsPageContainer) {
            const albumsTopFiveContainer = document.querySelector('.albums-page-top-five-container');
            const bandName = document.querySelector('.albums-page-band-name').textContent.trim();
            fetchAndDisplayTopFiveAlbums(bandName, albumsTopFiveContainer);
            refreshAlbumSongs(bandName);
        }
        // Refresh the favorites songs list
        fetchAndStoreFavoriteSongIds();
    })
    .catch(error => {
        console.error("Error adding song to favorites:", error);
    });
}


// send song rating to database
function addSongRatingToDB(songRating, songId) {
    fetch('/add-song-rating', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            song_rating: songRating,
            song_id: songId,
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
        fetchAndStoreSongRatings();
    })
    .catch(error => {
        console.error("Error adding ratig to song:", error);
    });
}


// accordion event listeners
function attachAccordionBodyEventListeners(accordionBody) {
    // First, remove any existing event listeners by cloning and replacing the element
    const newAccordionBody = accordionBody.cloneNode(true);
    accordionBody.parentNode.replaceChild(newAccordionBody, accordionBody);
    
    // Now attach the event listener to the new element
    newAccordionBody.addEventListener('click', function(event) {
        const clickedIcon = event.target;
        const listItem = clickedIcon.closest('.list-group-item');
        if (!listItem) return;
        
        const songId = listItem.dataset.songId;
        const songNameElement = listItem.querySelector('.list-group-item-track');
        const songName = songNameElement.textContent.trim();
        const bandName = clickedIcon.closest('.band-container').querySelector('.band-icon-name').textContent.trim();

        const songRating = clickedIcon.dataset.index;

        if (clickedIcon.classList.contains('playlist-add-icon')) {
            addToPlaylistModal(bandName, songName);
        }

        if (clickedIcon.classList.contains('add-song-to-favorites')) {
            addSongToFavorites(songId);
        }

    });
    
    return newAccordionBody;
}


// generate a modal with playlists to add the clicked song
function addToPlaylistModal(bandName, songName) {
    fetch('/get-playlists')
        .then(response => response.json())
        .then(data => {
            // Create the modal element
            const modal = document.createElement('div');
            modal.classList.add('modal');
            modal.tabIndex = -1;
            modal.id = 'addto-playlist-modal';

            const modalDialog = document.createElement('div');
            modalDialog.classList.add('modal-dialog');
            modal.appendChild(modalDialog);

            const modalContent = document.createElement('div');
            modalContent.classList.add('modal-content', 'bg-dark', 'text-white');
            modalDialog.appendChild(modalContent);

            const modalHeader = document.createElement('div');
            modalHeader.classList.add('modal-header');
            modalContent.appendChild(modalHeader);

            const modalTitle = document.createElement('h5');
            modalTitle.classList.add('modal-title');
            modalTitle.innerHTML = `Add <b style="font-size: 1.2em;">'${songName}'</b> to...`;
            modalHeader.appendChild(modalTitle);

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.classList.add('btn-close');
            closeButton.setAttribute('data-bs-dismiss', 'modal');
            closeButton.setAttribute('aria-label', 'Close');
            modalHeader.appendChild(closeButton);

            const modalBody = document.createElement('div');
            modalBody.classList.add('modal-body');
            modalContent.appendChild(modalBody);

            // Populate modal body with playlists and checkboxes
            data.forEach(playlist => {
                const playlistItem = document.createElement('div');
                playlistItem.classList.add('addto-playlist-item');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `playlist-${playlist.id}`; // Unique ID for each checkbox
                checkbox.name = 'playlists';
                checkbox.value = playlist.id;

                const label = document.createElement('label');
                label.htmlFor = `playlist-${playlist.id}`;
                label.textContent = playlist.playlist_name;
                label.style.marginLeft = '10px';

                playlistItem.appendChild(checkbox);
                playlistItem.appendChild(label);
                modalBody.appendChild(playlistItem);
            });

            const modalFooter = document.createElement('div');
            modalFooter.classList.add('modal-footer');
            modalContent.appendChild(modalFooter);

            const closeFooterButton = document.createElement('button');
            closeFooterButton.type = 'button';
            closeFooterButton.classList.add('btn', 'btn-secondary');
            closeFooterButton.setAttribute('data-bs-dismiss', 'modal');
            closeFooterButton.textContent = 'Close';
            modalFooter.appendChild(closeFooterButton);

            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.classList.add('confirm-addto-btn', 'btn', 'btn-success');
            addButton.textContent = 'Add';
            modalFooter.appendChild(addButton);

            // Append the modal to the body or a specific container
            document.body.appendChild(modal);

            // Initialize Bootstrap Modal (if you're using Bootstrap)
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

            //Add event listener to add button
            addButton.addEventListener('click', function(){
                const checkedPlaylists = Array.from(modalBody.querySelectorAll('input[name="playlists"]:checked'))
                .map(checkbox => checkbox.value);
                
                checkedPlaylists.forEach(playlistId => {
                    fetch('/add-song-to-playlist', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            playlist_id: playlistId,
                            song_name: songName,
                            band_name: bandName,
                        })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("Song added to playlist:", data);
                        reloadPlaylistsList();
                    })
                    .catch(error => {
                        console.error("Error adding song to playlist:", error);
                    });
                });

                bootstrapModal.hide();
                
            });

        })
        .catch(error => console.error('Error fetching playlists:', error));
}


// add band to favorites
function addBandToFavorites(bandId) {
    fetch('/add-band-to-favorites', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            band_id: bandId,
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response of add band to favorites not ok');
        }
        return response.json();
    })
    .then(data => {
        // Update the userFavoriteBandIds array
        if (!userFavoriteBandIds.includes(parseInt(bandId))) {
            userFavoriteBandIds.push(parseInt(bandId));
        } else if (data.message === 'Band removed from favorites') {
            userFavoriteBandIds = userFavoriteBandIds.filter(id => id !== parseInt(bandId));
        }

        const lookupContent = document.getElementById('content');
        
        // Refresh albums
        if (lookupContent) {
            const bandInfoBtns = document.querySelector(`.band-info-btns[data-band-id="${bandId}"]`);
            renderAddBandToFavsBtn(bandInfoBtns, bandId);
        }
        // Refresh the favorites albums list for favorites table
        fetchAndStoreFavoriteBandIds();
    })
    .catch(error => {
        console.error("Error adding album to favorites:", error);
    });
}


// add band rating to database
function addBandRatingToDB(bandId, ratingValue) {
    fetch('/add-band-rating', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({band_id: bandId, rating_value: ratingValue})
    })
    .then (response => {
        if (!response.ok) {
            console.log(response);
        }
        // parse json response to be able to access data.message
        return response.json();
    })
    .then(data => {
        /* if (!userBandRatings.includes(bandId)) {
            userBandRatings.push(bandId);
        } */
       console.log(data.message);
    })
}