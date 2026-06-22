if (localStorage.getItem('sesionActiva') !== 'true') {
	window.location.href = 'login.html';
}

let progresoId = null;
let bookInstance = null;
let renditionInstance = null;

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

function inicializarLector() {
	const { id, titulo, formato, url, paginaActual } = obtenerParametrosURL();
	progresoId = id;

	document.getElementById('book-title').textContent = titulo || 'Libro';
	document.getElementById('page-input').value = paginaActual;

	if (!url) {
		alert(`Error: No se pudo obtener la direccion del archivo.\nQuery String recibida: ${window.location.search}`);
		return;
	}

	const pdfFrame = document.getElementById('pdf-frame');
	const epubArea = document.getElementById('epub-area');

	if (formato === 'PDF') {
		pdfFrame.style.display = 'block';
		pdfFrame.src = url;
	} else if (formato === 'EPUB') {
		epubArea.style.display = 'block';
		cargarEpub(url);
	} else {
		alert('Formato no soportado en el lector.');
	}
}

function cargarEpub(url) {
	try {
		bookInstance = ePub(url);
		renditionInstance = bookInstance.renderTo("epub-viewer", {
			width: "100%",
			height: "100%",
			flow: "paginated",
			allowScriptedContent: true
		});

		renditionInstance.display();

		document.getElementById('epub-prev').addEventListener('click', () => {
			renditionInstance.prev();
		});

		document.getElementById('epub-next').addEventListener('click', () => {
			renditionInstance.next();
		});

	} catch (err) {
		console.error('Error al inicializar el EPUB:', err);
		alert('Error al abrir el visor de EPUB.');
	}
}

document.getElementById('btn-save-progress')?.addEventListener('click', async () => {
	const pagina = document.getElementById('page-input').value;
	if (pagina === "" || Number(pagina) < 0) {
		alert('Por favor introduce un numero de pagina valido.');
		return;
	}

	try {
		const btn = document.getElementById('btn-save-progress');
		const originalText = btn.textContent;
		btn.disabled = true;
		btn.textContent = 'Guardando...';

		const resultado = await apiActualizarProgreso(progresoId, Number(pagina), 'READING');

		btn.disabled = false;
		btn.textContent = originalText;

		if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
			const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
			alert(`${resultado.mensaje}\n\n¡Has desbloqueado logros!: ${nombresLogros}`);
		} else {
			alert('¡Progreso guardado con éxito!');
		}

	} catch (err) {
		alert(`Error al guardar el progreso: ${err.message}`);
		const btn = document.getElementById('btn-save-progress');
		if (btn) {
			btn.disabled = false;
			btn.textContent = 'Guardar';
		}
	}
});

document.getElementById('back-btn')?.addEventListener('click', () => {
	window.location.href = 'PlanetaDigital.html';
});

document.addEventListener('DOMContentLoaded', () => {
	inicializarLector();
});
