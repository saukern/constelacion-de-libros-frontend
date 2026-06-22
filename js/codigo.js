// CONTROL DE ACCESO (PROTECCIÓN LOGIN)
if (localStorage.getItem('sesionActiva') !== 'true') {
    window.location.href = 'login.html';
}

// DATOS DE PRUEBA INICIALES 
let librosDisponibles = [];

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

// RENDERIZADO DE TARJETAS DE LIBROS
function mostrarLibros(generoFiltrado = 'todos') {
    booksGrid.innerHTML = ''; 
    
    const filtrarPor = generoFiltrado.toLowerCase().trim();

    const librosFiltrados = filtrarPor === 'todos' 
        ? librosDisponibles 
        : librosDisponibles.filter(libro => libro.genero.toLowerCase().includes(filtrarPor) || filtrarPor.includes(libro.genero.toLowerCase()));

    if (librosFiltrados.length === 0) {
        booksGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; margin-top: 2rem;">No hay libros disponibles en este género.</p>`;
        return;
    }

    librosFiltrados.forEach(libro => {
        const tarjeta = document.createElement('div');
        tarjeta.classList.add('book-card');
        
        const portadaHTML = libro.portada 
            ? `<img src="${libro.portada}" alt="${libro.titulo}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<span class="material-symbols-outlined" style="font-size: 48px;">book</span>`;

        tarjeta.innerHTML = `
            <div class="book-cover">
                ${portadaHTML}
            </div>
            <h4 class="book-title" title="${libro.titulo}">${libro.titulo}</h4>
            <p class="book-author">${libro.autor}</p>
        `;
        
        // Abre la vista previa de Google en una pestaña nueva si existe
        tarjeta.addEventListener('click', () => {
            if (libro.linkLectura) {
                window.open(libro.linkLectura, '_blank');
            } else {
                alert(`El libro de muestra "${libro.titulo}" no cuenta con un enlace de vista previa en línea.`);
            }
        });

        booksGrid.appendChild(tarjeta);
    });
}

// FILTRADO DINÁMICO POR GÉNEROS
genreItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        genreItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const genero = item.getAttribute('data-genre');
        sectionTitle.innerHTML = item.innerHTML; 
        
        mostrarLibros(genero);
        cerrarMenu();
    });
});

// CONTROL DE SUBIDA (API GOOGLE O MANUAL AUTOMÁTICO)
uploadBtn.addEventListener('click', async () => {
    const API_KEY = "TU_API_KEY"; 
    
    // 1. Preguntar qué desea hacer el usuario
    const opcion = prompt("¿Cómo deseas agregar el libro?\nEscribe '1' para importar desde Project Gutenberg por ID\nEscribe '2' para subirlo manualmente");
    
    if (opcion !== "1" && opcion !== "2") {
        alert("Opción no válida.");
        return;
    }

    // IMPORTAR DESDE GUTENBERG
    if (opcion === "1") {
        const gutenbergId = prompt("Introduce el ID del libro de Project Gutenberg (ej: 11 o 1342):");
        if (!gutenbergId || gutenbergId.trim() === "") return;

        try {
            // mensaje temporal por si tarda la descarga
            alert("Iniciando descarga e importacion desde Gutenberg, por favor espera unos segundos...");

            const resultado = await apiImportarGutenberg(gutenbergId);

            // verificar si hay logros desbloqueados
            if (resultado.logros_desbloqueados && resultado.logros_desbloqueados.length > 0) {
                const nombresLogros = resultado.logros_desbloqueados.map(l => l.nombre).join(', ');
                alert(`${resultado.mensaje}\n\n🏆 ¡Has desbloqueado logros!: ${nombresLogros}`);
            } else {
                alert(resultado.mensaje);
            }

            // recargar biblioteca para ver el libro
            await cargarBiblioteca();

        } catch (error) {
            alert(`Error al importar libro: ${error.message}`);
        }
    }

    // SE SUBE EN DE MANERA MANUAL
    if (opcion === "2") {
        abrirModalUpload();
    }
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
            alert(`${resultado.mensaje}\n\n🏆 ¡Has desbloqueado logros!: ${nombresLogros}`);
        } else {
            alert(resultado.mensaje);
        }

        // recargar biblioteca
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

// Función para cargar los libros del backend
async function cargarBiblioteca() {
    try {
        librosDisponibles = await apiObtenerBiblioteca();
        mostrarLibros('todos');
    } catch (error) {
        alert(`No se pudo cargar la biblioteca: ${error.message}`);
    }
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    cargarBiblioteca();
});