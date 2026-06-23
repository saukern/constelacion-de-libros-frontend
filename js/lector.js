// Redirige al login si la sesion no esta activa
if (localStorage.getItem('sesionActiva') !== 'true') {
	window.location.href = 'login.html';
}

// Variables de estado del lector
let progresoId = null;
let bookInstance = null;
let renditionInstance = null;
let debounceTimeout = null;

// Configuracion de estilos EPUB
let currentFontSize = 100;
let currentFontFamily = 'sans-serif';
let currentTheme = 'light';

// Variables de estado del PDF
let pdfDocInstance = null;
let pdfPagesRendered = {};
let observerInstance = null;

// Variables de anotaciones y resaltados
let activeAnotaciones = [];
let activeSelectionCfiRange = null;
let activeSelectionText = '';
let activeSelectionContents = null;
let currentPopoverColor = '#ffeb3b';

// Variables del temporizador Pomodoro
let pomodoroInterval = null;
let pomodoroTimeLeft = 1500;
let pomodoroIsRunning = false;
let pomodoroStartPage = 0;
let pomodoroActiveDuration = 1500;

// SISTEMA DE NOTIFICACIONES TOAST PERSONALIZADO
function mostrarToast(mensaje, tipo = 'success') {
	const container = document.getElementById('toast-container');
	if (!container) return;

	const toast = document.createElement('div');
	toast.classList.add('toast', tipo);

	let icono = 'info';
	if (tipo === 'success') icono = 'check_circle';
	if (tipo === 'error') icono = 'error';

	toast.innerHTML = `
		<span class="material-symbols-outlined toast-icon ${tipo}">${icono}</span>
		<span class="toast-message">${mensaje}</span>
	`;

	container.appendChild(toast);

	// Remover toast después de 4 segundos con fade out
	setTimeout(() => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateY(-20px) scale(0.9)';
		setTimeout(() => {
			toast.remove();
		}, 300);
	}, 4000);
}

// SISTEMA DE CONFIRMACIÓN PERSONALIZADO
let confirmModalCallback = null;

const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('btn-confirm-yes');
const confirmNoBtn = document.getElementById('btn-confirm-no');
const closeConfirmModalBtn = document.getElementById('close-confirm-modal');
const overlay = document.getElementById('overlay');

function mostrarConfirmacion(titulo, mensaje, alConfirmar) {
	confirmTitle.textContent = titulo;
	confirmMessage.textContent = mensaje;
	confirmModalCallback = alConfirmar;

	confirmModal.classList.add('show');
	overlay.classList.add('show');
}

function cerrarConfirmacion() {
	confirmModal.classList.remove('show');
	overlay.classList.remove('show');
	confirmModalCallback = null;
}

confirmYesBtn?.addEventListener('click', () => {
	if (confirmModalCallback) {
		confirmModalCallback();
	}
	cerrarConfirmacion();
});

confirmNoBtn?.addEventListener('click', cerrarConfirmacion);
closeConfirmModalBtn?.addEventListener('click', cerrarConfirmacion);
overlay?.addEventListener('click', cerrarConfirmacion);

// Obtiene los parametros desde el hash de la URL
function obtenerParametrosURL() {
	const hash = window.location.hash.substring(1);
	const params = new URLSearchParams(hash);
	return {
		id: params.get('id'),
		titulo: params.get('titulo'),
		formato: params.get('formato') ? params.get('formato').toUpperCase() : '',
		url: params.get('url'),
		paginaActual: params.get('paginaActual') || 0
	};
}

// Inicializa el lector adecuado según el formato
function inicializarLector() {
	const { id, titulo, formato, url, paginaActual } = obtenerParametrosURL();
	progresoId = id;

	document.getElementById('book-title').textContent = titulo || 'Libro';
	document.getElementById('page-input').value = paginaActual;

	if (!url) {
		mostrarToast(`Error: No se pudo obtener la dirección del archivo.`, 'error');
		return;
	}

	const pdfArea = document.getElementById('pdf-area');
	const epubArea = document.getElementById('epub-area');
	const epubControls = document.getElementById('epub-controls');
	const btnAnnotations = document.getElementById('btn-annotations-toggle');

	if (formato === 'PDF') {
		if (pdfArea) pdfArea.style.display = 'flex';
		if (btnAnnotations) btnAnnotations.style.display = 'none';
		cargarPdf(url, paginaActual);
	} else if (formato === 'EPUB') {
		epubArea.style.display = 'block';
		if (epubControls) epubControls.style.display = 'flex';
		if (btnAnnotations) btnAnnotations.style.display = 'flex';
		cargarEpub(url);
	} else {
		mostrarToast('Formato no soportado en el lector.', 'error');
	}
}

// Carga y configura el archivo EPUB con Epub.js
function cargarEpub(url) {
	try {
		bookInstance = ePub(url);
		renditionInstance = bookInstance.renderTo("epub-viewer", {
			width: "100%",
			height: "100%",
			flow: "paginated",
			allowScriptedContent: true
		});

		// Registra los temas de lectura
		renditionInstance.themes.register("light", {
			"html, body": { "background": "#ffffff !important", "color": "#333333 !important" },
			"p": { "color": "#333333 !important" }
		});
		renditionInstance.themes.register("sepia", {
			"html, body": { "background": "#f4ecd8 !important", "color": "#5c4033 !important" },
			"p": { "color": "#5c4033 !important" }
		});
		renditionInstance.themes.register("dark", {
			"html, body": { "background": "#0f172a !important", "color": "#f8fafc !important" },
			"p": { "color": "#f8fafc !important" }
		});

		// Inyecta estilos personalizados al cargar un capitulo
		renditionInstance.hooks.content.register((contents) => {
			inyectarEstilosIframe(contents.document);
			contents.document.addEventListener('click', () => {
				ocultarPopoverAnotacion();
			});
		});

		const { paginaActual } = obtenerParametrosURL();

		// Genera ubicaciones y posiciona en la pagina guardada
		bookInstance.ready.then(() => {
			return bookInstance.locations.generate(1000);
		}).then(async () => {
			if (paginaActual && Number(paginaActual) > 0) {
				const cfi = bookInstance.locations.cfiFromLocation(Number(paginaActual));
				if (cfi) {
					renditionInstance.display(cfi);
				}
			}
			await cargarAnotacionesLibro();
		});

		// Muestra la vista inicial y aplica estilos
		renditionInstance.display().then(() => {
			aplicarEstilosEpub();
			cambiarTema('light');
		});

		// Re-aplica estilos al renderizar un capitulo nuevo
		renditionInstance.on('rendered', () => {
			aplicarEstilosEpub();
			if (renditionInstance && currentTheme) {
				renditionInstance.themes.select(currentTheme);
			}
			dibujarAnotaciones();
		});

		// Maneja la seleccion de texto para crear anotacion
		renditionInstance.on('selected', (cfiRange, contents) => {
			try {
				if (!renditionInstance) return;

				const range = renditionInstance.getRange(cfiRange);
				if (!range) {
					ocultarPopoverAnotacion();
					return;
				}

				const selectedText = range.toString().trim();
				if (!selectedText) {
					ocultarPopoverAnotacion();
					return;
				}

				activeSelectionCfiRange = cfiRange;
				activeSelectionText = selectedText;
				activeSelectionContents = contents;

				// Obtiene el iframe del capitulo
				let iframe = null;
				if (contents && contents.iframe) {
					iframe = contents.iframe;
				} else if (contents && contents.document && contents.document.defaultView) {
					iframe = contents.document.defaultView.frameElement;
				} else {
					iframe = document.querySelector('#epub-viewer iframe');
				}

				const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 };
				const rect = range.getBoundingClientRect();

				const top = rect.top + iframeRect.top + window.scrollY;
				const left = rect.left + iframeRect.left + window.scrollX;

				mostrarPopoverAnotacion(top, left, rect.width, rect.height);
			} catch (e) {
				console.error("Error al procesar la selección en EPUB:", e);
				ocultarPopoverAnotacion();
			}
		});

		// Guarda el progreso automaticamente al avanzar paginas
		renditionInstance.on('relocated', (location) => {
			if (bookInstance.locations && bookInstance.locations.total > 0) {
				const currentLoc = bookInstance.locations.locationFromCfi(location.start.cfi);
				if (currentLoc !== undefined && currentLoc !== -1) {
					document.getElementById('page-input').value = currentLoc;
					const esUltimaPagina = location.atEnd || (currentLoc >= bookInstance.locations.total - 1);
					autoGuardarProgreso(currentLoc, esUltimaPagina);
				}
			}
		});

		// Eventos de navegacion del EPUB
		document.getElementById('epub-prev').addEventListener('click', () => {
			renditionInstance.prev();
		});

		document.getElementById('epub-next').addEventListener('click', () => {
			renditionInstance.next();
		});

		configurarControlesEpub();

	} catch (err) {
		console.error('Error al inicializar el EPUB:', err);
		mostrarToast('Error al abrir el visor de EPUB.', 'error');
	}
}

// Guarda progreso de lectura en la base de datos con debounce
function autoGuardarProgreso(pagina, esUltimaPagina = false) {
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(async () => {
		try {
			const nuevoEstado = esUltimaPagina ? 'COMPLETED' : 'READING';
			const resultado = await apiActualizarProgreso(progresoId, Number(pagina), nuevoEstado);
			console.log('Progreso auto-guardado en página:', pagina, 'Estado:', nuevoEstado);
			
			if (esUltimaPagina) {
				mostrarToast('🎉 ¡Felicidades! Has terminado de leer este libro.', 'success');
			}
			
			if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
				const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
				mostrarToast(`🏆 ¡Logro desbloqueado!: ${nombresLogros}`, 'success');
			}
		} catch (err) {
			console.error('Error en auto-guardado de progreso:', err);
		}
	}, 2000);
}

// Configura controles de fuente, tamaño y temas del EPUB
function configurarControlesEpub() {
	document.getElementById('font-increase')?.addEventListener('click', () => {
		if (currentFontSize < 200) {
			currentFontSize += 10;
			aplicarEstilosEpub();
		}
	});

	document.getElementById('font-decrease')?.addEventListener('click', () => {
		if (currentFontSize > 60) {
			currentFontSize -= 10;
			aplicarEstilosEpub();
		}
	});

	document.getElementById('font-family-select')?.addEventListener('change', (e) => {
		currentFontFamily = e.target.value;
		aplicarEstilosEpub();
	});

	const btnLight = document.getElementById('theme-light');
	const btnSepia = document.getElementById('theme-sepia');
	const btnDark = document.getElementById('theme-dark');

	function removerClaseActiva() {
		[btnLight, btnSepia, btnDark].forEach(btn => btn?.classList.remove('active'));
	}

	btnLight?.addEventListener('click', () => {
		removerClaseActiva();
		btnLight.classList.add('active');
		cambiarTema('light');
	});

	btnSepia?.addEventListener('click', () => {
		removerClaseActiva();
		btnSepia.classList.add('active');
		cambiarTema('sepia');
	});

	btnDark?.addEventListener('click', () => {
		removerClaseActiva();
		btnDark.classList.add('active');
		cambiarTema('dark');
	});
}

// Inyecta estilos personalizados al iframe del EPUB para forzar colores
function inyectarEstilosIframe(doc) {
	if (!doc) return;

	let styleEl = doc.getElementById('lector-custom-styles');
	if (!styleEl) {
		styleEl = doc.createElement('style');
		styleEl.id = 'lector-custom-styles';
	}
	
	doc.head.appendChild(styleEl);

	let bg = '#ffffff';
	let fg = '#333333';
	if (currentTheme === 'sepia') {
		bg = '#f4ecd8';
		fg = '#5c4033';
	} else if (currentTheme === 'dark') {
		bg = '#0f172a';
		fg = '#f8fafc';
	}

	styleEl.textContent = `
		html, body {
			background-color: ${bg} !important;
			color: ${fg} !important;
			font-family: ${currentFontFamily} !important;
		}
		body {
			font-size: ${currentFontSize}% !important;
		}
		div, section, article, main, header, footer, table, tr, td, tbody, thead,
		p, span, a, li, ul, ol, h1, h2, h3, h4, h5, h6, blockquote, pre {
			background-color: transparent !important;
			color: ${fg} !important;
			font-family: ${currentFontFamily} !important;
		}
	`;
}

// Re-inyecta estilos en todos los iframes cargados
function aplicarEstilosGlobalesIframes() {
	const iframes = document.querySelectorAll('#epub-viewer iframe');
	iframes.forEach(iframe => {
		try {
			const doc = iframe.contentDocument || iframe.contentWindow.document;
			inyectarEstilosIframe(doc);
		} catch (e) {
			console.warn('No se pudo acceder al iframe de Epub:', e);
		}
	});
}

// Aplica el tamaño y tipo de fuente seleccionados
function aplicarEstilosEpub() {
	if (renditionInstance) {
		renditionInstance.themes.fontSize(`${currentFontSize}%`);
		document.getElementById('font-size-label').textContent = `${currentFontSize}%`;
		renditionInstance.themes.font(currentFontFamily);
	}
	aplicarEstilosGlobalesIframes();
}

// Cambia el tema activo del lector
function cambiarTema(tema) {
	currentTheme = tema;
	if (renditionInstance) {
		renditionInstance.themes.select(tema);
	}

	const epubArea = document.getElementById('epub-area');
	if (epubArea) {
		if (tema === 'light') {
			epubArea.style.backgroundColor = '#ffffff';
			epubArea.style.color = '#333333';
		} else if (tema === 'sepia') {
			epubArea.style.backgroundColor = '#f4ecd8';
			epubArea.style.color = '#5c4033';
		} else if (tema === 'dark') {
			epubArea.style.backgroundColor = '#0f172a';
			epubArea.style.color = '#f8fafc';
		}
	}
	aplicarEstilosGlobalesIframes();
}

// Guarda manualmente el progreso de lectura
document.getElementById('btn-save-progress')?.addEventListener('click', async () => {
	const pagina = document.getElementById('page-input').value;
	if (pagina === "" || Number(pagina) < 0) {
		mostrarToast('Por favor introduce un número de página válido.', 'error');
		return;
	}

	try {
		const btn = document.getElementById('btn-save-progress');
		const originalText = btn.textContent;
		btn.disabled = true;
		btn.textContent = 'Guardando...';

		let esUltimaPagina = false;
		if (pdfDocInstance && Number(pagina) === pdfDocInstance.numPages) {
			esUltimaPagina = true;
		} else if (bookInstance && bookInstance.locations && bookInstance.locations.total > 0 && Number(pagina) >= bookInstance.locations.total - 1) {
			esUltimaPagina = true;
		}

		const nuevoEstado = esUltimaPagina ? 'COMPLETED' : 'READING';
		const resultado = await apiActualizarProgreso(progresoId, Number(pagina), nuevoEstado);

		btn.disabled = false;
		btn.textContent = originalText;

		if (esUltimaPagina) {
			mostrarToast('🎉 ¡Felicidades! Has terminado de leer este libro.', 'success');
		} else {
			mostrarToast('¡Progreso guardado con éxito!', 'success');
		}

		if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
			const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
			mostrarToast(`🏆 ¡Has desbloqueado logros!: ${nombresLogros}`, 'success');
		}

	} catch (err) {
		mostrarToast(`Error al guardar el progreso: ${err.message}`, 'error');
		const btn = document.getElementById('btn-save-progress');
		if (btn) {
			btn.disabled = false;
			btn.textContent = 'Guardar';
		}
	}
});

// Vuelve a la biblioteca personal
document.getElementById('back-btn')?.addEventListener('click', () => {
	window.location.href = 'PlanetaDigital.html';
});

// Carga y renderiza el PDF usando PDF.js
function cargarPdf(url, paginaInicial) {
	pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

	const container = document.getElementById('pdf-viewer');
	if (!container) return;
	
	container.innerHTML = '';
	pdfPagesRendered = {};

	if (observerInstance) {
		observerInstance.disconnect();
	}

	const loadingTask = pdfjsLib.getDocument(url);
	loadingTask.promise.then(pdf => {
		pdfDocInstance = pdf;
		const totalPages = pdf.numPages;

		pdf.getPage(1).then(firstPage => {
			const viewport = firstPage.getViewport({ scale: 1.5 });
			const aspectRatio = viewport.height / viewport.width;

			for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
				const pageContainer = document.createElement('div');
				pageContainer.className = 'pdf-page-container';
				pageContainer.id = `pdf-page-${pageNum}`;
				pageContainer.setAttribute('data-page-num', pageNum);

				const width = Math.min(container.clientWidth || 800, 800);
				const height = width * aspectRatio;
				pageContainer.style.width = `${width}px`;
				pageContainer.style.height = `${height}px`;

				const canvas = document.createElement('canvas');
				pageContainer.appendChild(canvas);

				const tag = document.createElement('div');
				tag.className = 'pdf-page-number-tag';
				tag.textContent = `${pageNum} / ${totalPages}`;
				pageContainer.appendChild(tag);

				container.appendChild(pageContainer);
			}

			configurarObserverPdf();

			if (paginaInicial && Number(paginaInicial) > 0) {
				setTimeout(() => {
					const targetPage = document.getElementById(`pdf-page-${paginaInicial}`);
					if (targetPage) {
						targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}, 600);
			}
		});
	}).catch(err => {
		console.error('Error al cargar PDF con PDF.js:', err);
		mostrarToast('Error al abrir el visor de PDF.', 'error');
	});
}

// Configura IntersectionObserver para renderizado inteligente del PDF
function configurarObserverPdf() {
	const options = {
		root: document.getElementById('pdf-area'),
		rootMargin: '100px 0px',
		threshold: 0.35
	};

	observerInstance = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			const pageNum = Number(entry.target.getAttribute('data-page-num'));

			if (entry.isIntersecting) {
				if (!pdfPagesRendered[pageNum]) {
					renderizarPaginaPdf(pageNum);
				}

				document.getElementById('page-input').value = pageNum;
				const esUltimaPagina = pdfDocInstance && (pageNum === pdfDocInstance.numPages);
				autoGuardarProgreso(pageNum, esUltimaPagina);
			}
		});
	}, options);

	const pages = document.querySelectorAll('.pdf-page-container');
	pages.forEach(page => observerInstance.observe(page));
}

// Renderiza en canvas una pagina especifica del PDF
function renderizarPaginaPdf(pageNum) {
	if (!pdfDocInstance || pdfPagesRendered[pageNum]) return;
	pdfPagesRendered[pageNum] = true;

	pdfDocInstance.getPage(pageNum).then(page => {
		const container = document.getElementById(`pdf-page-${pageNum}`);
		if (!container) return;

		const canvas = container.querySelector('canvas');
		const context = canvas.getContext('2d');

		const viewport = page.getViewport({ scale: 1.5 });
		canvas.width = viewport.width;
		canvas.height = viewport.height;

		const renderContext = {
			canvasContext: context,
			viewport: viewport
		};

		page.render(renderContext).promise.then(() => {
			container.style.height = 'auto';
		}).catch(err => {
			console.error(`Error en render de página PDF ${pageNum}:`, err);
			pdfPagesRendered[pageNum] = false;
		});
	});
}

// Carga las anotaciones del progreso actual desde el backend
async function cargarAnotacionesLibro() {
	if (!progresoId) return;
	try {
		const datos = await apiObtenerAnotaciones(progresoId);
		activeAnotaciones = datos || [];
		dibujarAnotaciones();
		renderizarListaSidebar();
	} catch (err) {
		console.error('Error al cargar anotaciones del libro:', err);
	}
}

// Dibuja todos los resaltados en la visualizacion de Epub.js
function dibujarAnotaciones() {
	if (!renditionInstance || !activeAnotaciones.length) return;

	activeAnotaciones.forEach(anotacion => {
		try {
			renditionInstance.annotations.remove(anotacion.marcador_posicion, "highlight");
			
			renditionInstance.annotations.add(
				"highlight",
				anotacion.marcador_posicion,
				{ id: anotacion.id },
				(e) => {
					const sidebar = document.getElementById('annotations-sidebar');
					if (sidebar) {
						sidebar.classList.add('open');
						setTimeout(() => {
							const cards = document.querySelectorAll('.annotation-card');
							cards.forEach(card => {
								const deleteBtn = card.querySelector(`.btn-delete-annotation[data-id="${anotacion.id}"]`);
								if (deleteBtn) {
									card.scrollIntoView({ behavior: 'smooth', block: 'center' });
									card.style.borderColor = 'var(--accent)';
									card.style.boxShadow = '0 0 10px var(--accent)';
									setTimeout(() => {
										card.style.borderColor = 'var(--border-color)';
										card.style.boxShadow = 'none';
									}, 2000);
								}
							});
						}, 350);
					}
				},
				"epubjs-highlight",
				{ 
					fill: anotacion.color_hex, 
					"fill-opacity": "0.35", 
					"mix-blend-mode": "multiply",
					cursor: "pointer" 
				}
			);
		} catch (err) {
			console.warn("No se pudo dibujar anotación para CFI:", anotacion.marcador_posicion, err);
		}
	});
}

// Posiciona y muestra el popover flotante sobre la seleccion
function mostrarPopoverAnotacion(top, left, width, height) {
	const popover = document.getElementById('annotation-popover');
	if (!popover) return;

	document.getElementById('popover-note-text').value = '';

	popover.style.display = 'flex';
	popover.style.opacity = '1';

	const popoverWidth = popover.offsetWidth;
	const popoverHeight = popover.offsetHeight;

	let popoverTop = top - popoverHeight - 12;
	let popoverLeft = left + (width / 2) - (popoverWidth / 2);

	const arrow = popover.querySelector('.popover-arrow');
	if (popoverTop < 10) {
		popoverTop = top + height + 12;
		if (arrow) {
			arrow.style.top = '-6px';
			arrow.style.bottom = 'auto';
			arrow.style.borderLeft = '1px solid var(--border-color)';
			arrow.style.borderTop = '1px solid var(--border-color)';
			arrow.style.borderRight = 'none';
			arrow.style.borderBottom = 'none';
		}
	} else {
		if (arrow) {
			arrow.style.top = 'auto';
			arrow.style.bottom = '-6px';
			arrow.style.borderRight = '1px solid var(--border-color)';
			arrow.style.borderBottom = '1px solid var(--border-color)';
			arrow.style.borderLeft = 'none';
			arrow.style.borderTop = 'none';
		}
	}

	if (popoverLeft < 10) popoverLeft = 10;
	if (popoverLeft + popoverWidth > window.innerWidth - 10) {
		popoverLeft = window.innerWidth - popoverWidth - 10;
	}

	popover.style.top = `${popoverTop}px`;
	popover.style.left = `${popoverLeft}px`;
}

// Oculta el popover de anotaciones
function ocultarPopoverAnotacion() {
	const popover = document.getElementById('annotation-popover');
	if (popover) {
		popover.style.display = 'none';
	}
	activeSelectionCfiRange = null;
	activeSelectionText = '';
}

// Limpia la seleccion de texto activa del EPUB
function limpiarSeleccionEpub() {
	if (activeSelectionContents) {
		try {
			activeSelectionContents.window.getSelection().removeAllRanges();
		} catch (e) {
			console.debug('Error removiendo selección:', e);
		}
		activeSelectionContents = null;
	}
}

// Inicializa eventos para colores y guardado en popover
function inicializarEventosPopover() {
	const dots = document.querySelectorAll('.color-dot');
	dots.forEach(dot => {
		dot.addEventListener('click', () => {
			dots.forEach(d => d.classList.remove('active'));
			dot.classList.add('active');
			currentPopoverColor = dot.getAttribute('data-color');
		});
	});

	document.getElementById('popover-cancel-btn')?.addEventListener('click', () => {
		ocultarPopoverAnotacion();
		limpiarSeleccionEpub();
	});

	document.getElementById('popover-save-btn')?.addEventListener('click', async () => {
		if (!activeSelectionCfiRange || !activeSelectionText) {
			ocultarPopoverAnotacion();
			return;
		}

		const notaText = document.getElementById('popover-note-text').value.trim();

		try {
			const btn = document.getElementById('popover-save-btn');
			btn.disabled = true;
			btn.textContent = '...';

			const nuevaAnotacion = {
				progreso_usuario_id: progresoId,
				marcador_posicion: activeSelectionCfiRange,
				texto_resaltado: activeSelectionText,
				nota_usuario: notaText || null,
				color_hex: currentPopoverColor
			};

			const respuesta = await apiCrearAnotacion(nuevaAnotacion);

			activeAnotaciones.push(respuesta.anotacion);
			dibujarAnotaciones();
			renderizarListaSidebar();
			limpiarSeleccionEpub();
			ocultarPopoverAnotacion();

		} catch (err) {
			console.error('Error al guardar anotación:', err);
			mostrarToast('Error al guardar la anotación: ' + err.message, 'error');
		} finally {
			const btn = document.getElementById('popover-save-btn');
			if (btn) {
				btn.disabled = false;
				btn.textContent = 'Guardar';
			}
		}
	});
}

// Inicializa apertura/cierre de la barra lateral de anotaciones
function inicializarEventosSidebar() {
	const sidebar = document.getElementById('annotations-sidebar');
	const toggleBtn = document.getElementById('btn-annotations-toggle');
	const closeBtn = document.getElementById('close-sidebar-btn');

	toggleBtn?.addEventListener('click', () => {
		sidebar.classList.toggle('open');
		if (sidebar.classList.contains('open')) {
			cargarAnotacionesLibro();
		}
	});

	closeBtn?.addEventListener('click', () => {
		sidebar.classList.remove('open');
	});
}

// Renderiza dinamicamente el listado en la barra lateral
function renderizarListaSidebar() {
	const listEl = document.getElementById('annotations-list');
	if (!listEl) return;

	if (activeAnotaciones.length === 0) {
		listEl.innerHTML = `<p class="no-annotations">No hay anotaciones aún. Selecciona texto en el EPUB para resaltar y agregar notas.</p>`;
		return;
	}

	listEl.innerHTML = '';

	activeAnotaciones.forEach(anotacion => {
		const card = document.createElement('div');
		card.className = 'annotation-card';
		card.style.borderLeft = `4px solid ${anotacion.color_hex}`;

		const fecha = new Date(anotacion.creado_en).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});

		let noteHtml = '';
		if (anotacion.nota_usuario) {
			noteHtml = `<div class="annotation-card-note">${escapeHtml(anotacion.nota_usuario)}</div>`;
		}

		card.innerHTML = `
			<div class="annotation-card-header">
				<span class="annotation-card-color" style="background-color: ${anotacion.color_hex};"></span>
				<span class="annotation-card-date">${fecha}</span>
			</div>
			<div class="annotation-card-text">"${escapeHtml(anotacion.texto_resaltado)}"</div>
			${noteHtml}
			<div class="annotation-card-footer">
				<button class="btn-delete-annotation" data-id="${anotacion.id}" title="Eliminar anotación">
					<span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
				</button>
			</div>
		`;

		// Hace scroll y navega al CFI al hacer click en la tarjeta
		card.addEventListener('click', (e) => {
			if (e.target.closest('.btn-delete-annotation')) return;

			if (renditionInstance) {
				renditionInstance.display(anotacion.marcador_posicion);
				if (window.innerWidth < 768) {
					document.getElementById('annotations-sidebar').classList.remove('open');
				}
			}
		});

		// Maneja la eliminacion de anotacion desde la tarjeta
		card.querySelector('.btn-delete-annotation').addEventListener('click', (e) => {
			e.stopPropagation();
			mostrarConfirmacion(
				'Eliminar Anotación',
				'¿Estás seguro de que deseas eliminar este resaltado/nota?',
				async () => {
					try {
						await apiEliminarAnotacion(anotacion.id);
						activeAnotaciones = activeAnotaciones.filter(a => a.id !== anotacion.id);

						if (renditionInstance) {
							renditionInstance.annotations.remove(anotacion.marcador_posicion, "highlight");
						}

						renderizarListaSidebar();
						mostrarToast('Anotación eliminada con éxito.', 'success');
					} catch (err) {
						mostrarToast('Error al eliminar la anotación: ' + err.message, 'error');
					}
				}
			);
		});

		listEl.appendChild(card);
	});
}

// Previene ataques XSS escapando HTML
function escapeHtml(text) {
	if (!text) return '';
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Inicializa controles de la barra Pomodoro
function inicializarEventosPomodoro() {
	const pomodoroBar = document.getElementById('pomodoro-bar');
	const toggleBtn = document.getElementById('btn-pomodoro-toggle');
	const playBtn = document.getElementById('pomodoro-play-btn');
	const resetBtn = document.getElementById('pomodoro-reset-btn');
	const optBtns = document.querySelectorAll('.pomodoro-opt-btn');

	toggleBtn?.addEventListener('click', () => {
		if (pomodoroBar) {
			if (pomodoroBar.style.display === 'none') {
				pomodoroBar.style.display = 'flex';
			} else {
				pomodoroBar.style.display = 'none';
			}
		}
	});

	optBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			optBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');

			const seconds = Number(btn.getAttribute('data-time'));
			const label = btn.getAttribute('data-label');

			pausarPomodoro();
			pomodoroActiveDuration = seconds;
			pomodoroTimeLeft = seconds;
			
			const labelEl = document.getElementById('pomodoro-label');
			if (labelEl) labelEl.textContent = label;
			
			actualizarTimerUI();
		});
	});

	playBtn?.addEventListener('click', () => {
		if (pomodoroIsRunning) {
			pausarPomodoro();
		} else {
			iniciarPomodoro();
		}
	});

	resetBtn?.addEventListener('click', () => {
		reiniciarPomodoro();
	});
}

// Inicia el cronómetro Pomodoro
function iniciarPomodoro() {
	if (pomodoroIsRunning) return;

	pomodoroIsRunning = true;
	const playBtn = document.getElementById('pomodoro-play-btn');
	if (playBtn) {
		playBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">pause</span>';
	}

	if (pomodoroTimeLeft === pomodoroActiveDuration) {
		pomodoroStartPage = Number(document.getElementById('page-input').value) || 0;
	}

	pomodoroInterval = setInterval(() => {
		pomodoroTimeLeft--;
		actualizarTimerUI();

		if (pomodoroTimeLeft <= 0) {
			clearInterval(pomodoroInterval);
			pomodoroIsRunning = false;
			
			if (playBtn) {
				playBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">play_arrow</span>';
			}

			reproducirSonidoNotificacion();
			
			const labelEl = document.getElementById('pomodoro-label');
			const isStudySession = labelEl && labelEl.textContent === 'Sesión de Lectura';
			
			if (isStudySession) {
				finalizarSesionLecturaPomodoro();
			} else {
				mostrarToast('¡Descanso terminado! Es hora de volver a leer.', 'info');
				reiniciarPomodoro();
			}
		}
	}, 1000);
}

// Pausa el cronómetro Pomodoro
function pausarPomodoro() {
	if (!pomodoroIsRunning) return;
	clearInterval(pomodoroInterval);
	pomodoroIsRunning = false;
	const playBtn = document.getElementById('pomodoro-play-btn');
	if (playBtn) {
		playBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">play_arrow</span>';
	}
}

// Reinicia el cronómetro Pomodoro a su duracion configurada
function reiniciarPomodoro() {
	pausarPomodoro();
	pomodoroTimeLeft = pomodoroActiveDuration;
	actualizarTimerUI();
}

// Refresca la cifra mostrada del cronómetro
function actualizarTimerUI() {
	const minutes = Math.floor(pomodoroTimeLeft / 60);
	const seconds = pomodoroTimeLeft % 60;
	const timerEl = document.getElementById('pomodoro-timer');
	if (timerEl) {
		timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
}

// Genera un sonido de aviso con la Web Audio API
function reproducirSonidoNotificacion() {
	try {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) return;

		const audioCtx = new AudioContextClass();
		
		const tocarBeep = (freq, delay, duration) => {
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
			
			gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
			gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + delay + 0.05);
			gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
			
			osc.start(audioCtx.currentTime + delay);
			osc.stop(audioCtx.currentTime + delay + duration);
		};

		tocarBeep(880, 0, 0.4);
		tocarBeep(1046.5, 0.35, 0.5);
	} catch (e) {
		console.warn("No se pudo reproducir el tono de audio:", e);
	}
}

// Registra la sesion leida en el backend
async function finalizarSesionLecturaPomodoro() {
	const endPage = Number(document.getElementById('page-input').value) || 0;
	const paginasLeidas = Math.max(0, endPage - pomodoroStartPage);
	const duracionMinutos = Math.round(pomodoroActiveDuration / 60);

	mostrarConfirmacion(
		'Registrar Sesión de Lectura',
		`¡Felicidades! Completaste tu sesión de lectura de ${duracionMinutos} minutos. ¿Deseas registrar esta sesión en tu historial de lectura con ${paginasLeidas} páginas leídas?`,
		async () => {
			try {
				const resultado = await apiRegistrarSesionLectura(progresoId, duracionMinutos, paginasLeidas);

				if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
					const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
					mostrarToast(`¡Sesión guardada con éxito! 🏆 ¡HAS DESBLOQUEADO LOGROS!: ${nombresLogros}`, 'success');
				} else {
					mostrarToast('¡Sesión registrada correctamente en tu historial!', 'success');
				}
			} catch (err) {
				console.error("Error al guardar sesión de lectura:", err);
				mostrarToast("Error al guardar la sesión de lectura: " + err.message, 'error');
			}
		}
	);
	reiniciarPomodoro();
}

// Inicializacion al cargar el DOM principal
document.addEventListener('DOMContentLoaded', () => {
	inicializarLector();
	inicializarEventosPopover();
	inicializarEventosSidebar();
	inicializarEventosPomodoro();

	document.addEventListener('click', (e) => {
		const popover = document.getElementById('annotation-popover');
		if (popover && popover.style.display !== 'none') {
			if (!popover.contains(e.target) && !e.target.closest('#btn-annotations-toggle') && !e.target.closest('#annotations-sidebar')) {
				ocultarPopoverAnotacion();
			}
		}
	});
});
