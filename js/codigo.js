// CONTROL DE ACCESO (PROTECCIÓN LOGIN)
if (localStorage.getItem('sesionActiva') !== 'true') {
	window.location.href = 'login.html';
}

// DATOS DE PRUEBA INICIALES 
let librosDisponibles = [];
let activeTab = 'todos';

// ELEMENTOS DEL DOM
const menuToggle = document.getElementById('menu-toggle');
const closeSidebar = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const booksGrid = document.getElementById('books-grid');
const sectionTitle = document.getElementById('section-title');
const genreItems = document.querySelectorAll('.genre-item');
const uploadBtn = document.getElementById('upload-btn');

// MANEJO DEL MENÚ LATERAL (INTERFAZ)
function abrirMenu() {
	sidebar.classList.add('open');
	overlay.classList.add('show');
}

function cerrarMenu() {
	sidebar.classList.remove('open');
	overlay.classList.remove('show');
}

menuToggle.addEventListener('click', abrirMenu);
closeSidebar.addEventListener('click', cerrarMenu);
overlay.addEventListener('click', cerrarMenu);

// NORMALIZADOR DE GÉNEROS (AGRUPACIÓN DE GÉNEROS EXTRAÑOS EN CATEGORÍAS ESTÁNDAR O "OTROS")
function obtenerGeneroEstandar(generoRaw) {
	if (!generoRaw) return 'Otros';
	
	const g = generoRaw.toLowerCase().trim();
	
	// Si ya es uno de los estándar en español, retornarlo directamente
	if (g === 'ficción' || g === 'ficcion') return 'Ficción';
	if (g === 'fantasía' || g === 'fantasia') return 'Fantasía';
	if (g === 'ciencia ficción' || g === 'ciencia ficcion') return 'Ciencia Ficción';
	if (g === 'misterio') return 'Misterio';
	if (g === 'no ficción' || g === 'no ficcion') return 'No Ficción';

	// Búsqueda por palabras clave en español o inglés
	if (g.includes('ciencia ficción') || g.includes('science fiction') || g.includes('sci-fi')) {
		return 'Ciencia Ficción';
	}
	if (g.includes('fantasía') || g.includes('fantasy')) {
		return 'Fantasía';
	}
	if (g.includes('misterio') || g.includes('mystery') || g.includes('detective') || g.includes('suspense')) {
		return 'Misterio';
	}
	if (g.includes('no ficción') || g.includes('non-fiction') || g.includes('nonfiction') || g.includes('history') || g.includes('biography')) {
		return 'No Ficción';
	}
	if (g.includes('ficción') || g.includes('fiction') || g.includes('novel') || g.includes('drama') || g.includes('poetry') || g.includes('stories')) {
		return 'Ficción';
	}
	
	return 'Otros';
}

// RENDERIZADO DE TARJETAS DE LIBROS
function mostrarLibros(generoFiltrado = 'todos') {
	booksGrid.innerHTML = '';

	// 1. Filtrar por el tipo de pestaña activa
	let itemsPestana = librosDisponibles;
	if (activeTab === 'libros') {
		itemsPestana = librosDisponibles.filter(item => item.tipo === 'libro');
	} else if (activeTab === 'documentos') {
		itemsPestana = librosDisponibles.filter(item => item.tipo === 'documento');
	}

	// 2. Filtrar por género o materia
	const filtrarPor = generoFiltrado.toLowerCase().trim();
	const librosFiltrados = filtrarPor === 'todos'
		? itemsPestana
		: itemsPestana.filter(libro => {
			if (libro.tipo === 'libro') {
				const gEst = obtenerGeneroEstandar(libro.genero).toLowerCase();
				return gEst === filtrarPor;
			} else {
				const m = (libro.genero || 'General').toLowerCase().trim();
				return m === filtrarPor;
			}
		});

	if (librosFiltrados.length === 0) {
		let mensaje = 'No hay archivos disponibles en esta categoría.';
		if (activeTab === 'libros') {
			mensaje = 'No hay libros disponibles en este género.';
		} else if (activeTab === 'documentos') {
			mensaje = 'No hay documentos disponibles en esta materia.';
		}
		booksGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; margin-top: 2rem;">${mensaje}</p>`;
		return;
	}

	librosFiltrados.forEach(libro => {
		const tarjeta = document.createElement('div');
		tarjeta.classList.add('book-card');

		// Mostrar un icono diferente si es documento o libro si no tiene portada
		const defaultIcon = libro.tipo === 'documento' ? 'description' : 'book';
		const portadaHTML = libro.portada
			? `<img src="${libro.portada}" alt="${libro.titulo}" style="width: 100%; height: 100%; object-fit: cover;">`
			: `<span class="material-symbols-outlined" style="font-size: 48px;">${defaultIcon}</span>`;

		tarjeta.innerHTML = `
            <div class="book-cover">
                ${portadaHTML}
            </div>
            <h4 class="book-title" title="${libro.titulo}">${libro.titulo}</h4>
            <p class="book-author">${libro.autor}</p>
        `;

		// Redirigir al lector interno con hash params
		tarjeta.addEventListener('click', () => {
			console.log('Tarjeta clickeada. Datos del libro/documento:', libro);
			if (libro.linkLectura) {
				const urlDestino = `lector.html#id=${libro.id}&titulo=${encodeURIComponent(libro.titulo)}&formato=${libro.formato}&url=${encodeURIComponent(libro.linkLectura)}&paginaActual=${libro.paginaActual || 0}`;
				console.log('Redirigiendo a:', urlDestino);
				window.location.href = urlDestino;
			} else {
				console.warn('El archivo no tiene linkLectura');
				alert(`El archivo "${libro.titulo}" no cuenta con un enlace de lectura.`);
			}
		});

		booksGrid.appendChild(tarjeta);
	});
}

// ACTUALIZACIÓN DINÁMICA DEL SIDEBAR (GÉNEROS VS MATERIAS)
function actualizarSidebar() {
	const sidebarHeader = document.querySelector('.sidebar-header h3');
	const genreList = document.querySelector('.genre-list');

	if (!sidebarHeader || !genreList) return;

	// Lista estándar de géneros para libros y vista general
	const generosLibrosPredefinidos = [
		{ id: 'Ficción', label: '🚀 Ficción' },
		{ id: 'Fantasía', label: '🔮 Fantasía' },
		{ id: 'Ciencia Ficción', label: '🌌 Ciencia Ficción' },
		{ id: 'Misterio', label: '🕵️‍♂️ Misterio' },
		{ id: 'No Ficción', label: '📖 No Ficción' },
		{ id: 'Otros', label: '📂 Otros / Sin Asignar' }
	];

	if (activeTab === 'todos') {
		sidebarHeader.textContent = 'Categorías';

		let html = `<li><a href="#" class="genre-item active" data-genre="todos">✨ Todos los archivos</a></li>`;
		
		// Añadir géneros estándar de libros
		generosLibrosPredefinidos.forEach(g => {
			html += `<li><a href="#" class="genre-item" data-genre="${g.id}">${g.label}</a></li>`;
		});

		// Coleccionar materias únicas de documentos del usuario
		const materiasUnicas = new Set();
		librosDisponibles
			.filter(item => item.tipo === 'documento')
			.forEach(item => {
				if (item.genero) {
					materiasUnicas.add(item.genero.trim());
				}
			});

		if (materiasUnicas.size > 0) {
			html += `<li class="sidebar-separator" style="padding: 0.5rem 1rem; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; border-top: 1px solid var(--border-color); margin-top: 0.5rem;">Materias</li>`;
			materiasUnicas.forEach(m => {
				html += `<li><a href="#" class="genre-item" data-genre="${m}">📁 ${m}</a></li>`;
			});
		}

		genreList.innerHTML = html;

	} else if (activeTab === 'libros') {
		sidebarHeader.textContent = 'Géneros';

		let html = `<li><a href="#" class="genre-item active" data-genre="todos">✨ Todos los libros</a></li>`;
		generosLibrosPredefinidos.forEach(g => {
			html += `<li><a href="#" class="genre-item" data-genre="${g.id}">${g.label}</a></li>`;
		});

		genreList.innerHTML = html;

	} else if (activeTab === 'documentos') {
		sidebarHeader.textContent = 'Materias';

		// Coleccionar materias únicas de los documentos del usuario
		const materiasUnicas = new Set();
		librosDisponibles
			.filter(item => item.tipo === 'documento')
			.forEach(item => {
				if (item.genero) {
					materiasUnicas.add(item.genero.trim());
				}
			});

		let html = `<li><a href="#" class="genre-item active" data-genre="todos">📝 Todas las materias</a></li>`;
		materiasUnicas.forEach(m => {
			html += `<li><a href="#" class="genre-item" data-genre="${m}">📁 ${m}</a></li>`;
		});

		genreList.innerHTML = html;
	}

	// Re-vincular eventos click a los nuevos items del menú
	const nuevosGenreItems = document.querySelectorAll('.genre-item');
	nuevosGenreItems.forEach(item => {
		item.addEventListener('click', (e) => {
			e.preventDefault();

			nuevosGenreItems.forEach(i => i.classList.remove('active'));
			item.classList.add('active');

			const genero = item.getAttribute('data-genre');
			sectionTitle.innerHTML = item.innerHTML;

			mostrarLibros(genero);
			cerrarMenu();
		});
	});
}

// CONTROL DE SUBIDA (SUBIR ARCHIVO PROPIO DIRECTAMENTE)
uploadBtn.addEventListener('click', () => {
	abrirModalUpload();
});

// ELEMENTOS DEL MODAL
const uploadModal = document.getElementById('upload-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelModalBtn = document.getElementById('btn-cancelar-upload');
const uploadForm = document.getElementById('upload-form');
const uploadTipoSelect = document.getElementById('upload-tipo');
const groupLibro = document.getElementById('group-libro');
const groupDocumento = document.getElementById('group-documento');

// abrir modal
function abrirModalUpload() {
	uploadModal.classList.add('show');
	overlay.classList.add('show');
}

// cerrar modal
function cerrarModalUpload() {
	uploadModal.classList.remove('show');
	if (!sidebar.classList.contains('open')) {
		overlay.classList.remove('show');
	}
	uploadForm.reset();
	groupLibro.style.display = 'block';
	groupDocumento.style.display = 'none';
}

closeModalBtn?.addEventListener('click', cerrarModalUpload);
cancelModalBtn?.addEventListener('click', cerrarModalUpload);

// alternar campos segun tipo seleccionado
uploadTipoSelect?.addEventListener('change', () => {
	if (uploadTipoSelect.value === 'libro') {
		groupLibro.style.display = 'block';
		groupDocumento.style.display = 'none';
		document.getElementById('upload-archivo').accept = '.epub,.pdf';
	} else {
		groupLibro.style.display = 'none';
		groupDocumento.style.display = 'block';
		document.getElementById('upload-archivo').accept = '.pdf,.docx,.doc,.txt';
	}
});

// procesar envio del formulario de subida
uploadForm?.addEventListener('submit', async (e) => {
	e.preventDefault();

	const tipo = uploadTipoSelect.value;
	const titulo = document.getElementById('upload-titulo').value.trim();
	const archivoInput = document.getElementById('upload-archivo');
	const portadaInput = document.getElementById('upload-portada');

	if (!archivoInput.files || archivoInput.files.length === 0) {
		alert('Por favor selecciona un archivo.');
		return;
	}

	const formData = new FormData();
	formData.append('tipo', tipo);
	formData.append('titulo', titulo);
	formData.append('archivo', archivoInput.files[0]);

	if (portadaInput.files && portadaInput.files.length > 0) {
		formData.append('portada', portadaInput.files[0]);
	}

	if (tipo === 'libro') {
		const autor = document.getElementById('upload-autor').value.trim();
		const genero = document.getElementById('upload-genero').value.trim();
		formData.append('autor', autor || 'Autor Desconocido');
		formData.append('genero', genero || 'General');
	} else {
		const materia = document.getElementById('upload-materia').value.trim();
		const tipoDoc = document.getElementById('upload-tipo-doc').value;
		formData.append('materia', materia || 'General');
		formData.append('tipo_documento', tipoDoc || 'OTRO');
	}

	try {
		const submitBtn = uploadForm.querySelector('button[type="submit"]');
		const textOriginal = submitBtn.textContent;
		submitBtn.disabled = true;
		submitBtn.textContent = 'Subiendo...';

		const resultado = await apiSubirArchivo(formData);

		submitBtn.disabled = false;
		submitBtn.textContent = textOriginal;

		cerrarModalUpload();

		// verificar si hay logros desbloqueados
		if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
			const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
			alert(`${resultado.mensaje}\n\n¡Has desbloqueado logros!: ${nombresLogros}`);
		} else {
			alert(resultado.mensaje);
		}

		await cargarBiblioteca();

	} catch (error) {
		alert(`Error al subir el archivo: ${error.message}`);
		const submitBtn = uploadForm.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.disabled = false;
			submitBtn.textContent = 'Subir Archivo';
		}
	}
});

// ACCIÓN DE CERRAR SESIÓN
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
	e.preventDefault();
	localStorage.removeItem('sesionActiva');
	localStorage.removeItem('token'); // Remover el token de sesión
	window.location.href = 'login.html';
});


// CONTROL DE PESTAÑAS (TABS)
const tabButtons = document.querySelectorAll('.tab-btn');
const discoverArea = document.getElementById('discover-area');

tabButtons.forEach(btn => {
	btn.addEventListener('click', () => {
		tabButtons.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');

		const tab = btn.getAttribute('data-tab');
		if (tab === 'descubrir') {
			activeTab = 'descubrir';
			booksGrid.style.display = 'none';
			discoverArea.style.display = 'flex';
			sectionTitle.textContent = 'Descubrir en Project Gutenberg';
			cargarLibrosPopularesGutenberg();
		} else if (tab === 'documentos') {
			activeTab = 'documentos';
			booksGrid.style.display = 'grid';
			discoverArea.style.display = 'none';
			sectionTitle.textContent = 'Mis Documentos';
			actualizarSidebar();
			mostrarLibros('todos');
		} else if (tab === 'libros') {
			activeTab = 'libros';
			booksGrid.style.display = 'grid';
			discoverArea.style.display = 'none';
			sectionTitle.textContent = 'Mi Biblioteca Personal';
			actualizarSidebar();
			mostrarLibros('todos');
		} else {
			activeTab = 'todos';
			booksGrid.style.display = 'grid';
			discoverArea.style.display = 'none';
			sectionTitle.textContent = 'Todos los Archivos';
			actualizarSidebar();
			mostrarLibros('todos');
		}
	});
});

// BÚSQUEDA Y IMPORTACIÓN DESDE GUTENBERG
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const discoverResults = document.getElementById('discover-results');
const discoverTitle = document.getElementById('discover-title');

// Renderiza resultados de Gutendex
function renderizarResultadosGutenberg(books) {
	if (!books || books.length === 0) {
		discoverResults.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; margin-top: 2rem;">No se encontraron resultados.</p>`;
		return;
	}

	discoverResults.innerHTML = '';
	books.forEach(book => {
		const card = document.createElement('div');
		card.classList.add('book-card');
		card.style.cursor = 'default';

		const coverUrl = book.formats['image/jpeg'] || '';
		const portadaHTML = coverUrl
			? `<img src="${coverUrl}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover;">`
			: `<span class="material-symbols-outlined" style="font-size: 48px;">book</span>`;

		const authors = book.authors ? book.authors.map(a => a.name).join(', ') : 'Autor desconocido';

		card.innerHTML = `
			<div class="book-cover">
				${portadaHTML}
			</div>
			<h4 class="book-title" title="${book.title}">${book.title}</h4>
			<p class="book-author" title="${authors}">${authors}</p>
			<button class="btn-import-book" data-id="${book.id}">
				<span class="material-symbols-outlined" style="font-size: 16px;">download</span>
				Importar
			</button>
		`;

		const importBtn = card.querySelector('.btn-import-book');
		importBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			
			importBtn.disabled = true;
			importBtn.classList.add('importing');
			const textOriginal = importBtn.innerHTML;
			importBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">sync</span> Importando...`;

			try {
				const resultado = await apiImportarGutenberg(book.id);
				
				importBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">done</span> Importado`;
				importBtn.style.borderColor = '#10b981';
				importBtn.style.color = '#10b981';

				if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
					const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
					alert(`${resultado.mensaje}\n\n¡Has desbloqueado logros!: ${nombresLogros}`);
				} else {
					alert(resultado.mensaje);
				}

				await cargarBiblioteca();

			} catch (error) {
				alert(`Error al importar el libro "${book.title}": ${error.message}`);
				importBtn.disabled = false;
				importBtn.classList.remove('importing');
				importBtn.innerHTML = textOriginal;
			}
		});

		discoverResults.appendChild(card);
	});
}

// Carga los libros más populares por defecto
async function cargarLibrosPopularesGutenberg() {
	if (discoverResults.children.length > 0 && discoverTitle.textContent === 'Libros Populares') {
		return;
	}

	discoverTitle.textContent = 'Libros Populares';
	discoverResults.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; margin-top: 2rem;">Cargando libros populares en Gutenberg...</p>`;

	try {
		const res = await fetch('https://gutendex.com/books/');
		if (!res.ok) {
			throw new Error('Error al consultar la API de Gutenberg.');
		}
		const data = await res.json();
		renderizarResultadosGutenberg(data.results);
	} catch (error) {
		discoverResults.innerHTML = `<p style="color: var(--text-warn || #ef4444); grid-column: 1/-1; text-align: center; margin-top: 2rem;">Error al cargar libros populares: ${error.message}</p>`;
	}
}

async function buscarGutenberg() {
	const query = searchInput.value.trim();
	if (!query) {
		cargarLibrosPopularesGutenberg();
		return;
	}

	discoverTitle.textContent = `Resultados para "${query}"`;
	discoverResults.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; margin-top: 2rem;">Buscando en Project Gutenberg...</p>`;

	try {
		const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
		if (!res.ok) {
			throw new Error('Error al consultar la API de Gutenberg.');
		}
		const data = await res.json();
		renderizarResultadosGutenberg(data.results);
	} catch (error) {
		discoverResults.innerHTML = `<p style="color: var(--text-warn || #ef4444); grid-column: 1/-1; text-align: center; margin-top: 2rem;">Error al buscar libros: ${error.message}</p>`;
	}
}

searchBtn?.addEventListener('click', buscarGutenberg);
searchInput?.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') {
		buscarGutenberg();
	}
});

// Función para cargar los libros del backend
async function cargarBiblioteca() {
	try {
		librosDisponibles = await apiObtenerBiblioteca();
		actualizarSidebar();
		mostrarLibros('todos');
	} catch (error) {
		alert(`No se pudo cargar la biblioteca: ${error.message}`);
	}
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
	cargarBiblioteca();
});
