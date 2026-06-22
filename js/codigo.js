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

    // SE SUBE EN DE MANERA MANUAL Y SE DETECTA EL GÉNERO AUTOMÁTICAMENTE
    if (opcion === "2") {
        const titulo = prompt("Introduce el título del libro:");
        if (!titulo || titulo.trim() === "") return;

        const autor = prompt("Introduce el autor del libro:") || "Autor Desconocido";
        const portada = prompt("URL de la portada de la imagen (Opcional, dale aceptar si no tienes):") || null;

        //DETECTA EL GÉNERO AUTOMÁTICAMENTE BASADO EN PALABRAS CLAVE
        let generoDetectado = "Ficción"; 
        const textoAnalizar = titulo.toLowerCase();

        if (textoAnalizar.includes('anillos') || textoAnalizar.includes('mago') || textoAnalizar.includes('magia') || textoAnalizar.includes('bruja') || textoAnalizar.includes('dragón') || textoAnalizar.includes('crónicas')) {
            generoDetectado = "Fantasía";
        } else if (textoAnalizar.includes('galaxia') || textoAnalizar.includes('robot') || textoAnalizar.includes('espacio') || textoAnalizar.includes('futuro') || textoAnalizar.includes('alien') || textoAnalizar.includes('cyber')) {
            generoDetectado = "Ciencia Ficción";
        } else if (textoAnalizar.includes('asesinato') || textoAnalizar.includes('crimen') || textoAnalizar.includes('detective') || textoAnalizar.includes('secreto') || textoAnalizar.includes('misterio') || textoAnalizar.includes('sherlock')) {
            generoDetectado = "Misterio";
        } else if (textoAnalizar.includes('historia') || textoAnalizar.includes('ciencia') || textoAnalizar.includes('biografía') || textoAnalizar.includes('humana') || textoAnalizar.includes('guía')) {
            generoDetectado = "No Ficción";
        }

        const nuevoLibroManual = {
            id: Date.now(),
            titulo: titulo.trim(),
            autor: autor.trim(),
            genero: generoDetectado,
            portada: portada ? portada.trim() : null,
            linkLectura: null 
        };

        librosDisponibles.push(nuevoLibroManual);
        mostrarLibros('todos');

        // Sincronizar UI del menú lateral
        genreItems.forEach(i => i.classList.remove('active'));
        if (genreItems[0]) genreItems[0].classList.add('active'); 
        sectionTitle.textContent = "✨ Todos los libros";

        alert(`¡"${nuevoLibroManual.titulo}" se subió manualmente y se clasificó automáticamente en "${generoDetectado}"!`);
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