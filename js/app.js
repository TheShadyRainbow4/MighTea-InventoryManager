


// --- Global State Management ---
window.appState = {
    counts: {},
    customItems: [] 
};

window.getParLevel = function(itemName) {
    return window.parLevels[itemName] !== undefined ? window.parLevels[itemName] : 1;
};

// --- Utilities & Logging ---
window.logError = function(code, err) {
    const logBox = document.getElementById('errorLog');
    const time = new Date().toISOString();
    logBox.innerHTML += `[${time}] ERR_${code}: ${err.message || err}<br>`;
    console.error(err);
};

// --- Dual-Layer Persistence Engine ---
window.saveState = function() {
    if (typeof window.saveToCloud === 'function') {
        window.saveToCloud();
    } else {
        try {
            const dataStr = encodeURIComponent(JSON.stringify(window.appState));
            if (dataStr.length > 4000) {
                window.logError('0x00E_COOKIE_OVERFLOW', 'State too large for legacy cookie. Please export session file.');
                return;
            }
            const expires = new Date(Date.now() + 365*24*60*60*1000).toUTCString();
            document.cookie = `mighTeaState=${dataStr}; expires=${expires}; path=/; SameSite=Lax`;
        } catch(e) {
            window.logError('0x00F_COOKIE_SAVE', e);
        }
    }
};

function loadStateLocally() {
    try {
        const match = document.cookie.match(new RegExp('(^| )mighTeaState=([^;]+)'));
        if (match) {
            const loadedData = JSON.parse(decodeURIComponent(match[2]));
            if(loadedData.counts) window.appState.counts = loadedData.counts;
            if(loadedData.customItems) window.appState.customItems = loadedData.customItems;
        }
    } catch(e) {
        window.logError('0x010_COOKIE_LOAD', e);
    }
}

// --- Core Logic ---
function init() {
    try {
        loadStateLocally();
        window.renderInventory();
        
        if (typeof window.initCloudStorage === 'function') {
            window.initCloudStorage();
        }
    } catch(e) {
        window.logError('0x001_INIT', e);
    }
}

function toggleCategory(catId) {
    const content = document.getElementById(`cat-${catId}`);
    const icon = document.getElementById(`icon-${catId}`);
    if(content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.innerText = '[-]';
    } else {
        content.classList.add('collapsed');
        icon.innerText = '[+]';
    }
}

// Mathematical update allowing floats
function updateCount(itemId, val) {
    let current = parseFloat(window.appState.counts[itemId] || 0);
    current += val;
    if(current < 0) current = 0;
    
    // Clean up floating point math quirks (e.g. 0.5 - 0.1 = 0.3999999999)
    current = Number(current.toFixed(2));
    
    window.appState.counts[itemId] = current;
    document.getElementById(`input-${itemId}`).value = current;
    
    window.checkPar(itemId);
    window.saveState();
}

// Manual input allowing floats
function manualCountUpdate(itemId, inputElement) {
    let val = parseFloat(inputElement.value);
    if(isNaN(val) || val < 0) val = 0;
    val = Number(val.toFixed(2));
    
    window.appState.counts[itemId] = val;
    inputElement.value = val;
    
    window.checkPar(itemId);
    window.saveState();
}

// Par checking engine to update CSS visually
window.checkPar = function(itemId) {
    const row = document.getElementById(`row-${itemId}`);
    if(!row) return;
    
    const par = parseFloat(row.getAttribute('data-par'));
    const count = parseFloat(window.appState.counts[itemId] || 0);
    
    if(count <= par) {
        row.classList.add('below-par');
    } else {
        row.classList.remove('below-par');
    }
};

function addCustomItem() {
    try {
        const input = document.getElementById('newCustomItemName');
        const name = input.value.trim();
        if(!name) return;

        const id = 'custom_' + Date.now();
        window.appState.customItems.push({ id: id, name: name });
        window.appState.counts[id] = 0;
        input.value = '';
        
        window.renderInventory();
        window.saveState();
        
        const customContent = document.getElementById(`cat-custom_items`);
        if(customContent && customContent.classList.contains('collapsed')) {
            toggleCategory('custom_items');
        }
    } catch(e) {
        window.logError('0x002_ADD_CUSTOM', e);
    }
}

function removeCustomItem(id) {
    if(!confirm('Remove this custom item?')) return;
    window.appState.customItems = window.appState.customItems.filter(item => item.id !== id);
    delete window.appState.counts[id];
    window.renderInventory();
    window.saveState();
}

// Render Engine
window.renderInventory = function() {
    const wrapper = document.getElementById('inventoryWrapper');
    let html = '';
    let catIndex = 0;

    for (const [category, items] of Object.entries(window.inventoryData)) {
        let itemsHtml = items.map(item => {
            const id = 'base_' + btoa(unescape(encodeURIComponent(item))).replace(/[^a-zA-Z0-9]/g, '');
            return createItemRow(id, item);
        }).join('');

        html += `
            <div class="category" id="group-${catIndex}">
                <div class="category-header" onclick="toggleCategory('${catIndex}')">
                    ${category} <span id="icon-${catIndex}">[-]</span>
                </div>
                <div class="category-content" id="cat-${catIndex}">
                    ${itemsHtml}
                </div>
            </div>
        `;
        catIndex++;
    }

    let customItemsHtml = window.appState.customItems.map(item => createItemRow(item.id, item.name, true)).join('');
    
    html += `
        <div class="category" id="group-custom_items">
            <div class="category-header" onclick="toggleCategory('custom_items')">
                Custom Added Items <span id="icon-custom_items">[-]</span>
            </div>
            <div class="category-content" id="cat-custom_items">
                <div class="custom-item-adder">
                    <input type="text" id="newCustomItemName" placeholder="Type new item name...">
                    <button class="btn-3d btn-teal" onclick="addCustomItem()">+ Add Item</button>
                </div>
                ${customItemsHtml}
            </div>
        </div>
    `;

    wrapper.innerHTML = html;
    window.filterList();
};

function createItemRow(id, name, isCustom = false) {
    const count = parseFloat(window.appState.counts[id] || 0);
    // Custom items default to a par level of 0 to avoid immediate red warnings
    const par = isCustom ? 0 : window.getParLevel(name); 
    const isBelow = count <= par ? 'below-par' : '';
    
    let deleteBtn = isCustom ? `<button class="delete-custom-btn" onclick="removeCustomItem('${id}')" title="Remove custom item">x</button>` : '';
    
    return `
        <div class="item-row ${isBelow}" id="row-${id}" data-name="${name.toLowerCase()}" data-par="${par}">
            <div class="item-name">
                ${deleteBtn} <span class="name-text">${name}</span>
                <span class="par-warning">[At or below par]</span>
            </div>
            <div class="quantity-controls">
                <button class="btn-3d btn-gray qty-btn" onclick="updateCount('${id}', -1)">-</button>
                <input type="number" step="any" class="qty-input" id="input-${id}" value="${count}" onchange="manualCountUpdate('${id}', this)">
                <button class="btn-3d btn-gray qty-btn" onclick="updateCount('${id}', 1)">+</button>
            </div>
        </div>
    `;
}

function filterList() {
    try {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const groups = document.querySelectorAll('.category');

        groups.forEach(group => {
            let hasVisibleItems = false;
            const rows = group.querySelectorAll('.item-row');
            
            rows.forEach(row => {
                if (row.getAttribute('data-name').includes(query)) {
                    row.style.display = 'flex';
                    hasVisibleItems = true;
                } else {
                    row.style.display = 'none';
                }
            });

            const isCustomGroup = group.id === 'group-custom_items';
            if (!hasVisibleItems && !isCustomGroup) {
                group.style.display = 'none';
            } else {
                group.style.display = 'block';
            }
        });
    } catch(e) {
        window.logError('0x003_SEARCH', e);
    }
}

function exportSession() {
    try {
        const dataStr = JSON.stringify(window.appState, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `MighTea_Inventory_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Session Exported Successfully.');
    } catch(e) {
        window.logError('0x004_EXPORT', e);
    }
}

function importSession(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loadedData = JSON.parse(e.target.result);
                if(loadedData.counts) window.appState.counts = loadedData.counts;
                if(loadedData.customItems) window.appState.customItems = loadedData.customItems;
                
                window.renderInventory();
                window.saveState();
                alert('Session Imported Successfully.');
            } catch(err) {
                window.logError('0x005_PARSE', err);
                alert("Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
    } catch(e) {
        window.logError('0x006_IMPORT', e);
    }
    event.target.value = ''; 
}

function exportPDF() {
    try {
        window.print();
    } catch(e) {
        window.logError('0x007_PRINT', e);
    }
}

window.initCloudStorage = async function() {
    if (typeof __firebase_config === 'undefined') return false;
    
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        const { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
        const { getFirestore, doc, setDoc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        let userId = null;

        const initAuth = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        };
        
        await initAuth();

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                const docRef = doc(db, 'artifacts', appId, 'users', userId, 'inventoryData', 'currentState');
                
                onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if(data.counts) window.appState.counts = data.counts;
                        if(data.customItems) window.appState.customItems = data.customItems;
                        window.renderInventory();
                    }
                }, (err) => {
                    window.logError('0x008_CLOUD_SYNC', err);
                });
                
                window.saveToCloud = async function() {
                    if (!userId) return;
                    try {
                        await setDoc(docRef, window.appState);
                    } catch(e) {
                        window.logError('0x009_CLOUD_SAVE', e);
                    }
                };
            }
        });
        return true;
    } catch(e) {
        window.logError('0x00A_CLOUD_INIT', e);
        return false;
    }
};

// Expose functions to window because ES modules are lexically scoped
window.toggleCategory = toggleCategory;
window.updateCount = updateCount;
window.manualCountUpdate = manualCountUpdate;
window.addCustomItem = addCustomItem;
window.removeCustomItem = removeCustomItem;
window.filterList = filterList;
window.exportSession = exportSession;
window.importSession = importSession;
window.exportPDF = exportPDF;

// Start App
window.onload = init;
