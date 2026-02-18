document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const form = document.getElementById('add-form');
    const placeNameInput = document.getElementById('place-name');
    const placeUrlInput = document.getElementById('place-url');
    const placeDayInput = document.getElementById('place-day');
    const placeMemoInput = document.getElementById('place-memo');
    const cardList = document.getElementById('card-list');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const dayTabsContainer = document.getElementById('day-tabs');

    // New UI Elements
    const tripTitleInput = document.getElementById('trip-title');
    const tripDurationSelect = document.getElementById('trip-duration');
    const searchInput = document.getElementById('search-input');

    // Archive & Footer Elements
    const archiveSection = document.getElementById('archive-section');
    const archiveList = document.getElementById('archive-list');
    const backToCurrentBtn = document.getElementById('back-to-current-btn');
    const archiveBtn = document.getElementById('archive-btn');
    const viewArchivesBtn = document.getElementById('view-archives-btn');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');

    // --- State Management ---
    let gajaTrips = [];
    let currentTripId = null;
    let currentFilter = 'all';
    let currentSearch = '';

    // --- Initialization & Migration ---
    initApp();

    function initApp() {
        // 1. Load Data
        const savedTrips = localStorage.getItem('gajaTrips');
        const savedCurrentId = localStorage.getItem('gajaCurrentTripId');
        const oldData = localStorage.getItem('pilgrimagePlaces');

        if (savedTrips) {
            gajaTrips = JSON.parse(savedTrips);
            currentTripId = savedCurrentId ? parseInt(savedCurrentId) : (gajaTrips[0]?.id || null);
        } else if (oldData) {
            // == MIGRATION: Convert old data to new structure ==
            const oldItems = JSON.parse(oldData);
            const newTrip = createNewTripObject("My First Trip 🇰🇷", 7, oldItems);
            gajaTrips = [newTrip];
            currentTripId = newTrip.id;
            saveAllData();
            // Optional: Remove old data after successful migration, but keeping it for safety is okay too.
        } else {
            // New User: Create first trip
            const newTrip = createNewTripObject("My First Trip ✨", 7);
            // Add sample data for fresh users
            newTrip.items.push({
                id: Date.now(),
                name: "ソウル駅 (Sample)",
                url: "https://map.naver.com/p/entry/place/11630456?c=16.81,0,0,0,dh",
                day: "1",
                memo: "Welcome to Gaja-Map!\n推しの聖地へ\nReady? 가자!",
                visited: false
            });
            gajaTrips = [newTrip];
            currentTripId = newTrip.id;
            saveAllData();
        }

        // Ensure currentTripId is valid
        if (!gajaTrips.find(t => t.id === currentTripId)) {
            if (gajaTrips.length > 0) {
                currentTripId = gajaTrips[0].id;
            } else {
                // Safety fallacy
                const newTrip = createNewTripObject("New Trip", 7);
                gajaTrips.push(newTrip);
                currentTripId = newTrip.id;
            }
            saveAllData();
        }

        updateUI();
    }

    function createNewTripObject(title, days, items = []) {
        return {
            id: Date.now(),
            title: title,
            days: parseInt(days),
            items: items,
            archived: false,
            createdAt: new Date().toISOString()
        };
    }

    function getCurrentTrip() {
        return gajaTrips.find(t => t.id === currentTripId);
    }

    function saveAllData() {
        localStorage.setItem('gajaTrips', JSON.stringify(gajaTrips));
        localStorage.setItem('gajaCurrentTripId', currentTripId);
    }

    // --- Core UI Updates ---

    function updateUI() {
        const trip = getCurrentTrip();
        if (!trip) return;

        // Update Trip Info Inputs
        if (document.activeElement !== tripTitleInput) {
            tripTitleInput.value = trip.title;
        }
        tripDurationSelect.value = trip.days;

        // Update Day Tabs based on duration
        updateDayTabs(trip.days);

        // Render List
        renderList();
    }

    function updateDayTabs(days) {
        // Show/Hide tabs based on days selected
        const buttons = dayTabsContainer.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            const dayVal = btn.dataset.day;
            if (dayVal === 'all') return;
            if (parseInt(dayVal) > days) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'inline-block'; // or flex/block depending on CSS
            }
        });

        // Update Select Options in Add Form
        // We keep options 1-7 but could hide them too. For simplicity, we leave them.
    }

    // --- Rendering ---

    function renderList() {
        const trip = getCurrentTrip();
        if (!trip) return;

        cardList.innerHTML = '';

        // 1. Filter by Day
        let filteredItems = trip.items;
        if (currentFilter !== 'all') {
            filteredItems = trip.items.filter(item => item.day === currentFilter);
        }

        // 2. Filter by Search
        if (currentSearch.trim() !== '') {
            const lowerQuery = currentSearch.toLowerCase();
            filteredItems = filteredItems.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                (item.memo && item.memo.toLowerCase().includes(lowerQuery))
            );
        }

        // 3. Sort: Unchecked first, then Checked (and reverse chronological roughly by typical push order)
        // Note: User asked for manual sorting later, for now we keep the "Checked move to bottom" logic
        const unchecked = filteredItems.filter(i => !i.visited).reverse();
        const checked = filteredItems.filter(i => i.visited).reverse();
        const displayItems = [...unchecked, ...checked];

        if (displayItems.length === 0) {
            // Only show if it's the current trip and empty (not filtered results usually, but here if filter yields nothing)
            // User requested specific text for empty state
            cardList.innerHTML = `
                <div style="text-align: center; color: #888; margin-top: 2rem; width: 100%; font-family: 'M PLUS Rounded 1c', sans-serif;">
                    <p style="font-size: 1.1rem; line-height: 1.6;">推しの聖地へ<br>Ready? 가자!</p>
                </div>`;
            return;
        }

        displayItems.forEach((item) => {
            const card = document.createElement('div');
            card.className = `card ${item.visited ? 'visited' : ''}`;
            card.setAttribute('data-id', item.id);

            // Animation for new cards
            card.style.animation = 'fadeIn 0.5s ease-out';

            const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
            const pencilIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;

            // Simple Sort buttons (Up/Down) for lightweight ordering
            const upArrow = '⬆️'; // Placeholder for simple UI
            const downArrow = '⬇️';

            const memoHtml = item.memo ? `<div class="card-memo">${item.memo}</div>` : '';

            card.innerHTML = `
                <div class="day-tag">Day ${item.day || '?'}</div>
                <button class="delete-btn" aria-label="Delete">${trashIcon}</button>
                <div class="card-content">
                    <h3>${item.name}</h3>
                    <a href="${item.url}" target="_blank" class="map-link">View Map 🔗</a>
                    ${memoHtml}
                </div>
                <div class="card-actions">
                    <label class="visited-label">
                        <input type="checkbox" class="visited-checkbox" ${item.visited ? 'checked' : ''}>
                        行った！
                    </label>
                    <button class="edit-btn">${pencilIcon} Edit</button>
                    <!-- Future: Add sort buttons here if needed -->
                </div>
            `;

            // Handlers
            card.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm('本当に削除しますか？')) {
                    card.classList.add('flying-away');
                    setTimeout(() => deleteItem(item.id), 1400); // Wait for animation
                }
            });

            card.querySelector('.edit-btn').addEventListener('click', () => editItem(item.id));
            card.querySelector('.visited-checkbox').addEventListener('change', () => toggleVisited(item.id));

            cardList.appendChild(card);
        });
    }

    // --- CRUD Operations ---

    function addItem(name, url, day, memo) {
        const trip = getCurrentTrip();
        if (!trip) return;

        const newItem = {
            id: Date.now(),
            name: name,
            url: url,
            day: day,
            memo: memo,
            visited: false
        };

        trip.items.push(newItem);
        saveAllData();
        renderList();
    }

    function deleteItem(id) {
        const trip = getCurrentTrip();
        if (!trip) return;
        trip.items = trip.items.filter(i => i.id !== id);
        saveAllData();
        renderList();
    }

    function editItem(id) {
        const trip = getCurrentTrip();
        const item = trip.items.find(i => i.id === id);
        if (!item) return;

        const newName = prompt("場所の名前を編集:", item.name);
        if (newName === null) return;

        const newUrl = prompt("URLを編集:", item.url);
        if (newUrl === null) return;

        const newDay = prompt("Day (1-7) を編集:", item.day || "1");
        if (newDay === null) return;

        const newMemo = prompt("メモを編集:", item.memo || "");
        if (newMemo === null) return;

        if (newName.trim() !== "") item.name = newName.trim();
        if (newUrl.trim() !== "") item.url = newUrl.trim();
        if (newDay.trim() !== "") item.day = newDay.trim();
        item.memo = newMemo.trim();

        saveAllData();
        renderList();
    }

    function toggleVisited(id) {
        const trip = getCurrentTrip();
        const item = trip.items.find(i => i.id === id);
        if (item) {
            item.visited = !item.visited;
            if (item.visited) {
                const card = document.querySelector(`[data-id="${id}"]`);
                if (card) createConfetti(card);
            }
            saveAllData();
            renderList();
        }
    }

    // --- Archive & Trip Management Features ---

    // Archive the current trip and start a new one
    function archiveCurrentTrip() {
        const trip = getCurrentTrip();
        if (!trip) return;

        if (confirm(`「${trip.title}」を終了してアーカイブ（保存）しますか？\n\n新しい旅の作成画面に移動します。`)) {
            trip.archived = true;

            // Create a new active trip
            const newTrip = createNewTripObject("New Trip ✨", 7);
            gajaTrips.unshift(newTrip); // Add to top
            currentTripId = newTrip.id;

            saveAllData();

            // Updates
            alert(`アーカイブしました！\n新しい旅の準備を始めましょう！`);
            updateUI();

            // Switch back to input view if we were in archives
            archiveSection.style.display = 'none';
            document.querySelector('.input-section').style.display = 'block';
            document.querySelector('.filter-section').style.display = 'block';
            document.querySelector('.list-section').style.display = 'block';
            document.getElementById('trip-info-section').style.display = 'flex';
        }
    }

    function toggleArchiveView() {
        const isArchiveVisible = archiveSection.style.display !== 'none';

        if (isArchiveVisible) {
            // Hide Archive
            archiveSection.style.display = 'none';
            document.querySelector('.input-section').style.display = 'block';
            document.querySelector('.filter-section').style.display = 'block'; // Ensure filters are shown
            document.querySelector('.list-section').style.display = 'block';
            document.getElementById('trip-info-section').style.display = 'flex';
            updateUI();
        } else {
            // Show Archive
            archiveSection.style.display = 'block';
            document.querySelector('.input-section').style.display = 'none';
            document.querySelector('.filter-section').style.display = 'none'; // Hide filters in archive list view
            document.querySelector('.list-section').style.display = 'none';
            document.getElementById('trip-info-section').style.display = 'none';
            renderArchiveList();
        }
    }

    function renderArchiveList() {
        archiveList.innerHTML = '';

        // Find all archived trips OR trips that are NOT the current active one (history)
        // Ideally, we treat everything except currentTripId as "history" or strictly respect .archived flag.
        // Let's list ALL trips, highlighting the Active one, or just Archived ones.
        // Req: "Past Trips" view.

        const archivedTrips = gajaTrips.filter(t => t.id !== currentTripId || t.archived);

        if (archivedTrips.length === 0) {
            archiveList.innerHTML = '<p style="margin:20px; color:#666;">アーカイブされた旅はありません。</p>';
            return;
        }

        archivedTrips.forEach(trip => {
            const card = document.createElement('div');
            card.className = 'card';
            const dateStr = new Date(trip.createdAt).toLocaleDateString();

            card.innerHTML = `
                <div class="card-content">
                    <h3>${trip.title}</h3>
                    <p style="color:#666; font-size:0.9rem;">Created: ${dateStr}</p>
                    <p style="color:#666; font-size:0.9rem;">${trip.days} Days / ${trip.items.length} Places</p>
                </div>
                <div class="card-actions">
                    <button class="footer-btn view-trip-btn" style="background:#E6E6FA;">OPEN</button>
                    ${trip.archived ? '' : '<span style="font-size:0.8rem; color:green;">(Active)</span>'}
                </div>
            `;

            card.querySelector('.view-trip-btn').addEventListener('click', () => {
                // Switch to this trip
                currentTripId = trip.id;
                // If it was archived, we might want to unarchive logic? 
                // User requirement: "Past trips are viewable and editable"
                // So we just switch context and go back to main view.

                saveAllData();
                toggleArchiveView(); // Go back to main
                alert(`「${trip.title}」を開きました。`);
            });

            archiveList.appendChild(card);
        });
    }

    // --- Search & Filters ---

    // Day Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.day;
            renderList(); // Re-render with new filter
        });
    });

    // Validations & Utils

    // Event Listeners

    // 1. Form Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = placeNameInput.value.trim();
        let url = placeUrlInput.value.trim();
        const day = placeDayInput.value;
        const memo = placeMemoInput.value.trim();

        if (url) {
            const urlMatch = url.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                url = urlMatch[0];
            } else {
                alert('URLが見つかりません。');
                return;
            }
        }

        if (name && url) {
            addItem(name, url, day, memo);
            // Reset inputs
            placeNameInput.value = '';
            placeUrlInput.value = '';
            placeMemoInput.value = '';
            // Don't reset day, keeping context is usually better
        }
    });

    // 2. Trip Settings
    tripTitleInput.addEventListener('change', (e) => {
        const trip = getCurrentTrip();
        if (trip) {
            trip.title = e.target.value.trim();
            saveAllData();
        }
    });

    tripDurationSelect.addEventListener('change', (e) => {
        const trip = getCurrentTrip();
        if (trip) {
            trip.days = parseInt(e.target.value);
            saveAllData();
            updateDayTabs(trip.days);
        }
    });

    // 3. Search
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderList();
    });

    // 4. Archive & Footer Buttons
    if (archiveBtn) archiveBtn.addEventListener('click', archiveCurrentTrip);

    if (viewArchivesBtn) viewArchivesBtn.addEventListener('click', toggleArchiveView);

    if (backToCurrentBtn) backToCurrentBtn.addEventListener('click', toggleArchiveView);

    // 5. Backup & Restore
    if (exportBtn) exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gajaTrips));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `gaja-map-backup-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Clear List Button
    const clearListBtn = document.getElementById('clear-list-btn');
    if (clearListBtn) {
        clearListBtn.addEventListener('click', () => {
            if (confirm('現在のリストを保存せずに消去しますか？')) {
                const trip = getCurrentTrip();
                if (trip) {
                    trip.items = []; // Clear items
                    saveAllData();
                    renderList();
                }
            }
        });
    }

    if (importFile) importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('データを復元しますか？\n現在のデータは上書き（またはマージ）される可能性があります。\n事前にバックアップを取ることをお勧めします。')) {
            e.target.value = ''; // Reset
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedTrips = JSON.parse(event.target.result);
                if (Array.isArray(importedTrips)) {
                    // Simple logic: Overwrite/Union logic. 
                    // Let's replace for restore functionality to be clean, as per standard "Restore" behavior.
                    gajaTrips = importedTrips;

                    // Reset current ID to the first one in list or valid one
                    if (gajaTrips.length > 0) {
                        currentTripId = gajaTrips[0].id;
                    }

                    saveAllData();
                    alert('復元が完了しました！');
                    location.reload();
                } else {
                    alert('無効なファイル形式です。');
                }
            } catch (err) {
                alert('読み込みエラーが発生しました。');
                console.error(err);
            }
        };
        reader.readAsText(file);
    });

    // Utility: Confetti (Keep existing implementation)
    function createConfetti(element) {
        // ... (Same as before, simplified for brevity in this output but keeping logic)
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const particleCount = Math.floor(Math.random() * 4) + 6;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'star-particle';
            particle.textContent = '★';
            const pastelPurples = ['#E6E6FA', '#E0B0FF', '#D8BFD8', '#CCCCFF', '#DCD0FF'];
            const color = pastelPurples[Math.floor(Math.random() * pastelPurples.length)];
            const fontSize = Math.random() * 12 + 12;
            particle.style.cssText = `
                position: fixed; left: ${centerX}px; top: ${centerY}px;
                font-size: ${fontSize}px; color: ${color};
                user-select: none; pointer-events: none; z-index: 9999;
                filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
            `;
            document.body.appendChild(particle);
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 120 + 60;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            particle.animate([
                { transform: 'translate(-50%, -50%) scale(0.5) rotate(0deg)', opacity: 1 },
                { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1.2) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], { duration: 900, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }).onfinish = () => particle.remove();
        }
    }

    // Modal Logic
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const disclaimerTrigger = document.getElementById('disclaimer-trigger');
    const closeModal = document.querySelector('.close-modal');

    if (disclaimerTrigger && disclaimerModal) {
        disclaimerTrigger.addEventListener('click', () => disclaimerModal.style.display = 'block');
    }
    if (closeModal && disclaimerModal) {
        closeModal.addEventListener('click', () => disclaimerModal.style.display = 'none');
    }
    window.addEventListener('click', (event) => {
        if (event.target === disclaimerModal) disclaimerModal.style.display = 'none';
    });

    // Naver Search Button Logic

    // Google Search Button Logic (Place Name)
    const placeSearchBtn = document.getElementById('place-search-btn');
    if (placeSearchBtn) {
        placeSearchBtn.addEventListener('click', () => {
            // Logic: Search Naver Map by Name OR Open Home
            // Ignored URL input as per Phase 20 request
            const nameVal = placeNameInput.value.trim();
            if (nameVal) {
                window.open(`https://map.naver.com/p/search/${encodeURIComponent(nameVal)}`, '_blank');
            } else {
                // Phase 19/20: If empty, open Naver Map Home
                window.open('https://map.naver.com/', '_blank');
            }
        });
    }

    // Help Menu Logic
    const manualBtn = document.getElementById('manual-btn');
    const helpMenu = document.getElementById('help-menu');

    if (manualBtn && helpMenu) {
        // Toggle Menu
        manualBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            helpMenu.classList.toggle('active');
        });

        // Close menu when clicking outside
        window.addEventListener('click', (e) => {
            if (!helpMenu.contains(e.target) && e.target !== manualBtn) {
                helpMenu.classList.remove('active');
            }
        });
    }
});
