let allHomestaysData = [];
let activeHomestays = []; 

// ==========================================
// 1. FETCH JSON DATA FROM EXTERNAL FILE
// ==========================================
async function loadHomestaysData() {
    try {
        const response = await fetch('homestays.json');
        if (!response.ok) throw new Error('Failed to load homestay data.');
        
        allHomestaysData = await response.json();
        initializeApp();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('homestayGrid').innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: #dc2626; margin-bottom: 1rem;"></i><br/>
                Failed to load homestay data. Please use a local server (e.g., VS Code Live Server).
            </div>`;
    }
}

// ==========================================
// 2. LOGIC: THEME TOGGLE & SHARE
// ==========================================
function toggleTheme() {
    const body = document.body;
    const btn = document.querySelector('.theme-toggle');
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>Light Mode</span>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>';
    }
}

async function shareHomestay(id, name, location) {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?id=${id}`;

    // Check if the browser supports the native device share menu (Mobile & Modern Browsers)
    if (navigator.share) {
        try {
            await navigator.share({
                title: name,
                text: `Check out ${name} in ${location}!`,
                url: shareUrl,
            });
        } catch (error) {
            // User cancelled or share failed
            console.log('Sharing cancelled or failed', error);
        }
    } else {
        // Fallback for older desktop browsers that don't support native sharing
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`Direct link for "${name}" copied to clipboard!`);
        });
    }
}

// ==========================================
// 3. LOGIC: EQUAL CHANCE ROTATION
// ==========================================
function initializeRotation() {
    const BATCH_SIZE = 10; 
    let unshownIds = JSON.parse(sessionStorage.getItem('unshownHomestays'));

    if (!unshownIds || unshownIds.length === 0) {
        const allIds = allHomestaysData.map(h => h.id);
        unshownIds = allIds.sort(() => 0.5 - Math.random());
    }

    const currentBatchIds = unshownIds.splice(0, BATCH_SIZE);
    sessionStorage.setItem('unshownHomestays', JSON.stringify(unshownIds));
    activeHomestays = allHomestaysData.filter(h => currentBatchIds.includes(h.id));
}

// ==========================================
// 4. DOM & RENDERING
// ==========================================
const grid = document.getElementById('homestayGrid');
const searchInput = document.getElementById('searchInput');
const locationFilter = document.getElementById('locationFilter');
const sceneFilter = document.getElementById('sceneFilter');
const priceFilter = document.getElementById('priceFilter');
const priceDisplay = document.getElementById('priceDisplay');

function setupDropdowns() {
    const locations = [...new Set(activeHomestays.map(item => item.location))].sort();
    const sceneries = [...new Set(activeHomestays.flatMap(item => item.scenery))].sort();

    locations.forEach(loc => locationFilter.appendChild(new Option(loc, loc)));
    sceneries.forEach(sc => sceneFilter.appendChild(new Option(sc, sc)));
}

function renderCards(data) {
    grid.innerHTML = '';
    if (data.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 1rem;"></i><br/>
                No homestays match your search criteria. Try adjusting your filters.
            </div>`;
        return;
    }

    data.forEach(stay => {
        const tagsHtml = stay.scenery 
            ? stay.scenery.map(s => `<span class="tag"><i class="fa-solid fa-mountain-sun"></i> ${s}</span>`).join('') 
            : '';
        
        grid.innerHTML += `
            <div class="card">
                <div class="card-img-wrapper">
                    <img src="${stay.image}" alt="${stay.name}" class="card-img" />
                    <span class="badge-location">
                        <i class="fa-solid fa-location-dot"></i> ${stay.location}
                    </span>
                    <span class="badge-price">
                        ₹${stay.price} <span>/ night</span>
                    </span>
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h2>${stay.name}</h2>
                    </div>
                    <div class="tags">${tagsHtml}</div>
                    <button class="btn btn-primary" onclick="openProfile(${stay.id})">
                        Explore Stay <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 5. PROFILE PAGE SPA NAVIGATION
// ==========================================
function openProfile(id) {
    const stay = allHomestaysData.find(s => s.id === id);
    if (!stay) return;

    let buttonsHtml = '';
    if (stay.phone) buttonsHtml += `<a href="tel:${stay.phone}" class="btn btn-call"><i class="fa-solid fa-phone"></i></a>`;
    if (stay.whatsapp) buttonsHtml += `<a href="https://wa.me/${stay.whatsapp}" target="_blank" class="btn btn-wa"><i class="fa-brands fa-whatsapp"></i></a>`;
    if (stay.googleMap) buttonsHtml += `<a href="${stay.googleMap}" target="_blank" class="btn btn-map"><i class="fa-solid fa-map-location-dot"></i></a>`;
    if (stay.website) buttonsHtml += `<a href="${stay.website}" target="_blank" class="btn btn-web"><i class="fa-solid fa-globe"></i></a>`;
    if (stay.facebook) buttonsHtml += `<a href="${stay.facebook}" target="_blank" class="btn btn-fb"><i class="fa-brands fa-facebook"></i></a>`;
    if (stay.instagram) buttonsHtml += `<a href="${stay.instagram}" target="_blank" class="btn btn-ig"><i class="fa-brands fa-instagram"></i></a>`;
    if (stay.youtube) buttonsHtml += `<a href="${stay.youtube}" target="_blank" class="btn btn-yt"><i class="fa-brands fa-youtube"></i></a>`;
    
    buttonsHtml += `<button class="btn btn-share" onclick="shareHomestay(${stay.id}, '${stay.name}')"><i class="fa-solid fa-share-nodes"></i> Share Stay</button>`;

    const sceneryTags = stay.scenery ? stay.scenery.map(s => `<span class="tag"><i class="fa-solid fa-mountain-sun"></i> ${s}</span>`).join('') : '';
    const amenityTags = stay.amenities ? stay.amenities.map(a => `<span class="tag tag-amenity"><i class="fa-solid fa-circle-check"></i> ${a}</span>`).join('') : '';

    document.getElementById('profileContainer').innerHTML = `
        <img src="${stay.image}" alt="${stay.name}" class="profile-hero" />
        <div class="profile-body">
            <div class="profile-header">
                <div class="profile-title">
                    <h2>${stay.name}</h2>
                    <div class="profile-location"><i class="fa-solid fa-location-dot"></i> ${stay.location}</div>
                </div>
                <div class="profile-price">
                    ₹${stay.price} <span>per night</span>
                </div>
            </div>
            
            <div class="profile-section-title">Highlights & Amenities</div>
            <div class="tags" style="margin-bottom: 2rem;">${sceneryTags} ${amenityTags}</div>
            
            <div class="profile-section-title">About this Homestay</div>
            <p class="profile-desc">${stay.description}</p>

            <div class="profile-section-title">Connect & Reserve</div>
            <div class="profile-actions">
                ${buttonsHtml}
            </div>
        </div>
    `;

    document.getElementById('main-view').classList.add('hidden');
    document.getElementById('profile-view').classList.remove('hidden');
    window.scrollTo(0, 0); 
}

function closeProfile() {
    document.getElementById('profile-view').classList.add('hidden');
    document.getElementById('main-view').classList.remove('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
    window.scrollTo(0, 0);
}

// ==========================================
// 6. FILTER LOGIC
// ==========================================
function filterData() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedLoc = locationFilter.value;
    const selectedScene = sceneFilter.value;
    const maxPrice = parseInt(priceFilter.value) || 5000;

    priceDisplay.textContent = `₹${maxPrice}`;

    const filtered = activeHomestays.filter(stay => {
        const matchesSearch = stay.name.toLowerCase().includes(searchText) || 
                              stay.location.toLowerCase().includes(searchText);
        const matchesLoc = selectedLoc === 'all' || stay.location === selectedLoc;
        const matchesScene = selectedScene === 'all' || (stay.scenery && stay.scenery.includes(selectedScene));
        const matchesPrice = stay.price <= maxPrice;

        return matchesSearch && matchesLoc && matchesScene && matchesPrice;
    });

    renderCards(filtered);
}

// ==========================================
// 7. INITIALIZE APP AFTER DATA FETCH
// ==========================================
function initializeApp() {
    initializeRotation();
    setupDropdowns();
    renderCards(activeHomestays);
    
    // Check if URL has a shared homestay ID (e.g. ?id=2)
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = parseInt(urlParams.get('id'));
    
    if (sharedId) {
        openProfile(sharedId);
    }
    
    searchInput.addEventListener('input', filterData);
    locationFilter.addEventListener('change', filterData);
    sceneFilter.addEventListener('change', filterData);
    priceFilter.addEventListener('input', filterData);
}

loadHomestaysData();
        
