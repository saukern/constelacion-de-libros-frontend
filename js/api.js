// URL base del backend
const API_URL = 'https://constelacion-de-libros-backend.onrender.com/api';

// Función que obtiene el token de sesión guardado
function obtenerToken() {
	return localStorage.getItem('token');
}

// Función que genera las cabeceras HTTP incluyendo la autorización
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

// Función que procesa y valida la respuesta del backend
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

// Función que obtiene los libros y documentos del usuario
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
				estadoLectura: progreso.estado_lectura,
				tipo: esLibro ? 'libro' : 'documento'
			};
		});

	} catch (error) {
		console.error('Error en api al ObtenerBiblioteca:', error);
		throw error;
	}
}

// Función que solicita al backend importar un libro desde Gutenberg
async function apiImportarGutenberg(gutenbergId, datosLibro = {}) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/importar-gutendex`, {
			method: 'POST',
			headers: obtenerCabeceras(),
			body: JSON.stringify({ 
				gutenbergId: Number(gutenbergId),
				...datosLibro
			})
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al importar:', error);
		throw error;
	}
}

// Función que sube un libro o documento propio
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

// Función que actualiza la página y el estado de lectura de un libro
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

// Función que guarda un resaltado y nota en el servidor
async function apiCrearAnotacion(anotacion) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/anotaciones`, {
			method: 'POST',
			headers: obtenerCabeceras(),
			body: JSON.stringify(anotacion)
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al crear anotación:', error);
		throw error;
	}
}

// Función que obtiene las notas guardadas de un libro
async function apiObtenerAnotaciones(progresoUsuarioId) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/anotaciones/${progresoUsuarioId}`, {
			method: 'GET',
			headers: obtenerCabeceras()
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al obtener anotaciones:', error);
		throw error;
	}
}

// Función que elimina una nota guardada
async function apiEliminarAnotacion(anotacionId) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/anotaciones/${anotacionId}`, {
			method: 'DELETE',
			headers: obtenerCabeceras()
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al eliminar anotación:', error);
		throw error;
	}
}

// Función que guarda una sesión de lectura completada
async function apiRegistrarSesionLectura(progresoId, duracionMinutos, paginasLeidas) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/progreso/${progresoId}/sesion`, {
			method: 'POST',
			headers: obtenerCabeceras(),
			body: JSON.stringify({
				duracion_minutos: Number(duracionMinutos),
				paginas_leidas: Number(paginasLeidas)
			})
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al registrar sesión de lectura:', error);
		throw error;
	}
}

// Función que edita los datos básicos de un archivo
async function apiEditarArchivo(archivoId, metadatos) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/archivo/${archivoId}`, {
			method: 'PUT',
			headers: obtenerCabeceras(),
			body: JSON.stringify(metadatos)
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al editar archivo:', error);
		throw error;
	}
}

// Función que elimina un libro de tu biblioteca personal
async function apiEliminarDeBiblioteca(progresoId) {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca/${progresoId}`, {
			method: 'DELETE',
			headers: obtenerCabeceras()
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al eliminar de biblioteca:', error);
		throw error;
	}
}

// Función que obtiene el listado de logros e insignias del usuario
async function apiObtenerLogros() {
	try {
		const respuesta = await fetch(`${API_URL}/logros/logros`, {
			method: 'GET',
			headers: obtenerCabeceras()
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al obtener logros:', error);
		throw error;
	}
}

// Función que obtiene la meta literaria anual activa
async function apiObtenerMeta(anio) {
	try {
		const url = anio ? `${API_URL}/logros/meta/${anio}` : `${API_URL}/logros/meta`;
		const respuesta = await fetch(url, {
			method: 'GET',
			headers: obtenerCabeceras()
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al obtener meta literaria:', error);
		throw error;
	}
}

// Función que establece el objetivo de libros de la meta anual
async function apiEstablecerMeta(librosObjetivo, anio) {
	try {
		const cuerpo = { libros_objetivo: Number(librosObjetivo) };
		if (anio) cuerpo.anio = Number(anio);

		const respuesta = await fetch(`${API_URL}/logros/meta`, {
			method: 'POST',
			headers: obtenerCabeceras(),
			body: JSON.stringify(cuerpo)
		});

		return await procesarRespuesta(respuesta);
	} catch (error) {
		console.error('Error al establecer meta literaria:', error);
		throw error;
	}
}


