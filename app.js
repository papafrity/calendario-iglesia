// 1. CONFIGURACIÓN DE FIREBASE (¡Sigue los pasos para conectarlo a internet!)
// Reemplaza esto con los datos de tu proyecto de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCnZfFNJvXm4BLJJx-2UZTqdfvWNqfGKpk",
    authDomain: "calendario-de-barrio.firebaseapp.com",
    projectId: "calendario-de-barrio",
    storageBucket: "calendario-de-barrio.firebasestorage.app",
    messagingSenderId: "782879100333",
    appId: "1:782879100333:web:232a291f15595911f5a524"
};

// Inicializar Firebase (Solo si la configuración fue actualizada)
let db = null;
const isFirebaseConfigured = firebaseConfig.apiKey !== "TU_API_KEY";

if (isFirebaseConfigured) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    // Habilitar Persistencia Offline Real
    db.enablePersistence()
      .catch(function(err) {
          if (err.code == 'failed-precondition') {
              console.log("Varias pestañas abiertas, la persistencia offline solo funciona en una a la vez.");
          } else if (err.code == 'unimplemented') {
              console.log("El navegador no soporta todas las características para offline.");
          }
      });

    // Interceptor para SaaS (Múltiples unidades en la misma base de datos)
    const originalCollection = db.collection.bind(db);
    db.collection = function(path) {
        if (!state.districtId || state.districtId === 'test' || state.districtId === 'default') {
            return originalCollection(path);
        }
        
        const wardPrefix = state.districtId + "_" + (state.wardId || "default") + "_";
        const districtPrefix = state.districtId + "_";

        if (path === 'events' || path === 'settings' || path === 'admins') {
            return originalCollection(wardPrefix + path);
        }
        
        if (path === 'district_events') {
            return originalCollection(districtPrefix + "events");
        }
        
        // Para colecciones de distrito (como la lista de barrios)
        if (path === 'wards') {
            return originalCollection(districtPrefix + "wards");
        }

        return originalCollection(path);
    };
}

// Estado de la aplicación
const state = {
    isAdmin: false,
    isSuperAdmin: false,
    userRole: null, // bishopric, clerk, leader_rs, leader_eq, etc.
    currentDate: new Date(),
    selectedWeekDate: new Date(),
    events: [], // Se cargará de Firebase o LocalStorage
    currentLang: localStorage.getItem('church_lang') || 'es',
    scriptureIndex: Math.floor(Math.random() * 15),
    currentFilter: 'all',
    districtId: null,
    districtName: null,
    wardId: null,
    wardName: null,
    unitCode: null // districtId + "|" + wardId para compatibilidad interna
};

// Cargar eventos iniciales
function loadEvents() {
    if (isFirebaseConfigured && state.districtId && state.wardId) {
        const wardCollection = state.districtId + "_" + state.wardId + "_events";
        const districtCollection = state.districtId + "_events";
        
        let wardEvents = [];
        let districtEvents = [];

        function mergeAndRender() {
            state.events = [...wardEvents, ...districtEvents];
            cleanOldEvents();
            renderCalendar();
        }

        // Listener para eventos del barrio
        db.collection(wardCollection).onSnapshot((querySnapshot) => {
            wardEvents = [];
            querySnapshot.forEach((doc) => {
                wardEvents.push({ ...doc.data(), scope: 'ward' });
            });
            mergeAndRender();
        });

        // Listener para eventos del distrito (visibles para todos los barrios)
        db.collection(districtCollection).onSnapshot((querySnapshot) => {
            districtEvents = [];
            querySnapshot.forEach((doc) => {
                districtEvents.push({ ...doc.data(), scope: 'district' });
            });
            mergeAndRender();
        });

    } else {
        // Respaldo local
        const localEvents = JSON.parse(localStorage.getItem('church_events')) || [];
        state.events = localEvents;
        cleanOldEvents();
    }
}

// Escrituras se cargan desde scriptures.js

// Imágenes de fondo (Carpeta images)
const backgroundImages = [
    'images/temple.jpg',
    'images/temple 2.jpg',
    'images/temple 3.jpg',
    'images/temple 4.jpg'
];

// Tipos de evento y sus etiquetas
const eventTypeLabels = {
    'general': 'General',
    'youth': 'Jóvenes',
    'relief-society': 'Sociedad de Socorro',
    'elders': 'Elderes',
    'primary': 'Primaria'
};

// Elementos del DOM
const DOM = {
    calendarDays: document.getElementById('calendarDays'),
    currentMonthYear: document.getElementById('currentMonthYear'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),

    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    adminControls: document.getElementById('adminControls'),

    loginModal: document.getElementById('loginModal'),
    loginForm: document.getElementById('loginForm'),
    loginError: document.getElementById('loginError'),

    eventModal: document.getElementById('eventModal'),
    eventForm: document.getElementById('eventForm'),
    deleteEventBtn: document.getElementById('deleteEventBtn'),
    eventModalTitle: document.getElementById('eventModalTitle'),
    eventModalDate: document.getElementById('eventModalDate'),

    eventDetailsModal: document.getElementById('eventDetailsModal'),
    detailEventTitle: document.getElementById('detailEventTitle'),
    detailEventType: document.getElementById('detailEventType'),
    detailEventDate: document.getElementById('detailEventDate'),
    detailEventTime: document.getElementById('detailEventTime'),
    detailEventLocation: document.getElementById('detailEventLocation'),
    detailEventDesc: document.getElementById('detailEventDesc'),
    detailAdminActions: document.getElementById('detailAdminActions'),
    editFromDetailBtn: document.getElementById('editFromDetailBtn'),

    dailyScriptureText: document.getElementById('dailyScriptureText'),
    dailyScriptureRef: document.getElementById('dailyScriptureRef'),

    manageAdminsBtn: document.getElementById('manageAdminsBtn'),
    manageWardsBtn: document.getElementById('manageWardsBtn'),
    manageAdminsModal: document.getElementById('manageAdminsModal'),
    manageWardsModal: document.getElementById('manageWardsModal'),
    createWardForm: document.getElementById('createWardForm'),
    createAdminForm: document.getElementById('createAdminForm'),
    adminsList: document.getElementById('adminsList'),

    closeModals: document.querySelectorAll('.close-modal')
};

// Variable para el evento actual siendo visualizado/editado
let currentEditingEventId = null;
let currentViewingEvent = null;

let isInitialized = false;

// Inicialización
function init() {
    setRandomBackground();
    setDailyScripture();
    checkAdminState();
    loadTheme();
    
    state.currentLang = localStorage.getItem('church_lang') || 'es';
    state.currentFilter = 'all';

    const langSelect = document.getElementById('langSelect');
    if(langSelect) {
        langSelect.value = state.currentLang;
        langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }
    setLanguage(state.currentLang); // Aplicar idioma

    loadEvents(); // Cargar los eventos al iniciar
    loadBulletin(); // Cargar boletín dominical
    loadCleaning(); // Cargar asignación de limpieza
    loadDirectory(); // Cargar directorio de líderes
    loadAnnouncement(); // Cargar avisos urgentes
    renderCalendar();

    if (!isInitialized) {
        setupEventListeners();
        isInitialized = true;
    }
}

function checkUnitCode() {
    state.districtId = localStorage.getItem('church_district_id');
    state.districtName = localStorage.getItem('church_district_name');
    state.wardId = localStorage.getItem('church_ward_id');
    state.wardName = localStorage.getItem('church_ward_name');
    
    if (state.districtId && state.wardId) {
        state.unitCode = state.districtId + "|" + state.wardId;
    }

    updateZoneBadge();
    
    if (!state.districtId || !state.wardId) {
        const modal = document.getElementById('unitCodeModal');
        if(modal) {
            modal.classList.remove('hidden');
            setupUnitCodeEvents();
        } else {
            init();
        }
    } else {
        init();
    }
}

function setupUnitCodeEvents() {
    const districtSearchInput = document.getElementById('districtSearchInput');
    const districtResults = document.getElementById('districtResults');
    const wardResults = document.getElementById('wardResults');
    const wardSelectView = document.getElementById('wardSelectView');
    const districtSearchView = document.getElementById('districtSearchView');
    const unitRegisterView = document.getElementById('unitRegisterView');
    
    const showRegisterBtn = document.getElementById('showRegisterUnitBtn');
    const showLoginBtn = document.getElementById('showLoginUnitBtn');
    const backToDistrictsBtn = document.getElementById('backToDistrictsBtn');

    // Cambiar a vista de registro
    if (showRegisterBtn) {
        showRegisterBtn.onclick = (e) => {
            e.preventDefault();
            districtSearchView.classList.add('hidden');
            unitRegisterView.classList.remove('hidden');
        };
    }

    // Volver a búsqueda
    if (showLoginBtn) {
        showLoginBtn.onclick = (e) => {
            e.preventDefault();
            unitRegisterView.classList.add('hidden');
            wardSelectView.classList.add('hidden');
            districtSearchView.classList.remove('hidden');
        };
    }

    if (backToDistrictsBtn) {
        backToDistrictsBtn.onclick = () => {
            wardSelectView.classList.add('hidden');
            districtSearchView.classList.remove('hidden');
        };
    }

    // Búsqueda de Distritos (en minúsculas)
    if (districtSearchInput) {
        districtSearchInput.addEventListener('input', async () => {
            const query = districtSearchInput.value.trim().toLowerCase();
            if (query.length < 2) {
                districtResults.innerHTML = '';
                return;
            }

            try {
                // Buscamos en la colección global 'districts'
                const snapshot = await firebase.firestore().collection("districts")
                    .where("searchName", ">=", query)
                    .where("searchName", "<=", query + "\uf8ff")
                    .limit(10)
                    .get();

                districtResults.innerHTML = '';
                if (snapshot.empty) {
                    districtResults.innerHTML = '<p style="padding:10px; color:var(--text-secondary);">No se encontraron distritos.</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const div = document.createElement('div');
                    div.className = 'result-item';
                    div.style = 'padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 5px; cursor: pointer; border-radius: 6px; text-align: left;';
                    div.innerHTML = `<strong>${data.name}</strong> <br> <small style="color:var(--text-secondary)">${data.city || ''}</small>`;
                    div.onclick = () => selectDistrict(doc.id, data.name);
                    districtResults.appendChild(div);
                });
            } catch (err) {
                console.error(err);
            }
        });
    }

    async function selectDistrict(id, name) {
        state.districtId = id;
        state.districtName = name;
        document.getElementById('selectedDistrictName').textContent = name;
        
        districtSearchView.classList.add('hidden');
        wardSelectView.classList.remove('hidden');
        
        loadWards(id);
    }

    async function loadWards(districtId) {
        wardResults.innerHTML = '<p style="padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando barrios...</p>';
        try {
            // Cada distrito tiene su propia subcolección de barrios
            const snapshot = await firebase.firestore().collection(districtId + "_wards").get();
            wardResults.innerHTML = '';
            
            if (snapshot.empty) {
                wardResults.innerHTML = '<p style="padding:10px; color:var(--text-secondary);">Este distrito aún no tiene barrios registrados.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'result-item';
                div.style = 'padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 5px; cursor: pointer; border-radius: 6px; text-align: left;';
                div.innerHTML = `<strong>${data.name}</strong>`;
                div.onclick = () => selectWard(doc.id, data.name);
                wardResults.appendChild(div);
            });
        } catch (err) {
            console.error(err);
            wardResults.innerHTML = '<p style="color:#e74c3c;">Error al cargar barrios.</p>';
        }
    }

    function selectWard(id, name) {
        state.wardId = id;
        state.wardName = name;
        
        localStorage.setItem('church_district_id', state.districtId);
        localStorage.setItem('church_district_name', state.districtName);
        localStorage.setItem('church_ward_id', state.wardId);
        localStorage.setItem('church_ward_name', state.wardName);
        
        state.unitCode = state.districtId + "|" + state.wardId;
        
        document.getElementById('unitCodeModal').classList.add('hidden');
        updateZoneBadge();
        init();
    }

    // Registro de Nuevo Distrito y Barrio
    const registerDistrictForm = document.getElementById('registerDistrictForm');
    if (registerDistrictForm) {
        registerDistrictForm.onsubmit = async (e) => {
            e.preventDefault();
            const dName = document.getElementById('regDistrictName').value.trim();
            const wName = document.getElementById('regFirstWardName').value.trim();
            const adminUser = document.getElementById('regAdminUser').value.trim();
            const adminEmail = document.getElementById('regAdminEmail').value.trim();
            const adminPass = document.getElementById('regAdminPass').value;

            if (adminPass.length < 6) {
                alert("La contraseña debe tener al menos 6 caracteres.");
                return;
            }

            // Convertir nombres a IDs seguros (minúsculas y guiones)
            const dId = dName.toLowerCase().replace(/\s+/g, '-');
            const wId = wName.toLowerCase().replace(/\s+/g, '-');

            try {
                // 1. Verificar si el distrito ya existe
                const dDoc = await firebase.firestore().collection("districts").doc(dId).get();
                if (dDoc.exists) {
                    alert("Ese nombre de distrito ya está en uso. Por favor elige uno más específico.");
                    return;
                }

                // 2. Crear el usuario en Firebase Auth
                let secondaryApp = firebase.apps.find(app => app.name === 'Secondary');
                if (!secondaryApp) secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
                await secondaryApp.auth().createUserWithEmailAndPassword(adminEmail, adminPass);
                await secondaryApp.auth().signOut();

                // 3. Crear el Distrito en la colección global
                await firebase.firestore().collection("districts").doc(dId).set({
                    name: dName,
                    searchName: dName.toLowerCase(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 4. Crear el primer Barrio dentro del distrito
                await firebase.firestore().collection(dId + "_wards").doc(wId).set({
                    name: wName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 5. Inicializar lista de administradores del distrito
                await firebase.firestore().collection(dId + "_settings").doc("adminsList").set({
                    list: [{ username: adminUser, realEmail: adminEmail, role: 'district' }]
                });

                state.districtId = dId;
                state.districtName = dName;
                state.wardId = wId;
                state.wardName = wName;
                
                selectWard(wId, wName);
                alert("¡Distrito y Barrio creados con éxito!");
            } catch (err) {
                console.error(err);
                alert("Error al registrar: " + err.message);
            }
        };
    }
}

function cleanOldEvents() {
    if (!state.events || state.events.length === 0) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setDate(today.getDate() - 60);

    let needsLocalUpdate = false;

    state.events.forEach((ev, index) => {
        const evDate = new Date(ev.date + 'T12:00:00');
        
        // 1. Borrar evento completo si es mayor a 60 días
        if (evDate < twoMonthsAgo) {
            if (isFirebaseConfigured) {
                db.collection("events").doc(ev.id).delete().catch(e => console.log("Limpieza evento:", e));
            }
            state.events[index] = null; // Marcar para eliminar del array local
            needsLocalUpdate = true;
        } 
        // 2. Si tiene más de 14 días y AÚN tiene imagen, borrar SOLO la imagen para ahorrar espacio
        else if (evDate < twoWeeksAgo && ev.image && ev.image.trim() !== '') {
            if (isFirebaseConfigured) {
                db.collection("events").doc(ev.id).update({ image: "" }).catch(e => console.log("Limpieza imagen:", e));
            }
            ev.image = "";
            needsLocalUpdate = true;
        }
    });

    if (needsLocalUpdate) {
        // Filtrar los eventos marcados como null
        state.events = state.events.filter(ev => ev !== null);
        if (!isFirebaseConfigured) {
            localStorage.setItem('church_events', JSON.stringify(state.events));
        }
    }
}

// Cambiar Idioma
function setLanguage(lang) {
    if (!translations[lang]) return;
    state.currentLang = lang;
    localStorage.setItem('church_lang', lang);
    const dict = translations[lang];

    // Actualizar textos con atributo data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        
        // Manejar arrays como daysShort_0
        if (key.includes('_') && key.match(/\d+$/)) {
            const parts = key.split('_');
            const arrayName = parts[0];
            const index = parseInt(parts[1], 10);
            if (dict[arrayName] && dict[arrayName][index]) {
                el.textContent = dict[arrayName][index];
            }
        } else if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    // Actualizar placeholders específicos
    const userInp = document.getElementById('username');
    if (userInp) userInp.placeholder = dict.modal_user || 'Usuario';
    const passInp = document.getElementById('password');
    if (passInp) passInp.placeholder = dict.modal_pass || 'Contraseña';
    
    const titleInp = document.getElementById('eventTitle');
    if (titleInp) titleInp.placeholder = dict.ph_title || 'Ej. Noche de Hogar';
    const locInp = document.getElementById('eventLocation');
    if (locInp) locInp.placeholder = dict.ph_loc || 'Ej. Capilla';
    const imgInp = document.getElementById('eventImage');
    if (imgInp) imgInp.placeholder = dict.ph_img || 'URL de Flyer/Imagen';
    const descInp = document.getElementById('eventDesc');
    if (descInp) descInp.placeholder = dict.ph_desc || 'Detalles de la actividad...';

    // RSVP placeholders
    const rsvpName = document.getElementById('rsvpName');
    if (rsvpName) rsvpName.placeholder = dict.rsvp_namePh || 'Tu nombre o Familia';
    const rsvpCount = document.getElementById('rsvpCount');
    if (rsvpCount) rsvpCount.placeholder = dict.rsvp_countPh || 'Cantidad de personas';

    // Cleaning placeholder
    const cleaningName = document.getElementById('cleaningName');
    if (cleaningName) cleaningName.placeholder = dict.cleaning_ph || 'Ej: Familia Pérez y Gómez';

    // Directory placeholders
    const leaderRole = document.getElementById('leaderRole');
    if (leaderRole) leaderRole.placeholder = dict.dir_rolePh || 'Llamamiento (Ej. Obispo)';
    const leaderName = document.getElementById('leaderName');
    if (leaderName) leaderName.placeholder = dict.dir_namePh || 'Nombre completo';
    const leaderPhone = document.getElementById('leaderPhone');
    if (leaderPhone) leaderPhone.placeholder = dict.dir_phonePh || 'Teléfono (Ej. +54911...)';

    // Unit code placeholders
    const unitCodeInput = document.getElementById('unitCodeInput');
    if (unitCodeInput) unitCodeInput.placeholder = dict.unit_inputPh || 'Ej: barrio-centro-123';
    const regUnitCode = document.getElementById('regUnitCode');
    if (regUnitCode) regUnitCode.placeholder = dict.unit_codePh || 'Código de unidad';
    const regAdminUser = document.getElementById('regAdminUser');
    if (regAdminUser) regAdminUser.placeholder = dict.unit_nickPh || 'Nick de Pres. de Distrito';
    const regAdminEmail = document.getElementById('regAdminEmail');
    if (regAdminEmail) regAdminEmail.placeholder = dict.unit_emailPh || 'Su correo real';
    const regAdminPass = document.getElementById('regAdminPass');
    if (regAdminPass) regAdminPass.placeholder = dict.unit_passPh || 'Contraseña (mín. 6 caracteres)';

    // Admin form placeholders
    const newAdminUser = document.getElementById('newAdminUser');
    if (newAdminUser) newAdminUser.placeholder = dict.admin_nickPh || 'Nick de Usuario';
    const newAdminEmail = document.getElementById('newAdminRealEmail');
    if (newAdminEmail) newAdminEmail.placeholder = dict.admin_emailPh || 'Correo Real del Líder';
    const newAdminPass = document.getElementById('newAdminPass');
    if (newAdminPass) newAdminPass.placeholder = dict.admin_passPh || 'Contraseña Inicial';

    // Forgot password placeholder
    const forgotEmail = document.getElementById('forgotPassEmail');
    if (forgotEmail) forgotEmail.placeholder = dict.forgot_ph || 'Nick de usuario o correo';
    
    // Traducir escritura diaria
    setDailyScripture();
    
    // Renderizar de nuevo vistas que usan fechas dinámicas
    renderCalendar();
    if (window.innerWidth <= 768) {
        renderMobileWeeklyView();
    }
}

// Cargar preferencia de tema
function loadTheme() {
    const isLight = localStorage.getItem('church_light_theme') === 'true';
    if (isLight) {
        document.body.classList.add('light-theme');
        document.getElementById('themeToggleBtn').innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// Configurar fondo aleatorio
function setRandomBackground() {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const selectedImage = backgroundImages[randomIndex];

    // Mantenemos el overlay del gradiente que depende del tema claro/oscuro
    const overlay = 'linear-gradient(var(--bg-overlay), var(--bg-overlay))';
    document.body.style.backgroundImage = `${overlay}, url('${selectedImage}')`;
}

// Configurar escritura diaria (Aleatoria cada vez que se carga la página)
function setDailyScripture() {
    if (state.scriptureIndex >= translatedScriptures.length) {
        state.scriptureIndex = 0;
    }
    const scriptureData = translatedScriptures[state.scriptureIndex];
    const scripture = scriptureData[state.currentLang] || scriptureData['es'];

    DOM.dailyScriptureText.textContent = `"${scripture.text}"`;
    DOM.dailyScriptureRef.textContent = `- ${scripture.ref}`;
}

// Verificación de Admin
// Función para renderizar y eliminar admins
async function renderAdminsList() {
    DOM.adminsList.innerHTML = '<p>Cargando...</p>';
    if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
        try {
            const doc = await db.collection(state.districtId + "_settings").doc("adminsList").get();
            let admins = [];
            if (doc.exists) {
                admins = doc.data().list || [];
            }
            
            DOM.adminsList.innerHTML = '';
            if (admins.length === 0) {
                DOM.adminsList.innerHTML = '<p style="font-size:0.8rem; color:var(--text-secondary);">No hay otras cuentas creadas.</p>';
            } else {
                admins.forEach((admin, index) => {
                    const delay = index * 0.1;
                    DOM.adminsList.innerHTML += `
                    <div class="animate-item list-item-hover" style="animation-delay: ${delay}s; display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); margin-bottom:6px; border-radius:6px;">
                        <div style="flex:1;">
                            <span style="font-weight:bold; color:var(--text-primary);">${admin.username}</span><br>
                            <span style="font-size:0.75rem; color:var(--accent-gold);">${admin.role || 'Admin'}</span>
                            ${admin.wardName ? `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left: 5px;">📍 ${admin.wardName}</span>` : ''}
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button class="icon-btn" style="color: var(--accent-gold); font-size: 1rem;" onclick="window.editAdmin(${index})" title="Editar/Sucesor"><i class="fa-solid fa-user-pen"></i></button>
                            <button class="icon-btn" style="color: #e74c3c; font-size: 1rem;" onclick="window.deleteAdmin(${index})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>`;
                });
            }
        } catch (e) {
            DOM.adminsList.innerHTML = '<p>Error al cargar cuentas.</p>';
        }
    } else {
        const localAdmins = JSON.parse(localStorage.getItem('church_admins') || '[]');
        DOM.adminsList.innerHTML = '';
        if (localAdmins.length === 0) {
            DOM.adminsList.innerHTML = '<p style="font-size:0.8rem; color:var(--text-secondary);">No hay otras cuentas creadas.</p>';
        } else {
            localAdmins.forEach((admin, index) => {
                const delay = index * 0.1;
                DOM.adminsList.innerHTML += `
                <div class="animate-item list-item-hover" style="animation-delay: ${delay}s; display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); margin-bottom:6px; border-radius:6px;">
                    <div>
                        <span style="font-weight:bold; color:var(--text-primary);">${admin.username}</span><br>
                        <span style="font-size:0.75rem; color:var(--accent-gold);">${admin.role || 'Admin'}</span>
                        ${admin.wardName ? `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left: 5px;">📍 ${admin.wardName}</span>` : ''}
                    </div>
                    <button class="icon-btn" style="color: #e74c3c; font-size: 1rem;" onclick="window.deleteAdmin(${index})"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            });
        }
    }
}

window.deleteAdmin = async function(index) {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
        try {
            const docRef = db.collection(state.districtId + "_settings").doc("adminsList");
            const doc = await docRef.get();
            if (doc.exists) {
                let admins = doc.data().list || [];
                admins.splice(index, 1);
                await docRef.set({ list: admins });
                renderAdminsList();
            }
        } catch(e) {
            console.error(e);
            alert("Error al eliminar");
        }
    } else {
        let localAdmins = JSON.parse(localStorage.getItem('church_admins') || '[]');
        localAdmins.splice(index, 1);
        localStorage.setItem('church_admins', JSON.stringify(localAdmins));
        renderAdminsList();
    }
};

function checkAdminState() {
    if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                let role = 'general';
                const isSuper = user.email && (user.email.includes('papafrity') || user.email.includes('admin') || user.email.includes('obispo'));
                
                if (isSuper) {
                    role = 'superadmin';
                    handleLoginSuccess(isSuper, role);
                } else {
                    try {
                        const doc = await db.collection(state.districtId + "_settings").doc("adminsList").get();
                        if(doc.exists) {
                            const admins = doc.data().list || [];
                            const found = admins.find(a => a.realEmail === user.email || a.email === user.email);
                            if (found) {
                                role = found.role || 'general';
                            }
                        }
                    } catch(e) {
                        console.error("Error al obtener rol: ", e);
                    }
                    handleLoginSuccess(isSuper, role);
                }
            } else {
                state.isAdmin = false;
                state.isSuperAdmin = false;
                state.userRole = null;
                DOM.loginBtn.classList.remove('hidden');
                DOM.adminControls.classList.add('hidden');
                renderCalendar();
                if(typeof renderCleaning === 'function') renderCleaning();
                if(typeof renderDirectory === 'function') renderDirectory();
            }
        });
    } else {
        const isLogged = sessionStorage.getItem('church_admin_logged') === 'true';
        const isSuper = sessionStorage.getItem('church_superadmin_logged') === 'true';
        const role = sessionStorage.getItem('church_admin_role') || 'clerk';

        if (isLogged) {
            handleLoginSuccess(isSuper, role);
        } else {
            state.isAdmin = false;
            state.isSuperAdmin = false;
            state.userRole = null;
            DOM.loginBtn.classList.remove('hidden');
            DOM.adminControls.classList.add('hidden');
        }
    }
}

function handleLoginSuccess(isSuper, role) {
    state.isAdmin = true;
    state.isSuperAdmin = isSuper;
    state.userRole = role;
    sessionStorage.setItem('church_admin_logged', 'true');
    sessionStorage.setItem('church_superadmin_logged', isSuper ? 'true' : 'false');
    sessionStorage.setItem('church_admin_role', role);

    DOM.loginBtn.classList.add('hidden');
    DOM.adminControls.classList.remove('hidden');
    DOM.loginModal.classList.add('hidden');
    DOM.loginError.classList.add('hidden');

    // Manage admins is visible for superadmin, district AND bishopric
    if (isSuper || role === 'superadmin' || role === 'district' || role === 'bishopric') {
        DOM.manageAdminsBtn.classList.remove('hidden');
    } else {
        DOM.manageAdminsBtn.classList.add('hidden');
    }

    // Manage wards is visible for superadmin AND district
    if (DOM.manageWardsBtn) {
        if (isSuper || role === 'superadmin' || role === 'district') {
            DOM.manageWardsBtn.classList.remove('hidden');
        } else {
            DOM.manageWardsBtn.classList.add('hidden');
        }
    }

    // Actualizar el UI de la sesión
    const adminSessionBadgeText = document.getElementById('adminSessionBadgeText');
    if (adminSessionBadgeText) {
        const roleNames = {
            'superadmin': 'Super Admin',
            'district': 'Pres. Distrito/Estaca',
            'bishopric': 'Obispado',
            'clerk': 'Secretario',
            'leader_rs': 'Soc. Socorro',
            'leader_eq': 'Élderes',
            'leader_yw': 'Mujeres Jóvenes',
            'leader_ym': 'Hombres Jóvenes',
            'leader_pr': 'Primaria',
            'leader_ss': 'Escuela Dominical',
            'general': 'Admin General'
        };
        adminSessionBadgeText.textContent = roleNames[role] || 'Admin';
    }

    renderCalendar();
    if(typeof renderCleaning === 'function') renderCleaning();
    if(typeof renderDirectory === 'function') renderDirectory();
}

function updateZoneBadge() {
    const zoneBadgeText = document.getElementById('currentZoneText');
    const zoneBadge = document.getElementById('currentZoneBadge');
    if (zoneBadgeText && zoneBadge) {
        if (state.districtName && state.wardName) {
            zoneBadgeText.textContent = state.districtName + " > " + state.wardName;
            zoneBadge.style.display = 'inline-flex';
        } else {
            zoneBadge.style.display = 'none';
        }
    }
}

// Renderizar Calendario
function renderCalendar() {
    DOM.calendarDays.innerHTML = '';

    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    // Nombres de meses desde el diccionario
    const dict = translations[state.currentLang] || translations['es'];
    const monthNames = dict.months;
    DOM.currentMonthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay(); // 0 (Dom) - 6 (Sáb)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell other-month';
        dayCell.innerHTML = `<span class="day-number">${daysInPrevMonth - i}</span>`;
        DOM.calendarDays.appendChild(dayCell);
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        if (isCurrentMonth && i === today.getDate()) {
            dayCell.classList.add('today');
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        dayCell.innerHTML = `<span class="day-number">${i}</span>`;

        // Botón de agregar evento (Solo visible para admin)
        if (state.isAdmin) {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-event-btn admin-visible';
            addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
            addBtn.onclick = (e) => {
                e.stopPropagation();
                openEventModal(dateStr);
            };
            dayCell.appendChild(addBtn);
        }

        // Contenedor de eventos
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'events-container';

        // Filtrar eventos para este día
        const dayEvents = state.events.filter(e => e.date === dateStr && (state.currentFilter === 'all' || e.type === state.currentFilter));
        // Ordenar por hora
        dayEvents.sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00'));

        dayEvents.forEach(evt => {
            const chip = document.createElement('div');
            chip.className = `event-chip type-${evt.type}`;
            chip.textContent = `${evt.time ? evt.time + ' - ' : ''}${evt.title}`;
            chip.onclick = (e) => {
                e.stopPropagation();
                openEventDetailsModal(evt);
            };
            eventsContainer.appendChild(chip);
        });

        dayCell.appendChild(eventsContainer);

        // Al hacer clic en la celda
        dayCell.onclick = () => {
            if (window.innerWidth <= 768) {
                // En móviles, hacer clic en el mes selecciona esa semana para la vista detallada superior
                state.selectedWeekDate = new Date(year, month, i);
                renderMobileWeeklyView();
                
                // Hacer un poco de scroll hacia arriba para ver la vista semanal si es necesario
                document.getElementById('mobileWeeklyView').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                if (state.isAdmin) {
                    openEventModal(dateStr);
                }
            }
        };

        // Agregar botón de boletín los domingos en versión de escritorio
        if (new Date(year, month, i).getDay() === 0) {
            const bullBtn = document.createElement('button');
            bullBtn.className = 'btn btn-outline bull-calendar-btn';
            bullBtn.style.cssText = 'font-size:0.65rem; padding: 2px 4px; margin-top:2px; display:block; width:100%; border-color:var(--accent-gold); color:var(--accent-gold); background:rgba(212, 175, 55, 0.1);';
            
            // Si es móvil, solo icono. Si es PC, icono + texto.
            const bullText = window.innerWidth <= 768 ? '' : ' ' + (dict.btn_bulletin || 'Boletín');
            bullBtn.innerHTML = `<i class="fa-solid fa-book-open"></i><span>${bullText}</span>`;
            bullBtn.onclick = (e) => {
                e.stopPropagation();
                window.openBulletinModal(e);
            };
            eventsContainer.appendChild(bullBtn);
        }

        DOM.calendarDays.appendChild(dayCell);
    }

    // Días del mes siguiente para completar la cuadrícula (hasta 42 celdas)
    const totalCells = DOM.calendarDays.children.length;
    const remainingCells = 42 - totalCells;

    for (let i = 1; i <= remainingCells; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell other-month';
        dayCell.innerHTML = `<span class="day-number">${i}</span>`;
        DOM.calendarDays.appendChild(dayCell);
    }

    // Actualizar vista semanal en móviles al final de renderizar el mes
    if (window.innerWidth <= 768) {
        renderMobileWeeklyView();
    }
}

// Helpers para onclicks en HTML inyectado
window.openEventDetailsModalId = function(id) {
    const evt = state.events.find(e => e.id === id);
    if (evt) openEventDetailsModal(evt);
};

window.openEventModalDate = function(dateStr) {
    openEventModal(dateStr);
};

// Renderizar la vista de la semana para móviles
function renderMobileWeeklyView() {
    const container = document.getElementById('weeklyDaysContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const d = new Date(state.selectedWeekDate);
    const dayOfWeek = d.getDay(); // 0 es Domingo
    const diff = d.getDate() - dayOfWeek;
    
    const startOfWeek = new Date(d.getFullYear(), d.getMonth(), diff);
    
    const dict = translations[state.currentLang] || translations['es'];
    const monthNamesShort = dict.monthsShort;
    const dayNames = dict.days;
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        
        const dayEvents = state.events.filter(e => e.date === dateStr && (state.currentFilter === 'all' || e.type === state.currentFilter));
        dayEvents.sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00'));
        
        const dayCard = document.createElement('div');
        dayCard.className = 'weekly-day-card';
        
        // Bordes de hoy
        const today = new Date();
        if (currentDate.getDate() === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
            dayCard.style.borderColor = 'var(--accent-gold)';
            dayCard.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.2)';
        }
        
        let eventsHtml = '';
        if (dayEvents.length > 0) {
            dayEvents.forEach(evt => {
                eventsHtml += `
                    <div class="event-chip type-${evt.type}" style="margin-bottom:0.4rem; cursor:pointer; display:block; text-indent:0; width:auto; height:auto; border-radius:4px; padding:0.4rem;" onclick="window.openEventDetailsModalId('${evt.id}')">
                        ${evt.time ? '<b>' + evt.time + '</b> - ' : ''}${evt.title}
                    </div>
                `;
            });
        } else {
            eventsHtml = '<p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; font-style: italic;" data-i18n="noEvents">' + (dict.noEvents || 'Sin eventos') + '</p>';
        }
        
        let addBtnHtml = '';
        if (state.isAdmin) {
            addBtnHtml = `<button class="icon-btn" style="width:24px; height:24px; font-size:0.9rem; color:var(--accent-gold); padding:0;" onclick="window.openEventModalDate('${dateStr}')"><i class="fa-solid fa-plus"></i></button>`;
        }
        
        // Agregar botón de boletín los domingos en versión móvil
        let bulletinHtml = '';
        if (currentDate.getDay() === 0) {
            const bullText = window.innerWidth <= 480 ? '' : ' ' + (dict.btn_bulletin || 'Boletín');
            bulletinHtml = `<button class="btn btn-outline" style="font-size:0.65rem; padding:2px 8px; margin-left: auto; border-color:var(--accent-gold); color:var(--accent-gold); background:rgba(212, 175, 55, 0.1);" onclick="window.openBulletinModal(event)"><i class="fa-solid fa-book-open"></i><span>${bullText}</span></button>`;
        }
        
        dayCard.innerHTML = `
            <div class="weekly-day-header" style="display:flex; align-items:center;">
                <span>${dayNames[i]} ${currentDate.getDate()} ${dict.monthsShort ? dict.monthsShort[currentDate.getMonth()] : ''}</span>
                ${bulletinHtml}
                ${addBtnHtml ? '<div style="margin-left:5px;">'+addBtnHtml+'</div>' : ''}
            </div>
            <div class="weekly-day-events">
                ${eventsHtml}
            </div>
        `;
        
        container.appendChild(dayCard);
    }
}

// Abrir Modal de Evento (Para Crear/Editar)
function openEventModal(dateStr, eventToEdit = null) {
    DOM.eventForm.reset();
    DOM.loginModal.classList.add('hidden');
    DOM.eventDetailsModal.classList.add('hidden');

    const dict = translations[state.currentLang] || translations['es'];
    const dateObj = new Date(dateStr + 'T12:00:00');
    
    const dayName = dict.days ? dict.days[dateObj.getDay()] : dateObj.toLocaleDateString('es-ES', {weekday: 'long'});
    const monthName = dict.months ? dict.months[dateObj.getMonth()] : dateObj.toLocaleDateString('es-ES', {month: 'long'});
    
    DOM.eventModalDate.textContent = `${dayName}, ${dateObj.getDate()} ${monthName} ${dateObj.getFullYear()}`;

    document.getElementById('eventDate').value = dateStr;

    if (eventToEdit) {
        DOM.eventModalTitle.textContent = dict.modal_editEvent || 'Editar Evento';
        document.getElementById('eventId').value = eventToEdit.id;
        document.getElementById('eventTitle').value = eventToEdit.title;
        document.getElementById('eventTime').value = eventToEdit.time || '';
        document.getElementById('eventLocation').value = eventToEdit.location || '';
        document.getElementById('eventImageBase64').value = eventToEdit.image || '';
        document.getElementById('eventImagePreview').src = eventToEdit.image || '';
        document.getElementById('eventImagePreview').style.display = eventToEdit.image ? 'block' : 'none';
        document.getElementById('eventImage').value = '';
        document.getElementById('eventDesc').value = eventToEdit.desc || '';
        document.getElementById('eventType').value = eventToEdit.type || 'general';
        document.getElementById('eventRequireRsvp').checked = eventToEdit.requireRsvp || false;
        DOM.deleteEventBtn.classList.remove('hidden');
    } else {
        DOM.eventModalTitle.textContent = dict.modal_addEvent || 'Agregar Evento';
        document.getElementById('eventId').value = '';
        document.getElementById('eventImageBase64').value = '';
        document.getElementById('eventImagePreview').style.display = 'none';
        document.getElementById('eventImage').value = '';
        document.getElementById('eventRequireRsvp').checked = false;
        DOM.deleteEventBtn.classList.add('hidden');
    }

    // Configurar permisos del selector de tipo de evento según el rol
    const typeSelect = document.getElementById('eventType');
    if (state.userRole !== 'superadmin' && state.userRole !== 'district' && state.userRole !== 'bishopric' && state.userRole !== 'clerk') {
        const roleToType = {
            'leader_rs': 'relief-society',
            'leader_eq': 'elders',
            'leader_yw': 'youth', 
            'leader_ym': 'young-men',
            'leader_pr': 'primary',
            'leader_ss': 'general'
        };
        const allowedType = roleToType[state.userRole] || 'general';
        
        // Si no está editando, forzamos el tipo al permitido
        if (!eventToEdit) {
            typeSelect.value = allowedType;
        }
        
        // Deshabilitar las otras opciones
        for(let i = 0; i < typeSelect.options.length; i++){
            if(typeSelect.options[i].value !== allowedType) {
                typeSelect.options[i].disabled = true;
                typeSelect.options[i].hidden = true;
            } else {
                typeSelect.options[i].disabled = false;
                typeSelect.options[i].hidden = false;
            }
        }
    } else {
        for(let i = 0; i < typeSelect.options.length; i++){
            typeSelect.options[i].disabled = false;
            typeSelect.options[i].hidden = false;
        }
    }

    // Mostrar opción de alcance si es Presidente de Distrito
    const scopeGroup = document.getElementById('districtScopeGroup');
    const scopeSelect = document.getElementById('eventScope');
    if (scopeGroup) {
        if (state.userRole === 'district') {
            scopeGroup.classList.remove('hidden');
            if (scopeSelect) {
                // Si estamos editando, mostrar el scope actual
                scopeSelect.value = eventToEdit && eventToEdit.scope === 'district' ? 'district' : 'ward';
            }
        } else {
            scopeGroup.classList.add('hidden');
            if (scopeSelect) scopeSelect.value = 'ward';
        }
    }

    DOM.eventModal.classList.remove('hidden');
}

// Abrir Modal de Detalles (Para Ver)
function openEventDetailsModal(evt) {
    try {
        currentViewingEvent = evt;

        const dict = translations[state.currentLang] || translations['es'];
        const dateObj = new Date(evt.date + 'T12:00:00');
        
        // Obtener nombres de mes y día manuales para asegurar traducción correcta
        const dayName = dict.days ? dict.days[dateObj.getDay()] : dateObj.toLocaleDateString('es-ES', {weekday: 'long'});
        const monthName = dict.months ? dict.months[dateObj.getMonth()] : dateObj.toLocaleDateString('es-ES', {month: 'long'});
        
        DOM.detailEventType.textContent = dict['type_' + evt.type] || evt.type;
        DOM.detailEventType.className = `event-type-badge type-${evt.type}`;

        DOM.detailEventTitle.textContent = evt.title || '';
        DOM.detailEventDate.textContent = `${dayName}, ${dateObj.getDate()} ${monthName} ${dateObj.getFullYear()}`;
        DOM.detailEventTime.textContent = evt.time ? evt.time : '--:--';
        DOM.detailEventLocation.textContent = evt.location ? evt.location : '-';
        DOM.detailEventDesc.textContent = evt.desc ? evt.desc : '-';

        // Google Maps Link Logic
        const mapContainer = document.getElementById('detailEventMapContainer');
        const mapBtn = document.getElementById('detailEventMapBtn');
        if (evt.location && evt.location.trim() !== '' && evt.location.toLowerCase().trim() !== 'capilla') {
            if (mapContainer) mapContainer.style.display = 'block';
            if (mapBtn) {
                const locText = evt.location.trim();
                if (locText.startsWith('http://') || locText.startsWith('https://')) {
                    mapBtn.href = locText;
                } else {
                    mapBtn.href = `https://maps.google.com/?q=${encodeURIComponent(locText)}`;
                }
            }
        } else {
            if (mapContainer) mapContainer.style.display = 'none';
        }

        const imgEl = document.getElementById('detailEventImage');
        if (evt.image && evt.image.trim() !== '') {
            imgEl.src = evt.image;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
            imgEl.src = '';
        }

        const roleToType = {
            'leader_rs': 'relief-society',
            'leader_eq': 'elders',
            'leader_yw': 'youth', 
            'leader_ym': 'young-men',
            'leader_pr': 'primary',
            'leader_ss': 'general'
        };

        // Configurar sección RSVP
        const rsvpSection = document.getElementById('rsvpSection');
        if (evt.requireRsvp) {
            rsvpSection.style.display = 'block';
            document.getElementById('rsvpForm').style.display = 'flex';
            document.getElementById('rsvpSuccessMsg').style.display = 'none';
            document.getElementById('rsvpName').value = '';
            document.getElementById('rsvpCount').value = '1';

            if (state.isAdmin && (state.isSuperAdmin || state.userRole === 'superadmin' || state.userRole === 'district' || state.userRole === 'bishopric' || state.userRole === 'clerk' || evt.type === roleToType[state.userRole])) {
                document.getElementById('rsvpAdminView').style.display = 'block';
                const rsvpList = document.getElementById('rsvpList');
                rsvpList.innerHTML = '';
                let total = 0;
                if (evt.rsvps && evt.rsvps.length > 0) {
                    evt.rsvps.forEach((r, idx) => {
                        total += parseInt(r.count || 0);
                        const delay = idx * 0.1;
                        rsvpList.innerHTML += `<li class="animate-item list-item-hover" style="animation-delay: ${delay}s; padding:8px 5px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom: 2px; border-radius: 4px;"><b style="color:var(--text-primary);">${r.name || 'Invitado'}</b> <span style="float:right; color:var(--accent-gold);">${r.count || 0} pers.</span></li>`;
                    });
                } else {
                    rsvpList.innerHTML = '<li style="color:var(--text-secondary); font-style:italic;">Nadie ha confirmado aún.</li>';
                }
                document.getElementById('rsvpTotal').textContent = total;
            } else {
                document.getElementById('rsvpAdminView').style.display = 'none';
            }
        } else {
            rsvpSection.style.display = 'none';
        }

        if (state.isAdmin) {
            // Solo puede editar/borrar si es del obispado/secretario o si el evento es de su organización
            const allowedType = roleToType[state.userRole];
            
            if (state.isSuperAdmin || state.userRole === 'superadmin' || state.userRole === 'district' || state.userRole === 'bishopric' || state.userRole === 'clerk' || evt.type === allowedType) {
                DOM.detailAdminActions.style.display = 'flex';
            } else {
                DOM.detailAdminActions.style.display = 'none';
            }
        } else {
            DOM.detailAdminActions.style.display = 'none';
        }

        // Cargar comentarios específicos de este evento
        loadComments(evt.id);
        updateSubscriptionUI(evt.id);

    } catch (e) {
        console.error("Error al abrir detalles:", e);
    }

    DOM.eventDetailsModal.classList.remove('hidden');
}

// Helper para preguntar sobre eventos recurrentes
function askRecurringAction() {
    return new Promise((resolve) => {
        const modal = document.getElementById('recurringActionModal');
        const btnSingle = document.getElementById('recurringActionSingleBtn');
        const btnSeries = document.getElementById('recurringActionSeriesBtn');
        const btnCancel = document.getElementById('recurringActionCancelBtn');
        
        // Limpiar event listeners previos
        const newSingle = btnSingle.cloneNode(true);
        const newSeries = btnSeries.cloneNode(true);
        const newCancel = btnCancel.cloneNode(true);
        btnSingle.parentNode.replaceChild(newSingle, btnSingle);
        btnSeries.parentNode.replaceChild(newSeries, btnSeries);
        btnCancel.parentNode.replaceChild(newCancel, btnCancel);
        
        modal.classList.remove('hidden');
        
        newSingle.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve("1");
        });
        
        newSeries.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve("2");
        });
        
        newCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
            resolve(null);
        });
    });
}

// Guardar Evento
async function saveEvent(e) {
    e.preventDefault();

    const id = document.getElementById('eventId').value || Date.now().toString();
    const existingEvt = state.events.find(e => e.id === id);
    const scope = document.getElementById('eventScope') ? document.getElementById('eventScope').value : 'ward';

    const eventObj = {
        id: id,
        date: document.getElementById('eventDate').value,
        title: document.getElementById('eventTitle').value,
        time: document.getElementById('eventTime').value,
        location: document.getElementById('eventLocation').value,
        image: document.getElementById('eventImageBase64').value,
        desc: document.getElementById('eventDesc').value,
        type: document.getElementById('eventType').value,
        requireRsvp: document.getElementById('eventRequireRsvp').checked,
        rsvps: existingEvt && existingEvt.rsvps ? existingEvt.rsvps : [],
        scope: scope
    };

    const submitBtn = document.querySelector('#eventForm button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Guardar Evento';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    }

    const isNewEvent = !document.getElementById('eventId').value;
    const isRecurring = document.getElementById('eventRecurring') && document.getElementById('eventRecurring').checked && isNewEvent;

    let eventsToSave = [];
    if (isRecurring) {
        const groupId = id; // usar el ID base como identificador del grupo recurrente
        for (let i = 0; i < 12; i++) {
            const rId = id + (i > 0 ? "-" + i : "");
            const dateParts = eventObj.date.split('-');
            if (dateParts.length === 3) {
                let dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                dateObj.setDate(dateObj.getDate() + (i * 7));
                const newDateStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
                eventsToSave.push({ ...eventObj, id: rId, date: newDateStr, recurringGroupId: groupId });
            } else {
                eventsToSave.push({ ...eventObj, id: rId, recurringGroupId: groupId });
            }
        }
    } else if (!isNewEvent && existingEvt && existingEvt.recurringGroupId) {
        // Es una edición de un evento recurrente
        const editType = await askRecurringAction();
        
        if (!editType) {
            // Cancelado
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
            return;
        }

        if (editType === "2") {
            const seriesEvents = state.events.filter(e => e.recurringGroupId === existingEvt.recurringGroupId);
            seriesEvents.forEach(se => {
                eventsToSave.push({
                    ...eventObj,
                    id: se.id,
                    date: se.date, // Mantiene la fecha de cada evento de la serie
                    recurringGroupId: se.recurringGroupId,
                    rsvps: se.rsvps || []
                });
            });
        } else {
            // Edita solo este y lo separa de la serie
            eventObj.recurringGroupId = null;
            eventsToSave.push(eventObj);
        }
    } else {
        // Evento normal o nuevo sin repetición
        eventsToSave.push(eventObj);
    }

    // Guardar en la base de datos o almacenamiento local
    if (isFirebaseConfigured) {
        if (typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser) {
            alert("Acceso denegado: Necesitas volver a iniciar sesión para guardar cambios.");
            DOM.eventModal.classList.add('hidden');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
            return;
        }

        const collName = (eventObj.scope === 'district') ? state.districtId + "_events" : state.districtId + "_" + state.wardId + "_events";
        let batchPromises = eventsToSave.map(evt => db.collection(collName).doc(evt.id).set(evt));

        Promise.all(batchPromises)
            .then(() => {
                DOM.eventModal.classList.add('hidden');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
                if (isNewEvent) {
                    triggerNotification(eventsToSave[0]);
                }
            })
            .catch((error) => {
                console.error("Error al guardar en internet: ", error);
                alert("Error al guardar: " + error.message);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
    } else {
        // Si es edición, remover el antiguo
        state.events = state.events.filter(ev => ev.id !== id);
        
        eventsToSave.forEach(evt => {
            state.events.push(evt);
        });

        localStorage.setItem('church_events', JSON.stringify(state.events));
        DOM.eventModal.classList.add('hidden');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
        renderCalendar();
        if (isNewEvent) {
            triggerNotification(eventsToSave[0]);
        }
    }
}

function triggerNotification(evt) {
    // 1. Notificación local para el admin que crea el evento
    if ('Notification' in window && Notification.permission === 'granted') {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio error:', e));

        const title = "Nuevo Evento: " + evt.title;
        const options = {
            body: `Fecha: ${evt.date} | Hora: ${evt.time || 'Todo el día'}`,
            icon: 'images/temple.jpg'
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(function(registration) {
                registration.showNotification(title, options).catch(e => console.error("SW Notif Error:", e));
            });
        } else {
            try {
                new Notification(title, options);
            } catch (e) {
                console.error("Error Notification local: ", e);
            }
        }
    }

    // 2. Enviar Push a TODOS los suscriptores del barrio via Cloud Function HTTP
    if (isFirebaseConfigured && state.districtId && state.wardId) {
        const pushUrl = "https://us-central1-calendario-de-barrio.cloudfunctions.net/sendPush";
        fetch(pushUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                districtId: state.districtId,
                wardId: state.wardId,
                scope: evt.scope || 'ward',
                title: evt.title,
                date: evt.date,
                time: evt.time || '',
                location: evt.location || ''
            })
        })
        .then(r => r.json())
        .then(data => console.log("Push enviado a", data.sent, "dispositivos"))
        .catch(err => console.error("Error enviando push al servidor:", err));
    }
}

// Eliminar Evento
async function deleteEvent() {
    const id = document.getElementById('eventId').value;
    const currentEvt = state.events.find(e => e.id === id);
    let idsToDelete = [id];

    if (currentEvt && currentEvt.recurringGroupId) {
        const deleteType = await askRecurringAction();
        
        if (deleteType === "2") {
            idsToDelete = state.events.filter(e => e.recurringGroupId === currentEvt.recurringGroupId).map(e => e.id);
        } else if (deleteType !== "1") {
            return; // Cancelado o input inválido
        }
    } else {
        if (!confirm('¿Está seguro de eliminar este evento?')) {
            return;
        }
    }

    if (isFirebaseConfigured) {
        const collName = (currentEvt && currentEvt.scope === 'district') ? state.districtId + "_events" : state.districtId + "_" + state.wardId + "_events";
        let deletePromises = idsToDelete.map(eventId => db.collection(collName).doc(eventId).delete());

        Promise.all(deletePromises)
            .then(() => {
                DOM.eventModal.classList.add('hidden');
            })
            .catch((error) => {
                console.error("Error al eliminar de internet: ", error);
            });
    } else {
        state.events = state.events.filter(ev => !idsToDelete.includes(ev.id));
        localStorage.setItem('church_events', JSON.stringify(state.events));
        DOM.eventModal.classList.add('hidden');
        renderCalendar();
    }
}

// Listeners
function setupEventListeners() {
    // Efecto Parallax en el fondo (Mucho más notable)
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        // Mover el fondo a un 20% de la velocidad de scroll para que el fondo suba más rápido y se vea el templo completo
        document.body.style.backgroundPosition = `center ${scrollY * 0.2}px`;
    });

    // Navegación de meses
    DOM.prevMonth.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderCalendar();
    });

    DOM.nextMonth.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Tema Claro/Oscuro
    document.getElementById('themeToggleBtn').addEventListener('click', function () {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('church_light_theme', isLight);

        if (isLight) {
            this.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            this.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    });

    // Login Modals
    DOM.loginBtn.addEventListener('click', () => {
        DOM.loginForm.reset();
        DOM.loginError.classList.add('hidden');
        DOM.loginModal.classList.remove('hidden');
    });

    DOM.logoutBtn.addEventListener('click', () => {
        if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut();
        } else {
            sessionStorage.removeItem('church_admin_logged');
            sessionStorage.removeItem('church_superadmin_logged');
            sessionStorage.removeItem('church_admin_role');
            window.location.reload();
        }
    });

    // Avisos Urgentes Modal
    const manageAnnouncementBtn = document.getElementById('manageAnnouncementBtn');
    if (manageAnnouncementBtn) {
        manageAnnouncementBtn.addEventListener('click', () => {
            const modal = document.getElementById('announcementModal');
            document.getElementById('announcementInput').value = currentAnnouncement;
            modal.classList.remove('hidden');
        });
    }

    const announcementForm = document.getElementById('announcementForm');
    if (announcementForm) {
        announcementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('announcementInput').value;
            if (isFirebaseConfigured && state.unitCode) {
                db.collection(state.districtId + "_" + state.wardId + "_settings").doc("announcement").set({ text: text })
                    .then(() => {
                        document.getElementById('announcementModal').classList.add('hidden');
                    }).catch(err => alert("Error al guardar: " + err.message));
            } else {
                localStorage.setItem('church_announcement', text);
                currentAnnouncement = text;
                renderAnnouncement();
                document.getElementById('announcementModal').classList.add('hidden');
            }
        });
    }

    // GPS Location (API nativa)
    const getGpsBtn = document.getElementById('getGpsBtn');
    if (getGpsBtn) {
        getGpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                const icon = getGpsBtn.innerHTML;
                getGpsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    document.getElementById('eventLocation').value = `${lat},${lng}`;
                    getGpsBtn.innerHTML = icon;
                }, (error) => {
                    alert("No se pudo obtener la ubicación: " + error.message);
                    getGpsBtn.innerHTML = icon;
                });
            } else {
                alert("La geolocalización no es soportada por este navegador.");
            }
        });
    }

    // Map Location Picker (Leaflet Interactivo)
    const openMapModalBtn = document.getElementById('openMapModalBtn');
    const mapPickerModal = document.getElementById('mapPickerModal');
    const confirmMapLocationBtn = document.getElementById('confirmMapLocationBtn');
    const mapCoordinatesDisplay = document.getElementById('mapCoordinatesDisplay');
    
    let leafletMapInstance = null;
    let leafletMarker = null;
    let selectedMapCoords = null;

    if (openMapModalBtn && mapPickerModal) {
        openMapModalBtn.addEventListener('click', () => {
            mapPickerModal.classList.remove('hidden');
            
            // Inicializar el mapa solo una vez cuando el modal se abre para evitar problemas de renderizado
            if (!leafletMapInstance) {
                leafletMapInstance = L.map('leafletMap').setView([-15.0, -65.0], 4); // Centro genérico
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(leafletMapInstance);

                leafletMapInstance.on('click', function(e) {
                    const lat = e.latlng.lat;
                    const lng = e.latlng.lng;
                    selectedMapCoords = { lat, lng };
                    
                    if (leafletMarker) {
                        leafletMarker.setLatLng(e.latlng);
                    } else {
                        leafletMarker = L.marker(e.latlng).addTo(leafletMapInstance);
                    }
                    mapCoordinatesDisplay.textContent = `Seleccionado: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    mapCoordinatesDisplay.style.color = '#2ecc71';
                });

                // Intentar geolocalizar al usuario automáticamente para centrar el mapa
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            leafletMapInstance.setView([pos.coords.latitude, pos.coords.longitude], 15);
                        },
                        () => {}, // ignorar error, usar centro genérico
                        { timeout: 5000 }
                    );
                }
            }
            
            // Necesario para que Leaflet recalcule su tamaño si estaba oculto con display:none
            setTimeout(() => {
                leafletMapInstance.invalidateSize();
            }, 200);
        });
        
        if (confirmMapLocationBtn) {
            confirmMapLocationBtn.addEventListener('click', () => {
                if (selectedMapCoords) {
                    document.getElementById('eventLocation').value = `${selectedMapCoords.lat.toFixed(6)},${selectedMapCoords.lng.toFixed(6)}`;
                    mapPickerModal.classList.add('hidden');
                } else {
                    alert('Por favor toca en el mapa para seleccionar una ubicación primero.');
                }
            });
        }
    }

    // Cerrar modales
    DOM.closeModals.forEach(btn => {
        btn.addEventListener('click', function () {
            this.closest('.modal-overlay').classList.add('hidden');
        });
    });

    // Click fuera del modal para cerrar
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('hidden');
        }
    });

    // Olvidé mi contraseña - Mostrar/ocultar formulario
    const forgotPassBtn = document.getElementById('forgotPassBtn');
    if (forgotPassBtn) {
        forgotPassBtn.addEventListener('click', () => {
            const form = document.getElementById('forgotPassForm');
            if (form) {
                form.classList.toggle('hidden');
                // Limpiar estado previo
                const msg = document.getElementById('forgotPassMsg');
                if (msg) { msg.classList.add('hidden'); msg.textContent = ''; }
            }
        });
    }

    // Enviar correo de recuperación basado en NICK
    const sendResetEmailBtn = document.getElementById('sendResetEmailBtn');
    if (sendResetEmailBtn) {
        sendResetEmailBtn.addEventListener('click', async () => {
            const nickInput = document.getElementById('forgotPassEmail'); // Usamos el mismo campo para el nick
            const msg = document.getElementById('forgotPassMsg');
            const nick = nickInput ? nickInput.value.trim() : '';

            if (!nick) {
                alert("Por favor, ingrese su Nick de usuario.");
                return;
            }

            if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    sendResetEmailBtn.disabled = true;
                    sendResetEmailBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';
                    
                    // 1. Buscar el mail real en la lista de admins del barrio
                    const doc = await db.collection(state.districtId + "_settings").doc("adminsList").get();
                    if (!doc.exists) throw new Error("No se encontró la lista de líderes.");
                    
                    const admins = doc.data().list || [];
                    const found = admins.find(a => a.username.toLowerCase() === nick.toLowerCase());
                    
                    if (!found || !found.realEmail) {
                        throw new Error("No encontramos un correo de recuperación para ese Nick.");
                    }

                    // 2. Mandar el link al mail real
                    await firebase.auth().sendPasswordResetEmail(found.realEmail);
                    
                    msg.textContent = `✅ Enlace enviado al correo registrado: ${found.realEmail.replace(/(.{3})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + "*".repeat(gp3.length))}`;
                    msg.style.color = '#2ecc71';
                    msg.classList.remove('hidden');
                    nickInput.value = '';
                } catch (err) {
                    console.error(err);
                    msg.textContent = '❌ ' + (err.message || 'Error desconocido');
                    msg.style.color = '#e74c3c';
                    msg.classList.remove('hidden');
                } finally {
                    sendResetEmailBtn.disabled = false;
                    sendResetEmailBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar enlace de recuperación';
                }
            } else {
                alert("Servicio no disponible sin Firebase.");
            }
        });
    }

    // Submit Login con soporte para NICK
    DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value;

        // 1. Validar Super Admin Siempre (Firebase o Local)
        if (user === 'papafrity' && pass === 'Maspancho94') {
            handleLoginSuccess(true, 'superadmin');
            return;
        }

        if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
            try {
                // Si el usuario puso un mail real (contiene @), lo usamos directo. 
                // Si no, buscamos qué mail real tiene ese nick.
                let loginEmail = user.includes('@') ? user : null;
                
                if (!loginEmail) {
                    const doc = await db.collection(state.districtId + "_settings").doc("adminsList").get();
                    if (doc.exists) {
                        const admins = doc.data().list || [];
                        const found = admins.find(a => a.username.toLowerCase() === user.toLowerCase());
                        if (found) loginEmail = found.realEmail;
                    }
                }

                // Fallback al formato antiguo si no encontramos el mail real
                if (!loginEmail) loginEmail = `${user}_${state.unitCode}@calendario.com`;

                await firebase.auth().signInWithEmailAndPassword(loginEmail, pass);
                DOM.loginModal.classList.add('hidden');
                DOM.loginError.classList.add('hidden');
            } catch (err) {
                console.error(err);
                DOM.loginError.classList.remove('hidden');
            }
            return;
        }

        // --- FALLBACK LOCAL ---
        const localAdmins = JSON.parse(localStorage.getItem('church_admins') || '[]');
        const loggedAdmin = localAdmins.find(a => a.username === user && a.password === pass);
        if (loggedAdmin) {
            handleLoginSuccess(false, loggedAdmin.role || 'general');
            return;
        }

        DOM.loginError.classList.remove('hidden');
    });

    // --- LÓGICA DE SUPER ADMIN (GESTIONAR CUENTAS) ---
    DOM.manageAdminsBtn.addEventListener('click', () => {
        DOM.manageAdminsModal.classList.remove('hidden');
        renderAdminsList();
    });

    if (DOM.manageWardsBtn) {
        DOM.manageWardsBtn.addEventListener('click', () => {
            document.getElementById('manageWardsDistrictName').textContent = state.districtName;
            DOM.manageWardsModal.classList.remove('hidden');
        });
    }

    if (DOM.createWardForm) {
        DOM.createWardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const wName = document.getElementById('newWardName').value.trim();
            if (!wName) return;

            const wId = wName.toLowerCase().replace(/\s+/g, '-');
            const submitBtn = DOM.createWardForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';

            try {
                if (isFirebaseConfigured) {
                    await firebase.firestore().collection(state.districtId + "_wards").doc(wId).set({
                        name: wName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                alert("Zona/Rama '" + wName + "' creada con éxito. Ahora puedes seleccionarla al cambiar de zona.");
                DOM.createWardForm.reset();
                DOM.manageWardsModal.classList.add('hidden');
            } catch(error) {
                console.error("Error creating ward:", error);
                alert("Hubo un error al crear la zona.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Crear Zona/Rama';
            }
        });
    }

    DOM.createAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUser = document.getElementById('newAdminUser').value.trim();
        const newRole = document.getElementById('newAdminRole').value;
        const newPass = document.getElementById('newAdminPass').value;
        const realEmail = document.getElementById('newAdminRealEmail').value.trim();
        const editIndex = parseInt(document.getElementById('editAdminIndex').value);

        if (!newRole || !realEmail) {
            alert("Debe completar todos los campos.");
            return;
        }

        if (newPass.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (isFirebaseConfigured && typeof firebase !== 'undefined' && firebase.auth) {
            try {
                const btn = document.getElementById('adminSubmitBtn');
                btn.disabled = true;
                btn.textContent = "Procesando...";

                // 1. Si es edición, primero eliminamos la entrada vieja de la lista (Auth no se puede editar fácil)
                const docRef = db.collection(state.districtId + "_settings").doc("adminsList");
                const doc = await docRef.get();
                let admins = doc.exists ? doc.data().list || [] : [];

                // 2. Crear/Actualizar en Firebase Auth (usamos Real Email como ID principal ahora)
                let secondaryApp = firebase.apps.find(app => app.name === 'Secondary');
                if (!secondaryApp) secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
                
                try {
                    await secondaryApp.auth().createUserWithEmailAndPassword(realEmail, newPass);
                } catch(e) {
                    // Si el usuario ya existe, solo intentamos loguear para confirmar (o ignoramos si es edición)
                    console.log("Usuario ya existe en Auth o error: ", e.message);
                }
                await secondaryApp.auth().signOut();
                
                // 3. Guardar en la lista de Firestore
                let adminWardName = state.wardName;
                if (editIndex >= 0 && admins[editIndex].wardName) {
                    adminWardName = admins[editIndex].wardName; // Preservar la rama original al editar
                }
                const adminData = { username: newUser, realEmail: realEmail, role: newRole, wardName: adminWardName };
                if (editIndex >= 0) {
                    admins[editIndex] = adminData;
                } else {
                    admins.push(adminData);
                }
                
                await docRef.set({ list: admins });
                
                // Reset Form
                DOM.createAdminForm.reset();
                document.getElementById('editAdminIndex').value = "-1";
                document.getElementById('adminSubmitBtn').textContent = "Crear Cuenta de Líder";
                document.getElementById('cancelEditAdminBtn').classList.add('hidden');
                
                renderAdminsList();
                alert(editIndex >= 0 ? "¡Cuenta actualizada/Sucesión completada!" : "¡Cuenta creada con éxito!");
            } catch (err) {
                console.error(err);
                alert("Error: " + err.message);
            } finally {
                document.getElementById('adminSubmitBtn').disabled = false;
            }
        } else {
            // Local fallback...
            const localAdmins = JSON.parse(localStorage.getItem('church_admins') || '[]');
            let adminWardName = state.wardName;
            if (editIndex >= 0 && localAdmins[editIndex].wardName) {
                adminWardName = localAdmins[editIndex].wardName;
            }
            const adminData = { id: Date.now().toString(), username: newUser, role: newRole, password: newPass, realEmail: realEmail, wardName: adminWardName };
            if (editIndex >= 0) localAdmins[editIndex] = adminData;
            else localAdmins.push(adminData);
            
            localStorage.setItem('church_admins', JSON.stringify(localAdmins));
            DOM.createAdminForm.reset();
            renderAdminsList();
        }
    });

    // Función para cargar datos en el formulario para editar/sucesor
    window.editAdmin = async function(index) {
        let admins = [];
        if (isFirebaseConfigured) {
            const doc = await db.collection(state.districtId + "_settings").doc("adminsList").get();
            admins = doc.data().list || [];
        } else {
            admins = JSON.parse(localStorage.getItem('church_admins') || '[]');
        }

        const admin = admins[index];
        if (admin) {
            document.getElementById('newAdminUser').value = admin.username;
            document.getElementById('newAdminRole').value = admin.role;
            document.getElementById('newAdminRealEmail').value = admin.realEmail || '';
            document.getElementById('newAdminPass').value = ""; // Por seguridad no mostramos la clave vieja
            document.getElementById('newAdminPass').placeholder = "Nueva contraseña para el sucesor";
            document.getElementById('editAdminIndex').value = index;
            
            document.getElementById('adminSubmitBtn').textContent = "Guardar Cambios / Registrar Sucesor";
            document.getElementById('cancelEditAdminBtn').classList.remove('hidden');
            
            document.getElementById('newAdminUser').focus();
        }
    };

    const cancelEditAdminBtn = document.getElementById('cancelEditAdminBtn');
    if (cancelEditAdminBtn) {
        cancelEditAdminBtn.addEventListener('click', () => {
            DOM.createAdminForm.reset();
            document.getElementById('editAdminIndex').value = "-1";
            document.getElementById('adminSubmitBtn').textContent = "Crear Cuenta de Líder";
            cancelEditAdminBtn.classList.add('hidden');
            document.getElementById('newAdminPass').placeholder = "Contraseña Inicial";
        });
    }



    // Submit Evento
    DOM.eventForm.addEventListener('submit', saveEvent);

    // RSVP Submit
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentViewingEvent) return;

            const submitBtn = rsvpForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : 'Confirmar';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
            }

            const name = document.getElementById('rsvpName').value.trim();
            const count = parseInt(document.getElementById('rsvpCount').value);
            
            if (!currentViewingEvent.rsvps) currentViewingEvent.rsvps = [];
            currentViewingEvent.rsvps.push({ name, count });
            
            if (isFirebaseConfigured) {
                const collName = (currentViewingEvent.scope === 'district') ? "district_events" : "events";
                db.collection(collName).doc(currentViewingEvent.id).update({
                    rsvps: currentViewingEvent.rsvps
                }).then(() => {
                    document.getElementById('rsvpForm').style.display = 'none';
                    document.getElementById('rsvpSuccessMsg').style.display = 'block';
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }).catch(err => {
                    alert("Error al confirmar: " + err.message);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                });
            } else {
                localStorage.setItem('church_events', JSON.stringify(state.events));
                document.getElementById('rsvpForm').style.display = 'none';
                document.getElementById('rsvpSuccessMsg').style.display = 'block';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }

    // Procesar imagen subida
    const eventImageInput = document.getElementById('eventImage');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Comprimir a JPEG 70% calidad
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    document.getElementById('eventImageBase64').value = dataUrl;
                    const preview = document.getElementById('eventImagePreview');
                    preview.src = dataUrl;
                    preview.style.display = 'block';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Eliminar Evento
    DOM.deleteEventBtn.addEventListener('click', deleteEvent);

    // Editar desde detalles
    DOM.editFromDetailBtn.addEventListener('click', () => {
        DOM.eventDetailsModal.classList.add('hidden');
        if (currentViewingEvent) {
            openEventModal(currentViewingEvent.date, currentViewingEvent);
        }
    });

    // Filtro de eventos
    const eventFilter = document.getElementById('eventFilter');
    if (eventFilter) {
        eventFilter.addEventListener('change', (e) => {
            state.currentFilter = e.target.value;
            renderCalendar();
            if (window.innerWidth <= 768) {
                renderMobileWeeklyView();
            }
        });
    }

    // Exportar a Google Calendar directamente
    const exportCalendarBtn = document.getElementById('exportCalendarBtn');
    if (exportCalendarBtn) {
        exportCalendarBtn.innerHTML = '<i class="fa-brands fa-google"></i> Añadir a Google Calendar';
        exportCalendarBtn.addEventListener('click', () => {
            if (!currentViewingEvent) return;
            const evt = currentViewingEvent;
            
            const formatGoogleDate = (dateStr, timeStr) => {
                const dateParts = dateStr.split('-');
                let d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                if (timeStr) {
                    const timeParts = timeStr.split(':');
                    d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
                }
                return d.toISOString().replace(/-|:|\.\d+/g, '');
            };
            
            let startDate = formatGoogleDate(evt.date, evt.time);
            let endDate = startDate;
            
            if (evt.time) {
                const dateParts = evt.date.split('-');
                const timeParts = evt.time.split(':');
                let endD = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                endD.setHours(parseInt(timeParts[0]) + 1, parseInt(timeParts[1]));
                endDate = endD.toISOString().replace(/-|:|\.\d+/g, '');
            } else {
                const dateParts = evt.date.split('-');
                let endD = new Date(dateParts[0], dateParts[1] - 1, parseInt(dateParts[2]) + 1);
                endDate = endD.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 8);
                startDate = startDate.substring(0, 8);
            }
            
            const title = encodeURIComponent(evt.title);
            const details = encodeURIComponent(evt.desc || '');
            const loc = encodeURIComponent(evt.location || '');
            
            const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${loc}`;
            
            window.open(googleCalUrl, '_blank');
        });
    }

    // Botón de Cambiar Zona
    const changeUnitCodeBtn = document.getElementById('changeUnitCodeBtn');
    if (changeUnitCodeBtn) {
        changeUnitCodeBtn.addEventListener('click', () => {
            if (confirm("¿Desea cambiar de distrito o rama? Se cerrará la sesión actual.")) {
                localStorage.removeItem('church_district_id');
                localStorage.removeItem('church_district_name');
                localStorage.removeItem('church_ward_id');
                localStorage.removeItem('church_ward_name');
                localStorage.removeItem('church_unit_code'); // por si acaso
                sessionStorage.clear();
                if (isFirebaseConfigured && firebase.auth()) {
                    firebase.auth().signOut().then(() => {
                        window.location.reload();
                    });
                } else {
                    window.location.reload();
                }
            }
        });
    }

    // --- COMPARTIR EVENTO (Web Share API / WhatsApp) ---
    const shareWhatsappBtn = document.getElementById('shareWhatsappBtn');
    if (shareWhatsappBtn) {
        shareWhatsappBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartir Evento';
        shareWhatsappBtn.addEventListener('click', async () => {
            if (!currentViewingEvent) return;
            const evt = currentViewingEvent;
            
            // Texto formateado para compartir
            const text = `📅 *${evt.title}*\n⌚ ${evt.time || 'Todo el día'}\n📍 ${evt.location || 'Sin lugar especificado'}\n📝 ${evt.desc || ''}\n\n👉 Mira todos los detalles en nuestro calendario oficial:\n${window.location.href}`;
            
            // Intentar usar la Web Share API nativa (muy útil en celulares)
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: evt.title,
                        text: text
                    });
                    console.log('Evento compartido con éxito');
                } catch (error) {
                    console.log('Error compartiendo:', error);
                }
            } else {
                // Fallback: Si está en una PC vieja que no soporta Web Share API, abrir WhatsApp web
                const encodedText = encodeURIComponent(text);
                window.open(`https://wa.me/?text=${encodedText}`, '_blank');
            }
        });
    }

    // --- BOLETÍN ---
    window.openBulletinModal = function(e) {
        if (e) e.stopPropagation();
        const bulletinModal = document.getElementById('bulletinModal');
        const bulletinViewContent = document.getElementById('bulletinViewContent');
        const bulletinEditForm = document.getElementById('bulletinEditForm');
        
        renderBulletinView();
        bulletinViewContent.classList.remove('hidden');
        bulletinEditForm.classList.add('hidden');
        bulletinModal.classList.remove('hidden');
    };

    const bulletinEditForm = document.getElementById('bulletinEditForm');
    const editBulletinBtn = document.getElementById('editBulletinBtn');

    if (editBulletinBtn) {
        editBulletinBtn.addEventListener('click', () => {
            document.getElementById('bulletinViewContent').classList.toggle('hidden');
            document.getElementById('bulletinEditForm').classList.toggle('hidden');
        });
    }

    if (bulletinEditForm) {
        bulletinEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newBull = {
                presiding: document.getElementById('bullPresiding').value,
                conducting: document.getElementById('bullConducting').value,
                openingHymn: document.getElementById('bullOpeningHymn').value,
                invocation: document.getElementById('bullInvocation').value,
                wardBusiness: document.getElementById('bullWardBusiness').value,
                sacramentHymn: document.getElementById('bullSacramentHymn').value,
                speakers: document.getElementById('bullSpeakers').value,
                closingHymn: document.getElementById('bullClosingHymn').value,
                benediction: document.getElementById('bullBenediction').value
            };

            if (isFirebaseConfigured) {
                db.collection(state.districtId + "_" + state.wardId + "_settings").doc("bulletin").set(newBull).then(() => {
                    bulletinEditForm.classList.add('hidden');
                    bulletinViewContent.classList.remove('hidden');
                }).catch(err => alert("Error al guardar boletín: " + err.message));
            } else {
                currentBulletin = newBull;
                localStorage.setItem('church_bulletin', JSON.stringify(newBull));
                renderBulletinView();
                bulletinEditForm.classList.add('hidden');
                bulletinViewContent.classList.remove('hidden');
            }
        });
    }
}

// --- LÓGICA DE AVISOS URGENTES ---
let currentAnnouncement = "";

function loadAnnouncement() {
    if (isFirebaseConfigured && state.unitCode) {
        db.collection(state.districtId + "_" + state.wardId + "_settings").doc("announcement").onSnapshot((doc) => {
            if (doc.exists) {
                currentAnnouncement = doc.data().text || "";
            } else {
                currentAnnouncement = "";
            }
            renderAnnouncement();
        });
    } else {
        currentAnnouncement = localStorage.getItem('church_announcement') || "";
        renderAnnouncement();
    }
}

function renderAnnouncement() {
    const banner = document.getElementById('announcementBanner');
    const textEl = document.getElementById('announcementText');
    if (currentAnnouncement.trim() !== "") {
        textEl.textContent = currentAnnouncement;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

// --- LÓGICA DEL BOLETÍN ---
let currentBulletin = {};

function loadBulletin() {
    if (isFirebaseConfigured) {
        db.collection(state.districtId + "_" + state.wardId + "_settings").doc("bulletin").onSnapshot((doc) => {
            if (doc.exists) {
                currentBulletin = doc.data();
            } else {
                currentBulletin = {};
            }
            renderBulletinView();
        });
    } else {
        currentBulletin = JSON.parse(localStorage.getItem('church_bulletin') || '{}');
        renderBulletinView();
    }
}

function renderBulletinView() {
    const b = currentBulletin;
    const content = document.getElementById('bulletinViewContent');
    if (!content) return;

    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const nextSunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSunday);
    
    document.getElementById('bulletinDate').textContent = `Domingo, ${nextSunday.getDate()} de ${nextSunday.toLocaleString('es-ES', { month: 'long' })}`;

    content.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif;">
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 0.9rem;">
                <div><span style="color:var(--accent-gold); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Preside</span><br><strong>${b.presiding || '---'}</strong></div>
                <div><span style="color:var(--accent-gold); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Dirige</span><br><strong>${b.conducting || '---'}</strong></div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid rgba(212, 175, 55, 0.2); margin: 20px 0;">
            
            <div style="margin-bottom: 15px;">
                <span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Himno Inicial</span>
                <div style="font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #fff;">${b.openingHymn || '---'}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Primera Oración</span>
                <div style="font-size: 1.1rem;">${b.invocation || '---'}</div>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <span style="color:var(--accent-gold); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Asuntos del Barrio / Anuncios</span>
                <div style="font-size: 0.95rem; margin-top: 8px; line-height: 1.5;">${(b.wardBusiness || 'Ninguno').replace(/\n/g, '<br/>')}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Himno Sacramental</span>
                <div style="font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #fff;">${b.sacramentHymn || '---'}</div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid rgba(212, 175, 55, 0.2); margin: 20px 0;">
            
            <div style="margin-bottom: 20px;">
                <span style="color:var(--accent-gold); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Mensajes</span>
                <div style="font-size: 1.1rem; line-height: 1.8; margin-top: 10px;">${(b.speakers || '---').replace(/\n/g, '<br/>')}</div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid rgba(212, 175, 55, 0.2); margin: 20px 0;">
            
            <div style="margin-bottom: 15px;">
                <span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Himno Final</span>
                <div style="font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: #fff;">${b.closingHymn || '---'}</div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Última Oración</span>
                <div style="font-size: 1.1rem;">${b.benediction || '---'}</div>
            </div>
        </div>
    `;

    document.getElementById('bullPresiding').value = b.presiding || '';
    document.getElementById('bullConducting').value = b.conducting || '';
    document.getElementById('bullOpeningHymn').value = b.openingHymn || '';
    document.getElementById('bullInvocation').value = b.invocation || '';
    document.getElementById('bullWardBusiness').value = b.wardBusiness || '';
    document.getElementById('bullSacramentHymn').value = b.sacramentHymn || '';
    document.getElementById('bullSpeakers').value = b.speakers || '';
    document.getElementById('bullClosingHymn').value = b.closingHymn || '';
    document.getElementById('bullBenediction').value = b.benediction || '';

    if (state.isAdmin && (state.isSuperAdmin || state.userRole === 'superadmin' || state.userRole === 'district' || state.userRole === 'bishopric' || state.userRole === 'clerk')) {
        document.getElementById('bulletinAdminActions').style.display = 'block';
    } else {
        document.getElementById('bulletinAdminActions').style.display = 'none';
        document.getElementById('bulletinEditForm').classList.add('hidden');
        document.getElementById('bulletinViewContent').classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', checkUnitCode);

// --- SISTEMA DE PREGUNTAS Y COMENTARIOS POR EVENTO ---
let commentsData = [];
let commentsUnsubscribe = null;

function loadComments(eventId) {
    if (commentsUnsubscribe) {
        commentsUnsubscribe();
        commentsUnsubscribe = null;
    }

    if (isFirebaseConfigured && state.unitCode) {
        // Quitamos el .orderBy para que no pida índices manuales y lo ordenamos en el cliente
        commentsUnsubscribe = db.collection("comments")
            .where("eventId", "==", eventId)
            .onSnapshot((snapshot) => {
                let newComments = [];
                snapshot.forEach(doc => {
                    newComments.push({ id: doc.id, ...doc.data() });
                });
                
                // Ordenar por fecha (más reciente primero)
                newComments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                
                // Si hay un comentario nuevo y el usuario está suscrito, notificar
                if (commentsData.length > 0 && newComments.length > commentsData.length) {
                    const latest = newComments[0];
                    checkSubscriptionsAndNotify(eventId, latest.text);
                }

                commentsData = newComments;
                renderComments();
            });
    } else {
        const allComments = JSON.parse(localStorage.getItem('church_comments') || '[]');
        commentsData = allComments.filter(c => c.eventId === eventId);
        commentsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        renderComments();
    }
}

function renderComments() {
    const list = document.getElementById('commentsList');
    if (!list) return;

    if (commentsData.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary); font-style:italic; text-align:center; padding:10px;">No hay preguntas aún.</p>';
        return;
    }

    list.innerHTML = '';
    commentsData.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent-gold); position:relative;';

        const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

        let adminActions = '';
        if (state.isAdmin) {
            adminActions = `
                <div style="position:absolute; top:5px; right:5px; display:flex; gap:5px;">
                    <button style="background:none; border:none; color:var(--accent-gold); cursor:pointer; font-size:0.7rem;" onclick="showReplyInput('${c.id}')" title="Responder"><i class="fa-solid fa-reply"></i></button>
                    <button style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.7rem;" onclick="deleteComment('${c.id}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        let replyHtml = '';
        if (c.reply) {
            replyHtml = `
                <div style="margin-top:8px; padding:8px; background:rgba(212, 175, 55, 0.1); border-radius:5px; border-left:2px solid var(--accent-gold); font-size:0.8rem;">
                    <b style="color:var(--accent-gold);"><i class="fa-solid fa-user-shield"></i> Respuesta:</b>
                    <p style="margin:2px 0 0 0; color:var(--text-primary);">${escapeHtml(c.reply)}</p>
                </div>
            `;
        }

        item.innerHTML = `
            ${adminActions}
            <p style="margin:0; padding-right:40px; color:var(--text-primary); line-height:1.4;">${escapeHtml(c.text)}</p>
            <span style="font-size:0.65rem; color:var(--text-secondary); opacity:0.7;">${dateStr}</span>
            ${replyHtml}
            <div id="replyContainer_${c.id}" style="display:none; margin-top:10px;">
                <input type="text" id="replyInput_${c.id}" placeholder="Escribir respuesta..." style="width:calc(100% - 40px); padding:5px; font-size:0.8rem; border-radius:4px; border:none; background:rgba(255,255,255,0.1); color:white;">
                <button onclick="submitReply('${c.id}')" style="background:var(--accent-gold); border:none; border-radius:4px; padding:5px 8px; cursor:pointer;"><i class="fa-solid fa-check"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.showReplyInput = function(id) {
    const container = document.getElementById(`replyContainer_${id}`);
    if (container) container.style.display = container.style.display === 'none' ? 'flex' : 'none';
};

window.submitReply = function(id) {
    const input = document.getElementById(`replyInput_${id}`);
    if (!input || !input.value.trim()) return;

    const replyText = input.value.trim();

    if (isFirebaseConfigured && state.unitCode) {
        db.collection("comments").doc(id).update({
            reply: replyText
        }).catch(err => console.error("Error al responder:", err));
    } else {
        const allComments = JSON.parse(localStorage.getItem('church_comments') || '[]');
        const idx = allComments.findIndex(c => c.id === id);
        if (idx !== -1) {
            allComments[idx].reply = replyText;
            localStorage.setItem('church_comments', JSON.stringify(allComments));
            loadComments(currentViewingEvent.id);
        }
    }
};

function addComment(text) {
    if (!text.trim() || !currentViewingEvent) return;

    const newComment = {
        eventId: currentViewingEvent.id,
        text: text.trim(),
        timestamp: Date.now()
    };

    if (isFirebaseConfigured && state.unitCode) {
        db.collection("comments").add(newComment).then(() => {
            // Si el usuario está suscrito, esto dispararía una notificación en el futuro
            checkSubscriptionsAndNotify(currentViewingEvent.id, text);
        }).catch(err => {
            console.error("Error al guardar comentario:", err);
        });
    } else {
        newComment.id = 'local_' + Date.now();
        const allComments = JSON.parse(localStorage.getItem('church_comments') || '[]');
        allComments.unshift(newComment);
        localStorage.setItem('church_comments', JSON.stringify(allComments));
        loadComments(currentViewingEvent.id);
    }
}

// Función para reproducir sonido de notificación
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota La
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.log("No se pudo reproducir el sonido:", e);
    }
}

// --- LÓGICA DE SUSCRIPCIONES ---
function toggleSubscription(eventId) {
    // Pedir permiso para notificaciones al suscribirse
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    let subs = JSON.parse(localStorage.getItem('comment_subs') || '[]');
    if (subs.includes(eventId)) {
        subs = subs.filter(id => id !== eventId);
    } else {
        subs.push(eventId);
    }
    localStorage.setItem('comment_subs', JSON.stringify(subs));
    updateSubscriptionUI(eventId);
}

function updateSubscriptionUI(eventId) {
    const btn = document.getElementById('subscribeCommentsBtn');
    if (!btn) return;
    const subs = JSON.parse(localStorage.getItem('comment_subs') || '[]');
    const isSubscribed = subs.includes(eventId);
    
    if (isSubscribed) {
        btn.innerHTML = '<i class="fa-solid fa-bell"></i> <span data-i18n="btn_subscribed">Suscrito</span>';
        btn.style.color = 'var(--accent-gold)';
        btn.style.borderColor = 'var(--accent-gold)';
    } else {
        btn.innerHTML = '<i class="fa-regular fa-bell"></i> <span data-i18n="btn_subscribe">Notificarme</span>';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'rgba(255,255,255,0.2)';
    }
}

// Notificaciones reales del navegador
function checkSubscriptionsAndNotify(eventId, text) {
    const subs = JSON.parse(localStorage.getItem('comment_subs') || '[]');
    if (subs.includes(eventId)) {
        playNotificationSound(); // Sonido
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Nuevo comentario en el evento", {
                body: text,
                icon: "./images/icon-192.png"
            });
        }
    }
}

// Configurar eventos de comentarios de forma segura (una sola vez)
function setupCommentEventListeners() {
    const submitBtn = document.getElementById('submitCommentBtn');
    const input = document.getElementById('commentInput');
    const subscribeBtn = document.getElementById('subscribeCommentsBtn');

    if (submitBtn && input) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (text) {
                addComment(text);
                input.value = '';
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    addComment(text);
                    input.value = '';
                }
            }
        });
    }

    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            if (currentViewingEvent) toggleSubscription(currentViewingEvent.id);
        });
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', setupCommentEventListeners);

// --- PWA INSTALL LOGIC ---
let deferredPrompt;
const installAppBtn = document.getElementById('installAppBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) {
        installAppBtn.classList.remove('hidden');
    }
});

if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            installAppBtn.classList.add('hidden');
        }
    });
}

// --- LIMPIEZA DE CAPILLA ---
let currentCleaning = "";
function loadCleaning() {
    if (isFirebaseConfigured) {
        db.collection(state.districtId + "_" + state.wardId + "_settings").doc("cleaning").onSnapshot((doc) => {
            if (doc.exists) {
                currentCleaning = doc.data().assignedTo || "";
            } else {
                currentCleaning = "";
            }
            renderCleaning();
        });
    } else {
        currentCleaning = localStorage.getItem('church_cleaning') || "";
        renderCleaning();
    }
}

function renderCleaning() {
    const card = document.getElementById('cleaningCard');
    const assignedEl = document.getElementById('cleaningAssigned');
    const adminActions = document.getElementById('cleaningAdminActions');
    if(!card) return;

    if (state.isAdmin && (state.isSuperAdmin || state.userRole === 'superadmin' || state.userRole === 'district' || state.userRole === 'bishopric' || state.userRole === 'clerk')) {
        card.style.display = 'flex';
        adminActions.style.display = 'block';
        assignedEl.textContent = currentCleaning || "Sin asignar (Oculto)";
        assignedEl.style.fontStyle = currentCleaning ? 'normal' : 'italic';
        assignedEl.style.color = currentCleaning ? 'var(--text-primary)' : 'var(--text-secondary)';
    } else {
        if (currentCleaning && currentCleaning.trim() !== "") {
            card.style.display = 'flex';
            assignedEl.textContent = currentCleaning;
            assignedEl.style.fontStyle = 'normal';
            assignedEl.style.color = 'var(--text-primary)';
        } else {
            card.style.display = 'none';
        }
        adminActions.style.display = 'none';
    }
}

// Event Listeners Limpieza
const editCleaningBtn = document.getElementById('editCleaningBtn');
if(editCleaningBtn) {
    editCleaningBtn.addEventListener('click', () => {
        document.getElementById('cleaningName').value = currentCleaning === "Sin asignar (Oculto)" ? "" : currentCleaning;
        document.getElementById('cleaningModal').classList.remove('hidden');
    });
}

const cleaningForm = document.getElementById('cleaningForm');
if(cleaningForm) {
    cleaningForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = document.getElementById('cleaningName').value.trim();
        if (isFirebaseConfigured) {
            db.collection(state.districtId + "_" + state.wardId + "_settings").doc("cleaning").set({ assignedTo: val }).then(() => {
                document.getElementById('cleaningModal').classList.add('hidden');
                
                // Si hay un valor, mandar aviso general
                if(val !== "" && state.districtId && state.wardId) {
                    const pushUrl = "https://us-central1-calendario-de-barrio.cloudfunctions.net/sendPush";
                    fetch(pushUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            districtId: state.districtId,
                            wardId: state.wardId,
                            unitCode: state.unitCode,
                            title: "Limpieza", // campo requerido por la function aunque lo sobreescribamos
                            customTitle: "🧹 Aviso de Limpieza de Capilla",
                            customBody: `¡Hola! Les recordamos que este sábado la limpieza está asignada a: ${val}. ¡Cualquier ayuda extra es bienvenida!`
                        })
                    })
                    .then(r => r.json())
                    .then(data => console.log("Aviso de limpieza enviado a", data.sent, "dispositivos"))
                    .catch(err => console.error("Error enviando aviso:", err));
                }
                
            }).catch(err => alert("Error al guardar: " + err.message));
        } else {
            localStorage.setItem('church_cleaning', val);
            currentCleaning = val;
            renderCleaning();
            document.getElementById('cleaningModal').classList.add('hidden');
        }
    });
}

// --- DIRECTORIO DE LÍDERES ---
let currentDirectory = [];
function loadDirectory() {
    if (isFirebaseConfigured) {
        db.collection(state.districtId + "_" + state.wardId + "_settings").doc("directory").onSnapshot((doc) => {
            if (doc.exists) {
                currentDirectory = doc.data().leaders || [];
            } else {
                currentDirectory = [];
            }
            renderDirectory();
        });
    } else {
        currentDirectory = JSON.parse(localStorage.getItem('church_directory') || '[]');
        renderDirectory();
    }
}

function renderDirectory() {
    const list = document.getElementById('directoryList');
    if (!list) return;

    list.innerHTML = '';
    
    if (currentDirectory.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-style:italic;">No hay líderes registrados aún.</p>';
    }

    currentDirectory.forEach((leader, index) => {
        const div = document.createElement('div');
        const delay = index * 0.1;
        div.className = "animate-item list-item-hover";
        div.style.cssText = `animation-delay: ${delay}s; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid var(--glass-border); margin-bottom: 5px;`;
        
        let deleteBtn = '';
        if (state.isAdmin && (state.isSuperAdmin || state.userRole === 'bishopric' || state.userRole === 'clerk')) {
            deleteBtn = `<button class="icon-btn" style="color: #e74c3c; padding:0; margin-left:10px; font-size: 1.2rem;" onclick="window.deleteLeader(${index})"><i class="fa-solid fa-trash-can"></i></button>`;
        }

        // Limpiar número para el enlace de WhatsApp
        const waNum = leader.phone.replace(/[^0-9+]/g, '');

        div.innerHTML = `
            <div style="flex:1;">
                <div style="font-size: 0.8rem; color: #3498db; font-weight: bold; text-transform: uppercase;">${leader.role}</div>
                <div style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 5px;">${leader.name}</div>
            </div>
            <div style="display:flex; align-items:center;">
                <a href="https://wa.me/${waNum}" target="_blank" class="btn btn-whatsapp" style="padding: 5px 15px; font-size: 0.85rem; text-decoration: none; display:inline-block; border-radius: 20px; background-color:#25D366; color:white; border:none; transition: all 0.3s ease;">
                    <i class="fa-brands fa-whatsapp"></i> Contactar
                </a>
                ${deleteBtn}
            </div>
        `;
        list.appendChild(div);
    });

    if (state.isAdmin && (state.isSuperAdmin || state.userRole === 'superadmin' || state.userRole === 'district' || state.userRole === 'bishopric' || state.userRole === 'clerk')) {
        document.getElementById('directoryAdminActions').style.display = 'block';
    } else {
        document.getElementById('directoryAdminActions').style.display = 'none';
    }
}

// Event Listeners Directorio
const openDirBtn = document.getElementById('openDirectoryBtn');
if (openDirBtn) {
    openDirBtn.addEventListener('click', () => {
        document.getElementById('directoryModal').classList.remove('hidden');
    });
}

const addLeaderForm = document.getElementById('addLeaderForm');
if (addLeaderForm) {
    addLeaderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.getElementById('leaderRole').value.trim();
        const name = document.getElementById('leaderName').value.trim();
        const phone = document.getElementById('leaderPhone').value.trim();
        
        const newList = [...currentDirectory, { role, name, phone }];
        
        if (isFirebaseConfigured) {
            db.collection(state.districtId + "_" + state.wardId + "_settings").doc("directory").set({ leaders: newList }).then(() => {
                addLeaderForm.reset();
            }).catch(err => alert("Error: " + err.message));
        } else {
            currentDirectory = newList;
            localStorage.setItem('church_directory', JSON.stringify(newList));
            renderDirectory();
            addLeaderForm.reset();
        }
    });
}

window.deleteLeader = function(index) {
    if(!confirm("¿Eliminar este líder del directorio?")) return;
    const newList = [...currentDirectory];
    newList.splice(index, 1);
    
    if (isFirebaseConfigured) {
        db.collection(state.districtId + "_" + state.wardId + "_settings").doc("directory").set({ leaders: newList }).catch(err => alert("Error: " + err.message));
    } else {
        currentDirectory = newList;
        localStorage.setItem('church_directory', JSON.stringify(newList));
        renderDirectory();
    }
};

// ====== WEB PUSH NOTIFICATIONS ======
const publicVapidKey = "BPSpnf5a-5PIsSOIU1VsK32Ckrc2WMpdo-Wtq9_GGa5zOHbePB3zw9qMYjyjTCVIR7BqEuyYPbrLByH11qIGZN4";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const pushSubscribeBtn = document.getElementById('pushSubscribeBtn');
if (pushSubscribeBtn) {
    pushSubscribeBtn.addEventListener('click', async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Tu navegador no soporta notificaciones push reales.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Pedir permisos al usuario
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('Debes conceder permisos en tu navegador para recibir notificaciones.');
                return;
            }

            // Crear la suscripción con nuestra llave pública VAPID
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // Guardar la suscripción en la base de datos de Firebase
            if (isFirebaseConfigured && state.unitCode) {
                // Usamos union para no borrar las suscripciones de otras personas
                db.collection(state.districtId + "_settings").doc("push_subscriptions").set({
                    subs: firebase.firestore.FieldValue.arrayUnion(subscription.toJSON())
                }, { merge: true })
                .then(() => {
                    alert('¡Suscripción exitosa! Ahora recibirás alertas en tu celular de nuevos eventos.');
                    pushSubscribeBtn.style.color = '#2ecc71';
                })
                .catch(err => {
                    console.error("Error guardando suscripcion:", err);
                    alert("Error guardando suscripcion en la base de datos.");
                });
            } else {
                alert('Debes estar conectado a internet y tener el código de barrio para suscribirte.');
            }
        } catch (error) {
            console.error('Error al suscribir push:', error);
            alert('Hubo un error técnico al activar las notificaciones.');
        }
    });
}

// Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker registrado con éxito:', reg.scope);
                
                // Intentar registrar Periodic Sync si está disponible
                if ('periodicSync' in reg) {
                    reg.periodicSync.register('update-events', {
                        minInterval: 24 * 60 * 60 * 1000 // 24 horas
                    }).catch(e => console.log('Periodic sync no disponible:', e));
                }
            })
            .catch(err => console.error('Error al registrar el Service Worker:', err));
    });
}
