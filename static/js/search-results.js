function kickstartSearchResults(data) {

    setTimeout(() => {
        const searchResultsContainer = document.getElementById('search-results-container');

        searchResultsContainer.innerHTML = '';
        
        if (data.bands.length > 0) {
            const bandsResults = document.createElement('div');
            bandsResults.classList.add('bands-results');
            searchResultsContainer.appendChild(bandsResults);
    
            const bandsTitle = document.createElement('h1');
            bandsTitle.classList.add('bands-results-title');
            bandsTitle.textContent = 'Bands';
            bandsResults.appendChild(bandsTitle);

            const crossLine = document.createElement('hr');
            crossLine.classList.add('horizontal-line');
            bandsResults.appendChild(crossLine);

            const bandsContent = document.createElement('div');
            bandsContent.classList.add('bands-results-content');
            bandsResults.appendChild(bandsContent);

            const bandsUl = document.createElement('ul');
            bandsContent.appendChild(bandsUl);

            data.bands.forEach(band => {
                const bandsUlLi = document.createElement('li');
                bandsUl.appendChild(bandsUlLi);
    
                const bandsUlLiSpan = document.createElement('span');
                bandsUlLiSpan.classList.add('text-uppercase');
                bandsUlLiSpan.style.color = 'orange';
                bandsUlLiSpan.textContent = `${band.name}`;
                bandsUlLi.appendChild(bandsUlLiSpan);

                bandsUlLiSpan.addEventListener('click', () => {
                    fetchLink('/band-alpha-list', true, null, null, () => {
                        scrollToBand(band.id);
                    });
                });
                
            });

        } 
        
        if (data.albums.length > 0) {
            const albumsResults = document.createElement('div');
            albumsResults.classList.add('albums-results');
            searchResultsContainer.appendChild(albumsResults);
    
            const albumsTitle = document.createElement('h1');
            albumsTitle.classList.add('albums-results-title');
            albumsTitle.textContent = 'Albums';
            albumsResults.appendChild(albumsTitle);

            const crossLine = document.createElement('hr');
            crossLine.classList.add('horizontal-line');
            albumsResults.appendChild(crossLine);

            const albumsContent = document.createElement('div');
            albumsContent.classList.add('albums-results-content');
            albumsResults.appendChild(albumsContent);

            const albumsUl = document.createElement('ul');
            albumsContent.appendChild(albumsUl);

            data.albums.forEach(album => {
                const albumsUlLi = document.createElement('li');
                albumsUl.appendChild(albumsUlLi);

                const albumsUlLiSpan = document.createElement('span');
                albumsUlLiSpan.classList.add('text-uppercase');
                albumsUlLiSpan.style.color = 'orange';
                albumsUlLiSpan.style.marginRight = '5px';
                albumsUlLiSpan.textContent = `${album.album_name}`;
                albumsUlLi.appendChild(albumsUlLiSpan);

                const albumsBandName = document.createElement('span');
                albumsBandName.classList.add('text-capitalize');
                albumsBandName.style.color = 'lightgray';
                albumsBandName.style.textDecoration = 'none';
                albumsBandName.style.cursor = 'default';
                albumsBandName.textContent = `(${album.band_name})`;
                albumsUlLi.appendChild(albumsBandName);

                albumsUlLiSpan.addEventListener('click', () => {
                    fetchLink('/albums', true, null, album.band_name, () => {
                        showAndScrollTo(null, album.id, album.band_name);
                    });
                });
                
            });

        }

        if (data.songs.length > 0) {
            const songsResults = document.createElement('div');
            songsResults.classList.add('songs-results');
            searchResultsContainer.appendChild(songsResults);
    
            const songsTitle = document.createElement('h1');
            songsTitle.classList.add('songs-results-title');
            songsTitle.textContent = 'Songs';
            songsResults.appendChild(songsTitle);

            const crossLine = document.createElement('hr');
            crossLine.classList.add('horizontal-line');
            songsResults.appendChild(crossLine);

            const songsContent = document.createElement('div');
            songsContent.classList.add('songs-results-content');
            songsResults.appendChild(songsContent);

            const songsUl = document.createElement('ul');
            songsContent.appendChild(songsUl);

            data.songs.forEach(song => {
                const songsUlLi = document.createElement('li');
                songsUl.appendChild(songsUlLi);
    
                const songsUlLiSpan = document.createElement('span');
                songsUlLiSpan.classList.add('text-uppercase');
                songsUlLiSpan.style.color = 'orange';
                songsUlLiSpan.style.marginRight = '5px';
                songsUlLiSpan.textContent = `${song.song_name}`;
                songsUlLi.appendChild(songsUlLiSpan);

                const songsBandName = document.createElement('span');
                songsBandName.classList.add('text-capitalize');
                songsBandName.style.color = 'lightgray';
                songsBandName.style.textDecoration = 'none';
                songsBandName.style.cursor = 'default';
                songsBandName.textContent = `(${song.band_name})`;
                songsUlLi.appendChild(songsBandName);

                songsUlLiSpan.addEventListener('click', () => {
                    fetchLink('/albums', true, null, song.band_name, () => {
                        showAndScrollTo(song.id, song.album_id, song.band_name);
                    });
                });
                
            });

        }
        
        if (data.bands.length === 0 && data.albums.length === 0 && data.songs.length === 0) {
            const noResults = document.createElement('span');
            noResults.classList.add('no-results');
            noResults.textContent = 'Sorry, nothing matched your search.'
            searchResultsContainer.appendChild(noResults);
        }
    }, 500);
    
    

}