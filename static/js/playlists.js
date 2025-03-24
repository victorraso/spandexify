function kickstartPlaylists() {

    reloadPlaylistsList();

    /* create playlist modal */
    const approvePlaylist = document.querySelector('.approve-playlist-btn');
    const inputPlaylistName = document.getElementById('playlist-input-name');
    const playlistModal = document.getElementById('create-playlist-modal');

    playlistModal.addEventListener('shown.bs.modal', function () {
        if (inputPlaylistName) {
          inputPlaylistName.focus(); // Focus on the input element when the modal is shown
        }
    });

    approvePlaylist.addEventListener('click', async () => {
        const playlistName = inputPlaylistName.value.trim();
        if (!playlistName) return alert('Please enter a playlist name.');
    
        try {
            const response = await fetch('/create-playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playlist_name: playlistName })
            });

            if (response.ok) {
                inputPlaylistName.value = '';
                reloadPlaylistsList();

                const modalInstance = bootstrap.Modal.getInstance(playlistModal);
                if (modalInstance) modalInstance.hide();

            }
        } catch (error) {
            console.error('Error creating playlist:', error);
        }
    });

    /* fetch playlists for delete playlist modal */
    const deletePlaylistBtn = document.querySelector('.delete-play-btn');
    const deleteModal = document.getElementById('delete-playlist-modal');
    const confirmDeleteBtn = deleteModal.querySelector('.confirm-delete-btn');
    const deleteModalBody = deleteModal.querySelector('.modal-body');

    deletePlaylistBtn.addEventListener('click', () => {
        fetch('/get-playlists')
            .then(response => response.json())
            .then(data => {

                deleteModalBody.innerHTML = '';
                data.forEach(playlist => {
                    const delPlaylistItem = document.createElement('div');
                    delPlaylistItem.classList.add('del-playlist-item');
    
                    const label = document.createElement('label');
                    label.setAttribute('for', 'del-playlist-checkbox');
                    delPlaylistItem.appendChild(label);
    
                    const checkbox = document.createElement('input');
                    checkbox.setAttribute('type', 'checkbox');
                    checkbox.setAttribute('id', 'del-playlist-checkbox'); 
                    checkbox.setAttribute('name', 'del-playlist-checkbox');
                    checkbox.setAttribute('value', `${playlist.id}`);
                    delPlaylistItem.appendChild(checkbox);
    
                    const span = document.createElement('span');
                    span.classList.add('del-playlist-name');
                    span.textContent = playlist.playlist_name;
                    delPlaylistItem.appendChild(span);
    
                    deleteModalBody.appendChild(delPlaylistItem);
                });
                
            })
            .catch(error => console.error('Error fetching playlists:', error));
    });

    confirmDeleteBtn.addEventListener('click', () => {
        const selectedIds = [];

        document.querySelectorAll('.del-playlist-item input[type="checkbox"]:checked').forEach(checkbox => {
            selectedIds.push(checkbox.value);
        });

        if (selectedIds.length > 0) {
            fetch('/delete-playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedIds}),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Delete Successfull:', data);
                selectedIds.forEach(id => {
                    const playlistItem = document.querySelector(`input[value="${id}"]`).parentElement;
                    playlistItem.remove();
                });

                setTimeout(() => {
                    const modalInstance = bootstrap.Modal.getInstance(deleteModal);
                    if (modalInstance) modalInstance.hide();
                }, 250);
                reloadPlaylistsList();
            })
            .catch(error => {
                console.error('Error deleting playlists:', error);
            });
        } else {
            alert('Please select at least one playlist to delete.');
        }

    });

}

/* Fetch playlists for the playlists list */
function reloadPlaylistsList() {
    // Capture the currently open playlist ID
    const playlistsDiv = document.querySelector('.playlists'); // Get the playlist container
    if(playlistsDiv) {
        const openAccordion = playlistsDiv.querySelector('#playlist-accordion .accordion-collapse.show'); // Scoped query
        if (openAccordion) {
            openPlaylistId = openAccordion.id;
        } else {
            openPlaylistId = null;
        }
    } else {
        openPlaylistId = null;
    }

    fetch('/fetch-full-playlists')
        .then(response => response.json())
        .then(playlists => {
            const playlistsDiv = document.querySelector('.playlists');
            playlistsDiv.innerHTML = '';
        
            const playlistContainer = document.createElement('div');
            playlistContainer.classList.add('playlist-container');
            playlistsDiv.appendChild(playlistContainer);
            
            const playlistItems = document.createElement('div');
            playlistItems.classList.add('playlist-items');
            playlistContainer.appendChild(playlistItems); 
            
            const accordion = document.createElement('div');
            accordion.classList.add('accordion');
            accordion.id = 'playlist-accordion';
            playlistItems.appendChild(accordion);
            
            playlists.forEach(playlist => {
                const accordionItem = document.createElement('div');
                accordionItem.classList.add('accordion-item');
                accordion.appendChild(accordionItem);
            
                const accordionHeader = document.createElement('h2');
                accordionHeader.classList.add('accordion-header');
                accordionItem.appendChild(accordionHeader);
            
                const accordionButton = document.createElement('button');
                accordionButton.classList.add('playlist-title', 'accordion-button', 'collapsed');
                accordionButton.type = 'button';
                accordionButton.setAttribute('data-bs-toggle', 'collapse');
                accordionButton.setAttribute('data-bs-target', `#playlist-collapse-${playlist.playlist_name.replace(/\s+/g, '-')}`);
                accordionButton.innerHTML = `<i class="bi bi-music-note-list"></i> ${playlist.playlist_name}`;
                accordionHeader.appendChild(accordionButton);
            
                const accordionCollapse = document.createElement('div');
                accordionCollapse.id = `playlist-collapse-${playlist.playlist_name.replace(/\s+/g, '-')}`;
                accordionCollapse.classList.add('accordion-collapse', 'collapse');
                accordionCollapse.setAttribute('data-bs-parent', '#playlist-accordion');
                accordionItem.appendChild(accordionCollapse);
            
                const accordionBody = document.createElement('div');
                accordionBody.classList.add('accordion-body');
                accordionCollapse.appendChild(accordionBody);
            
                if (playlist.songs.length === 1 && playlist.songs[0].song_name === "Playlist is empty") {
                    // Playlist is empty, display a message
                    const emptyMessage = document.createElement('span');
                    emptyMessage.textContent = "Playlist is empty";
                    emptyMessage.style.color = 'lightgray';
                    emptyMessage.style.marginLeft = '20px';
                    accordionBody.appendChild(emptyMessage);
                } else {
                    // Playlist has songs, display the numbered list
                    const playlistGroup = document.createElement('ol');
                    playlistGroup.classList.add('playlist-group', 'list-group', 'list-group-numbered');
                    accordionBody.appendChild(playlistGroup);

                    playlist.songs.forEach(song => {
                        const playlistGroupItem = document.createElement('li');
                        playlistGroupItem.classList.add('playlist-group-item', 'list-group-item');

                        // Display song name and band name
                        if (song.band_name) {
                            playlistGroupItem.innerHTML = `<span>${song.band_name} - ${song.song_name}</span><i class="playlist-remove-btn bi bi-dash-square" data-playlist-id="${playlist.playlist_id}" data-song-id="${song.song_id}"></i>`;
                        } else {
                            playlistGroupItem.innerHTML = `<span>${song.song_name}</span><i class="playlist-remove-btn bi bi-dash-square" data-playlist-id="${playlist.playlist_id}" data-song-id="${song.song_id}"></i>`;
                        }

                        playlistGroup.appendChild(playlistGroupItem);
                    });
                }
            });
            // Re-open the previously open playlist
            if (openPlaylistId) {
                const accordionToOpen = document.getElementById(openPlaylistId);
                if (accordionToOpen) {
                    accordionToOpen.classList.add('show');
                    const buttonToOpen = accordionToOpen.previousElementSibling.querySelector(".accordion-button");
                    buttonToOpen.classList.remove('collapsed');
                    buttonToOpen.setAttribute("aria-expanded", "true");
                }
            }
            removeSongListener();
        })
        .catch(error => console.error('Error fetching playlists:', error));
}

function removeSongListener() {
    const removeBtns = document.querySelectorAll('.playlist-remove-btn');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const playlistId = e.target.dataset.playlistId;
            const songId = e.target.dataset.songId;

            if (playlistId && songId) {
                removeSongFromPlaylist(playlistId, songId);
            }
        });
    });
}

function removeSongFromPlaylist(playlistId, songId) {
    fetch('/remove-song-from-playlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlist_id: playlistId, song_id: songId }),
    })
    .then(response => {
        if (response.ok) {
            reloadPlaylistsList();
        } else {
            console.error('Failed to remove song from playlist');
        }
    })
    .catch(error => console.error('Error removing song:', error));
}