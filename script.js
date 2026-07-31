let allHomestaysData = [];
let activeHomestays = []; 

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWXIyW8Zk4YXmIK4Bl1g2cMIIWBEOaaIrfSM2zaWsTr63lmc0Td8lDm2kY11Ap2w/pub?gid=942226858&single=true&output=csv';

// ==========================================
// 1. FETCH & PARSE GOOGLE SHEET CSV DATA
// ==========================================
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).map(line => {
        // Advanced parser that handles commas inside quotes OR safely splits standard columns
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // Push the last value

        const entry = {};

        headers.forEach((header, index) => {
            let val = values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';

            // Convert numeric fields
            if (header === 'id' || header === 'price' || header === 'rating') {
                val = Number(val) || 0;
            }

            // Convert comma-separated tags into arrays (for amenities and scenery)
            if (header === 'amenities' || header === 'scenery') {
                val = val ? val.split(',').map(item => item.trim()) : [];
            }

            entry[header] = val;
        });

        return entry;
    });
}
/*function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).map(line => {
        // Regex to handle values inside quotes properly
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const entry = {};

        headers.forEach((header, index) => {
            let val = values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';

            // Convert numeric fields
            if (header === 'id' || header === 'price' || header === 'rating') {
                val = Number(val) || 0;
            }

            // Convert comma-separated tags into arrays
            if (header === 'amenities' || header === 'scenery') {
                val = val ? val.split(',').map(item => item.trim()) : [];
            }

            entry[header] = val;
        });

        return entry;
    });
}*/

async function loadHomestayData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error('Failed to fetch Google Sheet CSV data.');
        
        const csvData = await response.text();
        
        // Save parsed data to allHomestaysData
        allHomestaysData = parseCSV(csvData);
        
        // Start the application
        initializeApp();
    } catch (error) {
        console.error("Error loading data from Google Sheets:", error);
        document.getElementById('homestayGrid').innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: #dc2626; margin-bottom: 1rem;"></i><br/>
                Failed to load homestay data. Please check your internet connection or Google Sheet link.
            </div>`;
    }
}

// Call load when DOM is ready
document.addEventListener('DOMContentLoaded', loadHomestayData);

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

    if (navigator.share) {
        try {
            await navigator.share({
                title: name,
                text: `Check out ${name} in ${location || 'Darjeeling'}!`,
                url: shareUrl,
            });
        } catch (error) {
            console.log('Sharing cancelled or failed', error);
        }
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`Direct link for "${name}" copied to clipboard!`);
        });
    }
}

// ==========================================
// 3. LOGIC: EQUAL CHANCE ROTATION
// ==========================================
function initializeRotation() {
    const BATCH_SIZE = 3; 
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
    const locations = [...new Set(activeHomestays.map(item => item.location))].filter(Boolean).sort();
    const sceneries = [...new Set(activeHomestays.flatMap(item => item.scenery || []))].filter(Boolean).sort();

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
        const tagsHtml = stay.scenery && stay.scenery.length > 0
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
/*function openProfile(id) {
    const stay = allHomestaysData.find(s => s.id === id);
    if (!stay) return;

    let buttonsHtml = '';
    if (stay.phone) buttonsHtml += `<a href="tel:${stay.phone}" class="btn btn-call"><i class="fa-solid fa-phone"></i></a>`;
    if (stay.whatsapp) buttonsHtml += `<a href="https://wa.me/${stay.whatsapp}" target="_blank" class="btn btn-wa"><i class="fa-brands fa-whatsapp"></i></a>`;
    
    // Support both mapLink or googleMap column headers from Google Sheet
    const mapUrl = stay.mapLink || stay.googleMap;
    if (mapUrl) buttonsHtml += `<a href="${mapUrl}" target="_blank" class="btn btn-map"><i class="fa-solid fa-map-location-dot"></i></a>`;
    
    if (stay.website) buttonsHtml += `<a href="${stay.website}" target="_blank" class="btn btn-web"><i class="fa-solid fa-globe"></i></a>`;
    if (stay.facebook) buttonsHtml += `<a href="${stay.facebook}" target="_blank" class="btn btn-fb"><i class="fa-brands fa-facebook"></i></a>`;
    if (stay.instagram) buttonsHtml += `<a href="${stay.instagram}" target="_blank" class="btn btn-ig"><i class="fa-brands fa-instagram"></i></a>`;
    if (stay.youtube) buttonsHtml += `<a href="${stay.youtube}" target="_blank" class="btn btn-yt"><i class="fa-brands fa-youtube"></i></a>`;
    
    buttonsHtml += `<button class="btn btn-share" onclick="shareHomestay(${stay.id}, '${stay.name}', '${stay.location}')"><i class="fa-solid fa-share-nodes"></i> Share Stay</button>`;

    const sceneryTags = stay.scenery && stay.scenery.length > 0 ? stay.scenery.map(s => `<span class="tag"><i class="fa-solid fa-mountain-sun"></i> ${s}</span>`).join('') : '';
    const amenityTags = stay.amenities && stay.amenities.length > 0 ? stay.amenities.map(a => `<span class="tag tag-amenity"><i class="fa-solid fa-circle-check"></i> ${a}</span>`).join('') : '';

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
            <p class="profile-desc">${stay.description || 'No description provided.'}</p>

            <div class="profile-section-title">Connect & Reserve</div>
            <div class="profile-actions">
                ${buttonsHtml}
            </div>
        </div>
    `;

    document.getElementById('main-view').classList.add('hidden');
    document.getElementById('profile-view').classList.remove('hidden');
    window.scrollTo(0, 0); 
}*/
/*function openProfile(id) {
    const stay = allHomestaysData.find(s => s.id === id);
    if (!stay) return;

    let buttonsHtml = '';
    if (stay.phone) buttonsHtml += `<a href="tel:${stay.phone}" class="btn btn-call"><i class="fa-solid fa-phone"></i></a>`;
    if (stay.whatsapp) buttonsHtml += `<a href="https://wa.me/${stay.whatsapp}" target="_blank" class="btn btn-wa"><i class="fa-brands fa-whatsapp"></i></a>`;
    
    const mapUrl = stay.mapLink || stay.googleMap;
    if (mapUrl) buttonsHtml += `<a href="${mapUrl}" target="_blank" class="btn btn-map"><i class="fa-solid fa-map-location-dot"></i></a>`;
    
    if (stay.website) buttonsHtml += `<a href="${stay.website}" target="_blank" class="btn btn-web"><i class="fa-solid fa-globe"></i></a>`;
    if (stay.facebook) buttonsHtml += `<a href="${stay.facebook}" target="_blank" class="btn btn-fb"><i class="fa-brands fa-facebook"></i></a>`;
    if (stay.instagram) buttonsHtml += `<a href="${stay.instagram}" target="_blank" class="btn btn-ig"><i class="fa-brands fa-instagram"></i></a>`;
    if (stay.youtube) buttonsHtml += `<a href="${stay.youtube}" target="_blank" class="btn btn-yt"><i class="fa-brands fa-youtube"></i></a>`;
    
    buttonsHtml += `<button class="btn btn-share" onclick="shareHomestay(${stay.id}, '${stay.name}', '${stay.location}')"><i class="fa-solid fa-share-nodes"></i> Share Stay</button>`;

    const hasScenery = stay.scenery && stay.scenery.length > 0;
    const hasAmenities = stay.amenities && stay.amenities.length > 0;

    const combinedFeaturesHtml = (hasScenery || hasAmenities) ? `
        <div class="feature-card">
            <div class="feature-card-badge"><i class="fa-solid fa-star"></i> Overview</div>
            <h3>Property Features</h3>
            
            ${hasScenery ? `
                <div style="margin-bottom: ${hasAmenities ? '1.5rem' : '0'};">
                    <p style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--accent); margin-bottom: 0.5rem; letter-spacing: 0.05em;"><i class="fa-solid fa-mountain-sun"></i> Surrounding Landscapes</p>
                    <div class="tags">
                        ${stay.scenery.map(s => `<span class="tag"><i class="fa-solid fa-mountain-sun"></i> ${s}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${hasAmenities ? `
                <div>
                    <p style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--accent); margin-bottom: 0.5rem; letter-spacing: 0.05em;"><i class="fa-solid fa-circle-check"></i> Amenities & Comforts</p>
                    <div class="tags">
                        ${stay.amenities.map(a => `<span class="tag tag-amenity"><i class="fa-solid fa-circle-check"></i> ${a}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    ` : '';

    document.getElementById('profileContainer').innerHTML = `
        <div class="profile-card">
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
                
                ${combinedFeaturesHtml}
                
                <div class="profile-section-title">About this Homestay</div>
                <p class="profile-desc">${stay.description || 'No description provided.'}</p>

                <div class="profile-section-title">Connect & Reserve</div>
                <div class="profile-actions">
                    ${buttonsHtml}
                </div>
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
}*/


function openProfile(id) {
    const stay = allHomestaysData.find(s => s.id === id);
    if (!stay) return;

    // Build buttons HTML
    let buttonsHtml = '';
    if (stay.phone) buttonsHtml += `<a href="tel:${stay.phone}" class="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition shadow-md">Book Stay</a>`;
    if (stay.whatsapp) buttonsHtml += `<a href="https://wa.me/${stay.whatsapp}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-full text-sm font-semibold transition shadow-sm flex items-center gap-2">WhatsApp</a>`;

    const mapUrl = stay.mapLink || stay.googleMap;
    const mapButtonHtml = mapUrl ? `<a href="${mapUrl}" target="_blank" class="inline-flex items-center gap-2 bg-slate-900 hover:bg-brand-700 text-white px-6 py-3 rounded-full text-sm font-semibold transition shadow-md">Open in Google Maps</a>` : '';

    // Generate Scenery tags
    const sceneryHtml = stay.scenery && stay.scenery.length > 0 
        ? stay.scenery.map(s => `<span class="bg-white/10 text-emerald-100 border border-white/15 px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1.5">${s}</span>`).join('')
        : `<span class="text-slate-400 text-sm">No scenery details specified.</span>`;

    // Generate Amenities tags
    const amenitiesHtml = stay.amenities && stay.amenities.length > 0 
        ? stay.amenities.map(a => `<span class="bg-white/10 text-emerald-100 border border-white/15 px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1.5">${a}</span>`).join('')
        : `<span class="text-slate-400 text-sm">No amenities specified.</span>`;

    // Inject the layout template into your profile container
    document.getElementById('profileContainer').innerHTML = `
        <div class="bg-brand-50 text-slate-800 font-sans antialiased">
            <!-- Header Bar with Back Button -->
            <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-brand-100">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <button onclick="closeProfile()" class="font-serif text-xl font-bold tracking-tight text-brand-700 flex items-center gap-2 hover:text-brand-600 transition">
                        &larr; Back to Listings
                    </button>
                    <div class="flex items-center gap-4">
                        ${stay.whatsapp ? `<a href="https://wa.me/${stay.whatsapp}" target="_blank" class="hidden sm:inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-full text-sm font-semibold transition">WhatsApp</a>` : ''}
                        ${stay.phone ? `<a href="tel:${stay.phone}" class="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition">Book Stay</a>` : ''}
                    </div>
                </div>
            </header>

            <!-- Hero Section -->
            <section class="relative min-h-[75vh] flex items-center justify-center bg-slate-900 overflow-hidden">
                <div class="absolute inset-0 z-0">
                    <img src="${stay.image}" alt="${stay.name}" class="w-full h-full object-cover object-center opacity-75">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
                </div>
                <div class="relative z-10 max-w-5xl mx-auto px-4 text-center text-white py-20">
                    <span class="inline-block py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-6 text-brand-100">
                        Exclusive Mountain Retreat
                    </span>
                    <h1 class="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                        ${stay.name}
                    </h1>
                    <p class="text-lg sm:text-xl text-slate-200 max-w-2xl mx-auto font-light mb-10 leading-relaxed">
                        ${stay.description || 'Disconnect from the chaos and immerse yourself in pristine nature, luxurious cozy living, and unmatched hospitality.'}
                    </p>
                </div>
            </section>

            <!-- Quick Details Bar -->
            <section class="bg-white border-b border-brand-100 py-6">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                    <div class="border-r last:border-none border-slate-100">
                        <span class="block text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Starting Price</span>
                        <span class="text-2xl font-bold font-serif text-brand-700">₹${stay.price} <span class="text-sm font-sans font-normal text-slate-500">/ night</span></span>
                    </div>
                    <div class="border-r last:border-none border-slate-100">
                        <span class="block text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Location</span>
                        <span class="text-lg font-bold text-slate-700 truncate">${stay.location}</span>
                    </div>
                    <div>
                        <span class="block text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Guest Rating</span>
                        <span class="text-lg font-bold text-amber-500">&#9733; 4.9 / 5.0</span>
                    </div>
                </div>
            </section>

            <!-- About Section -->
            <section class="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div class="space-y-6">
                        <span class="text-brand-600 font-semibold uppercase tracking-wider text-sm">Welcome Home</span>
                        <h2 class="font-serif text-3xl sm:text-4xl font-bold text-slate-900 leading-snug">
                            A Peaceful Escape Crafted for Unforgettable Memories
                        </h2>
                        <p class="text-slate-600 leading-relaxed text-lg">
                            ${stay.description || 'Nestled right against the rolling green foothills, this property combines rustic charm with modern luxury.'}
                        </p>
                    </div>
                    <div>
                        <img src="${stay.image}" alt="${stay.name}" class="rounded-2xl shadow-lg w-full h-80 object-cover">
                    </div>
                </div>
            </section>

            <!-- Combined Scenery & Amenities Dark Theme Cards -->
            <section class="bg-brand-800 text-white py-20">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center max-w-2xl mx-auto mb-16">
                        <span class="text-amber-400 font-semibold uppercase tracking-wider text-sm">Property Features</span>
                        <h2 class="font-serif text-3xl sm:text-4xl font-bold mt-2">Scenery & Amenities</h2>
                        <p class="text-slate-300 mt-3">Everything you need for a comfortable, seamless, and scenic getaway.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Scenery Card -->
                        <div class="bg-[#0b1c14] border border-[#1c3529] rounded-2xl p-8 shadow-xl">
                            <div class="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                Landscapes
                            </div>
                            <h3 class="font-serif text-2xl font-semibold mb-4 text-white">Surrounding Scenery</h3>
                            <div class="flex flex-wrap gap-2">
                                ${sceneryHtml}
                            </div>
                        </div>

                        <!-- Amenities Card -->
                        <div class="bg-[#0b1c14] border border-[#1c3529] rounded-2xl p-8 shadow-xl">
                            <div class="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                Comforts
                            </div>
                            <h3 class="font-serif text-2xl font-semibold mb-4 text-white">Amenities & Facilities</h3>
                            <div class="flex flex-wrap gap-2">
                                ${amenitiesHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Location Section -->
            <section class="bg-white py-20 border-t border-brand-100">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div class="space-y-6">
                            <span class="text-brand-600 font-semibold uppercase tracking-wider text-sm">Find Us</span>
                            <h2 class="font-serif text-3xl sm:text-4xl font-bold text-slate-900">
                                Easily Accessible, Perfectly Secluded
                            </h2>
                            <p class="text-slate-600 leading-relaxed">
                                Located in ${stay.location}. Detailed driving instructions and private transfer options are provided upon booking confirmation.
                            </p>
                            <div>
                                ${mapButtonHtml}
                            </div>
                        </div>
                        <div class="h-96 rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                            <div class="text-slate-400 font-medium">Map Location View</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;

    document.getElementById('main-view').classList.add('hidden');
    document.getElementById('profile-view').classList.remove('hidden');
    window.scrollTo(0, 0); 
}

function closeProfile() {
    document.getElementById('profile-view').classList.add('hidden');
    document.getElementById('main-view').classList.remove('hidden');
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

        return matchesSearch && matchesLoc /*&& matchesScene*/ && matchesPrice;
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
    
    // Check deep linking (?id=X)
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
