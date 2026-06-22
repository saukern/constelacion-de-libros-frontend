// URL base del backend
const API_URL = 'http://localhost:3000/api';

// Obtener token guardado en el navegador
function obtenerToken() {
	return localStorage.getItem('token');
}

// Obtener las cabeceras HTTP comunes incluyendo la autenticación
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

// Peticion GET al backend para obtener los libros reales del usuario
async function apiObtenerBiblioteca() {
	try {
		const respuesta = await fetch(`${API_URL}/biblioteca`, {
			method: 'GET',
			headers: obtenerCabeceras()
		});

		const datos = await respuesta.json();

		if (!respuesta.ok) {
			throw new Error(datos.error || 'Error al obtener la biblioteca');
		}

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
				linkLectura: archivo.url_nube
			};
		});

	} catch (error) {
		console.error('Error en api al ObtenerBiblioteca:', error);
		throw error;
	}
}

// Enviar peticion al backend para importar libro desde gutenberg
async function apiImportarGutenberg(gutenbergId) {
    try {
        const respuesta = await fetch(`${API_URL}/biblioteca/importar-gutendex`, {
            method: 'POST',
            headers: obtenerCabeceras(),
            body: JSON.stringify({ gutenbergId: Number(gutenbergId) })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || 'Error al importar desde Gutenberg');
        }

        return datos;
    } catch (error) {
        console.error('Error al importar:', error);
        throw error;
    }
}
