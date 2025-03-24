function kickstartBio(bandName) {
    fetch(`/bio-data/${bandName}`)
        .then(response => response.json())
        .then(data => {

            const bioPageContainer = document.getElementById('bio-page-container');

            // Create Bio Page Header
            const bioPageHeader = document.createElement('div');
            bioPageHeader.classList.add('bio-page-header');
            bioPageContainer.appendChild(bioPageHeader);

            const bioPageLogo = document.createElement('div');
            bioPageLogo.classList.add('bio-page-logo');
            bioPageHeader.appendChild(bioPageLogo);

            const logoImg = document.createElement('img');
            logoImg.src = '../static/images/logos/' + data.band_logo;
            logoImg.alt = 'Band Logo';
            bioPageLogo.appendChild(logoImg);

            // Create Members Section
            const bioPageMembers = document.createElement('div');
            bioPageMembers.classList.add('bio-page-members');
            bioPageHeader.appendChild(bioPageMembers);

            const membersTop = document.createElement('div');
            membersTop.classList.add('members-top');
            bioPageMembers.appendChild(membersTop);

            const membersTitle = document.createElement('span');
            membersTitle.classList.add('members-title');
            membersTitle.textContent = 'Band Members';
            membersTop.appendChild(membersTitle);

            const membersBottom = document.createElement('div');
            membersBottom.classList.add('members-bottom');
            bioPageMembers.appendChild(membersBottom);

            data.members.forEach(member => {
                const membersMember = document.createElement('div');
                membersMember.classList.add('members-member');
                membersBottom.appendChild(membersMember);

                const memberName = document.createElement('div');
                memberName.classList.add('member-name');
                memberName.textContent = member.name;
                membersMember.appendChild(memberName);

                const memberInstrument = document.createElement('div');
                memberInstrument.classList.add('member-instrument', 'text-capitalize');
                memberInstrument.innerHTML = member.instrument;
                membersMember.appendChild(memberInstrument);
            });

            const horizontalLine = document.createElement('hr');
            horizontalLine.classList.add('horizontal-line', 'bio-line');
            bioPageContainer.appendChild(horizontalLine);

            // Create Biography Section
            const bioPageBioContainer = document.createElement('div');
            bioPageBioContainer.classList.add('bio-page-bio-container');
            bioPageContainer.appendChild(bioPageBioContainer);

            const bioPageBioTitle = document.createElement('span');
            bioPageBioTitle.classList.add('bio-page-bio-title');
            bioPageBioTitle.textContent = 'Biography';
            bioPageBioContainer.appendChild(bioPageBioTitle);

            const bioPageBioText = document.createElement('div');
            bioPageBioText.classList.add('bio-page-bio-text');
            bioPageBioText.innerHTML = data.bio.replace(/\n\s*\n/g, '</p><p>').replace(/\n/g, '<br>');  
            bioPageBioText.innerHTML = `<p>${bioPageBioText.innerHTML}</p>`; 
            bioPageBioContainer.appendChild(bioPageBioText);

        })
        .catch(error => console.error('Error Fetching Bio Page Data', error));
}