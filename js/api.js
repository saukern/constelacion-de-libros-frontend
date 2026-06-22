// URL base del backend
const API_URL = 'http://localhost:3000/api';

function obtenerToken() {
	return localStorage.getItem('token');
}

function obtenerCabeceras() {
	const token = obtenerToken();
	const cabeceras = {
		'Content-Type': 'application/json'
	};
	if (token) {
		cabeceras['Authorization'] = `Bearer ${token}`;
	}
	return cabeceras;
}

async function procesarRespuesta(respuesta) {
	const contentType = respuesta.headers.get('content-type');
	let datos;
	if (contentType && contentType.includes('application/json')) {
		datos = await respuesta.json();
	} else {
		const texto = await respuesta.text();
		throw new Error(`Respuesta no JSON (Codigo ${respuesta.status}): ${texto.substring(0, 100)}`);
	}

	if (!respuesta.ok) {
		throw new Error(datos.error || `Error del servidor (Codigo ${respuesta.status})`);
	}
	return datos;
}

// Peticion GET al backend para obtener los libros reales del usuario
async function apiObtenerBiblioteca() {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca`, {
			method: 'GET',
			headers: obtenerCabeceras()
		});

		const datos = await procesarRespuesta(respuesta);

		// Mapearmos los datos de la BD a la estructura que usa el frontend
		return datos.map(progreso => {
			const archivo = progreso.archivo;
			const esLibro = !!archivo.libro;
			const autor = esLibro ? archivo.libro.autor : 'Documento';
			const genero = esLibro ? archivo.libro.genero : (archivo.documento.materia || 'General');

			return {
				id: progreso.id,
				archivoId: archivo.id,
				titulo: archivo.titulo,
				autor: autor,
				genero: genero,
				portada: archivo.url_portada,
				linkLectura: archivo.url_nube,
				formato: archivo.formato,
				paginaActual: progreso.pagina_actual,
				estadoLectura: progreso.estado_lectura
			};
		});

	} catch (error) {
		console.error('Error en api al ObtenerBiblioteca:', error);
		throw error;
	}
}

// Peticion al Backend para importar un libro desde gutendex 
async function apiImportarGutenberg(gutenbergId) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/importar-gutendex`, {
			method: 'POST',
			headers: obtenerCabeceras(),
			body: JSON.stringify({ gutenbergId: Number(gutenbergId) })
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al importar:', error);
		throw error;
	}
}

// Peticion al backend para subir un libro o documento propio 
async function apiSubirArchivo(formData) {
	try {
		const token = obtenerToken();
		const cabeceras = {};
		if (token) {
			cabeceras['Authorization'] = `Bearer ${token}`;
		}

		const respuesta = await fetch(`${API_URL}/biblioteca/subir`, {
			method: 'POST',
			headers: cabeceras,
			body: formData
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al subir:', error);
		throw error;
	}
}

// Peticion al backend para actualizar progreso 
async function apiActualizarProgreso(progresoId, paginaActual, estadoLectura) {
	try {
		const cuerpo = {};
		if (paginaActual !== undefined) cuerpo.pagina_actual = Number(paginaActual);
		if (estadoLectura !== undefined) cuerpo.estado_lectura = estadoLectura;

		const respuesta = await fetch(`${API_URL}/biblioteca/progreso/${progresoId}`, {
			method: 'PUT',
			headers: obtenerCabeceras(),
			body: JSON.stringify(cuerpo)
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al actualizar progreso:', error);
		throw error;
	}
}
