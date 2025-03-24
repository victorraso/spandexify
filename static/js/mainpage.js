document.addEventListener('DOMContentLoaded', () => {

    /* SLIDE RESIZER */
    const lookup = document.getElementById('lookup');
    const favs = document.getElementById('favs-play-container');
    const handle = document.getElementById('handle');

    let isDragging = false;
    let startX;
    let startWidthLookup;
    let startWidthFavs;
    const minWidth = 40; // Minimum percentage width

    handle.addEventListener('mousedown', (x) => {
        isDragging = true;
        startX = x.clientX;

        // Get initial widths as percentages
        startWidthLookup = (lookup.offsetWidth / lookup.parentElement.offsetWidth) * 100;
        startWidthFavs = (favs.offsetWidth / favs.parentElement.offsetWidth) * 100;

        document.body.style.cursor = 'ew-resize';
    });

    document.addEventListener('mousemove', (x) => {
        if (isDragging) {
            const moveX = x.clientX - startX;

            // Calculate percentage change based on mouse movement
            const moveXPercent = (moveX / lookup.parentElement.offsetWidth) * 100;

            let newWidthLookup = startWidthLookup + moveXPercent;
            let newWidthFavs = startWidthFavs - moveXPercent;

            if (newWidthLookup < minWidth) {
            newWidthLookup = minWidth;
            newWidthFavs = 100 - minWidth; // Maintain 100% total width
            }
            if (newWidthFavs < minWidth) {
            newWidthFavs = minWidth;
            newWidthLookup = 100 - minWidth; // Maintain 100% total width
            }

            lookup.style.width = newWidthLookup + '%';
            favs.style.width = newWidthFavs + '%';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.cursor = 'default';
    });


    // AJAX Default Link
    const defaultLink = document.querySelector('.default-link');
    const defaultUrl = defaultLink.getAttribute('data-url');
    fetchLink(defaultUrl);
    fetchLink('/favorites', false, null, null, null);

    //listen to brand logo
    const navBrand = document.querySelector('.navbar-brand');
    navBrand.addEventListener('click', (e) => {
        e.preventDefault();
        fetchLink(defaultUrl);
    });
    
});


// Ajax fetchlink
function fetchLink(url, addToHistory = true, scrollValue, bandName, callback = null, searchData = null) {
    fetch(url)
        .then(response => response.text())
        .then(code => {

            const mainContent = document.getElementById('content');
            const favsPlayContent = document.getElementById('favs-play');

            if (url == '/band-alpha-list') {
                mainContent.innerHTML = code;
                kickstartAlphaList();
                
                if (scrollValue !== undefined) {
                    observeLoad(() => {
                        scrollPage(scrollValue);
                    });
                }
            } else if (url.includes('/albums')) {
                mainContent.innerHTML = code;
                kickstartAlbums(bandName);

                /* if (scrollValue !== undefined) {
                    observeLoad(() => {
                        scrollPage(scrollValue);
                    });
                } */

            } else if (url == '/biography') {
                mainContent.innerHTML = code;
                kickstartBio(bandName);

            } else if (url == '/favorites') {
                favsPlayContent.innerHTML = code;
                kickstartFavs();
            } else if (url == '/playlists') {
                favsPlayContent.innerHTML = code;
                kickstartPlaylists();
            } else if (url == '/search-results') {
                mainContent.innerHTML = code;
                kickstartSearchResults(searchData);
            }
            
            // adds ajax page to browser history
            if (addToHistory) {
                history.pushState(
                    { 
                        page: '/mainpage', 
                        ajaxSection: url, 
                        scrollPosition: scrollValue,
                        bandName: bandName,
                        searchData: searchData
                    }, '', '/mainpage');
            }

            if (callback) {
                observeLoad(callback);
            }

        })
        .catch(error => console.error('Error Loading Content:', error));
        
}

// Capture lookup scroll position
function captureLookUpScroll() {
    const lookup = document.getElementById('lookup');

    if (lookup) {
        return lookup.scrollTop;
    }
    return 0;
}

// Click browser back and forth arrows to call back history and not save page to history
window.onpopstate = function (event) {
    if (event.state) {
        fetchLink(event.state.ajaxSection, false, event.state.scrollPosition, event.state.bandName, null, event.state.searchData);
    }
};

// Mutation Observer to detect changes in the DOM
function observeLoad(callback) {
    const targetNode = document.getElementById('content');
    const config = { childList: true, subtree: true }; // set up to watch changes on this element
    
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Call the callback function
                callback();
                // Disconnect the observer once content is loaded
                observer.disconnect();
                break;
            }
        }
    });

    observer.observe(targetNode, config);
}


// scroll position
function scrollPage(scrollValue) {
        const lookup = document.getElementById('lookup');
        lookup.scrollTop = scrollValue;
}


// alphabet letters search
const searchLetters = document.querySelectorAll('.alpha-letters');
const headerLetters = document.querySelectorAll('.letter-title');

searchLetters.forEach((letter) => {
    letter.addEventListener('click', () =>{
        const clickedLetter = letter.textContent.trim();

        const albumPageIndentifier = document.querySelector('.albums-page-band-name');
        const bioPageIdentifier = document.getElementById('bio-page-container');

        if (albumPageIndentifier || bioPageIdentifier) {
            fetchLink('/band-alpha-list', true, null, null, () => {
                scrollToLetter(clickedLetter); // delay the execution of scrooltoletter by using an arrow function
            });
        } else {
            scrollToLetter(clickedLetter);
        }
    });
});

// scroll to letter on alpha list page
function scrollToLetter(letter) {
    const targetLetter = document.getElementById(`letter-${letter}`);
    if (targetLetter) {
        targetLetter.scrollIntoView({ behavior: 'smooth', block: 'start'});
    }
}


// Input Search
const inputField = document.querySelector('.deep-search input');
inputField.addEventListener('keyup', (event) => {
    const userQuery = inputField.value.trim();
    if (userQuery.length > 0 && (event.code === 'Space' || event.code === 'Enter')) {
        // Using ?query=... ensures that the query remains a parameter without confusing Flask. why encondeURI? URLs can only include certain characters. If the query contains special characters (like spaces, &, ?, /, etc.), they can break the URL or cause errors if not encoded properly.
        fetch(`/input-search?query=${encodeURIComponent(userQuery)}`)
            .then(response => response.json())
            .then(data => {
                fetchLink('/search-results', true, null, null, null, data);
            })
            .catch(error => console.error('Error fetching input search query:', error));      
    } else {
        return;
    }
});


// Favorites and Playlists Menus
const favsPlayContent = document.querySelector('.favs-play-content');
const favsBtn = document.querySelector('.favorites-btn');
const playlistsBtn = document.querySelector('.playlists-btn');

    favsBtn.addEventListener('click', () => {
        fetchLink('/favorites', false, null, null, null);
        fetchAndStoreFavoriteSongIds();
        fetchAndStoreFavoriteAlbumIds();
        fetchAndStoreFavoriteBandIds();
    });

    playlistsBtn.addEventListener('click', () => {
        fetchLink('/playlists', false, null, null, null);
    });


// Rating Stars
function rateStars(target) {
    const ratingStars = target.closest('.rating-stars');
    if (!ratingStars) return;

    const stars = ratingStars.querySelectorAll('i');
    const clickedStarIndex = Array.from(stars).indexOf(target);
    // ensures that we clicked on a star inside rating-stars
    if (clickedStarIndex !== -1) {
        stars.forEach((star, index) => {
            if (index <= clickedStarIndex) {
                star.classList.replace('bi-star', 'bi-star-fill');
            } else {
                star.classList.replace('bi-star-fill', 'bi-star');
            }
        });
    }
}


// open favorites and hide lookup content
const lookupContainer = document.querySelector('.lookup-container');
const favsContainer = document.querySelector('.favs-container');
const navFavBtn = document.getElementById('nav-fav-btn');
const navPlayBtn = document.getElementById('nav-play-btn');
const navBandsBtn = document.getElementById('nav-bands-btn');
const navBrandBtn = document.getElementById('nav-brand-btn');

const navbarCollapse = document.getElementById('navbarNavAltMarkup');

// listen to click on nav bar links
document.addEventListener('click', (event) => {
    // Get all navbar links
    const navLinks = document.querySelectorAll('.nav-link');
    const navBrand = document.querySelector('.navbar-brand');
    
    // Remove 'active' class from all links first
    if (event.target.classList.contains('nav-link') || event.target === navBrand) {
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
    }

    if (event.target === navFavBtn) {

        showFavs820();

        document.querySelector('#nav-fav-btn').classList.add('active');

        fetchLink('/favorites', false, null, null, null);
        fetchAndStoreFavoriteSongIds();
        fetchAndStoreFavoriteAlbumIds();
        fetchAndStoreFavoriteBandIds();

        closeHamburgerCollapse();

    } else if (event.target === navPlayBtn) {

        showFavs820();

        document.querySelector('#nav-play-btn').classList.add('active');

        fetchLink('/playlists', false, null, null, null);

        closeHamburgerCollapse();

    } else if (event.target === navBandsBtn) {
        
        showLookUp820();

        document.querySelector('#nav-bands-btn').classList.add('active');

        fetchLink('/band-alpha-list', false, null, null, null);

        closeHamburgerCollapse();

    } else if (event.target === navBrandBtn) {
        document.querySelector('#nav-bands-btn').classList.add('active');

        fetchLink('/band-alpha-list', false, null, null, null);

        closeHamburgerCollapse();
    }
});

// show favs on screen < 820
function showFavs820() {
    lookupContainer.style.display = 'none';
    favsContainer.style.display = 'block';
    favsContainer.style.width = '100%';
}

// show lookup
function showLookUp820() {
    lookupContainer.style.display = 'block';
    lookupContainer.style.width = '100%';
    favsContainer.style.display = 'none';
}

// make scroll to band work at mobile screen size
function run820BandScroll(bandId) {

    showLookUp820();

    document.querySelector('#nav-fav-btn').classList.remove('active');

    fetchLink('/band-alpha-list', false, null, null, () => {
        scrollToBand(bandId); // delay the execution
    });

    closeHamburgerCollapse();
}

// make scroll to album work at mobile screen size
function run820AlbumScroll(albumId, bandName) {
     
    showLookUp820();

    document.querySelector('#nav-fav-btn').classList.remove('active');

    fetchLink('/albums', true, null, bandName, () => {
        showAndScrollTo(null, albumId, bandName);
    });  

    closeHamburgerCollapse();
}

// make scroll to song work at mobile screen size
function run820SongScroll(songId, albumId, bandName) {
     
    showLookUp820();

    document.querySelector('#nav-fav-btn').classList.remove('active');

    fetchLink('/albums', true, null, bandName, () => {
        showAndScrollTo(songId, albumId, bandName);
    });

    closeHamburgerCollapse();
}

// close dropdown from navbar after link click
function closeHamburgerCollapse() {
    const bootstrapCollapse = new bootstrap.Collapse(navbarCollapse, {
        toggle: false
    });
    bootstrapCollapse.hide();
}
