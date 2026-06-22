// CONTROL DE ACCESO (PROTECCIÓN LOGIN)
if (localStorage.getItem('sesionActiva') !== 'true') {
    window.location.href = 'login.html';
}

// DATOS DE PRUEBA INICIALES 
let librosDisponibles = [
    { id: 1, titulo: "El Hobbit", autor: "J.R.R. Tolkien", genero: "Fantasía", portada: null, linkLectura: null },
    { id: 2, titulo: "Dune", autor: "Frank Herbert", genero: "Ciencia Ficción", portada: null, linkLectura: null },
    { id: 3, titulo: "1984", autor: "George Orwell", genero: "Ficción", portada: null, linkLectura: null },
    { id: 4, titulo: "Estudio en Escarlata", autor: "Arthur Conan Doyle", genero: "Misterio", portada: null, linkLectura: null },
    { id: 5, titulo: "Sapiens", autor: "Yuval Noah Harari", genero: "No Ficción", portada: null, linkLectura: null }
];

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
            <p class="book-author">${libro.author}</p>
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
    const opcion = prompt("¿Cómo deseas agregar el libro?\nEscribe '1' para buscar en Google Books\nEscribe '2' para subirlo manualmente");
    
    if (opcion !== "1" && opcion !== "2") {
        alert("Opción no válida.");
        return;
    }

    // BÚSQUEDA AUTOMÁTICA EN GOOGLE BOOKS 
    if (opcion === "1") {
        const libroBuscado = prompt("Introduce el nombre del libro o autor que deseas buscar en Google:");
        if (!libroBuscado || libroBuscado.trim() === "") return;

        try {
            const query = encodeURIComponent(libroBuscado.trim());
            const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&key=${API_KEY}`;
            const respuesta = await fetch(url);
            if (!respuesta.ok) throw new Error(`Error en el servidor de Google: ${respuesta.status}`);
            const datos = await respuesta.json();

            if (!datos.items || datos.items.length === 0) {
                alert(`No se encontraron resultados para: "${libroBuscado}".`);
                return;
            }

            const infoLibro = datos.items[0].volumeInfo;
            let urlPortada = infoLibro?.imageLinks?.thumbnail ? infoLibro.imageLinks.thumbnail.replace(/^http:/i, 'https:') : null;

            // Traductor de géneros de Google
            let generoAsignado = "Ficción"; 
            if (infoLibro?.categories && infoLibro.categories.length > 0) {
                let categoriaGoogle = infoLibro.categories[0].toLowerCase();
                if (categoriaGoogle.includes('fiction')) generoAsignado = "Ficción";
                else if (categoriaGoogle.includes('fantasy') || categoriaGoogle.includes('potter')) generoAsignado = "Fantasía";
                else if (categoriaGoogle.includes('mystery') || categoriaGoogle.includes('thriller')) generoAsignado = "Misterio";
                else if (categoriaGoogle.includes('history') || categoriaGoogle.includes('biography')) generoAsignado = "No Ficción";
                else generoAsignado = infoLibro.categories[0].split('/')[0].trim();
            }

            const nuevoLibro = {
                id: Date.now(),
                titulo: infoLibro.title || "Título Desconocido",
                autor: infoLibro.authors ? infoLibro.authors.join(', ') : "Autor Desconocido",
                genero: generoAsignado,
                portada: urlPortada,
                linkLectura: infoLibro.previewLink || null
            };

            librosDisponibles.push(nuevoLibro);
            mostrarLibros('todos');
            alert(`¡"${nuevoLibro.titulo}" se ha agregado con éxito desde Google!`);

        } catch (error) {
            alert(`Ocurrió un problema: ${error.message}`);
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
    window.location.href = 'login.html';
});

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    mostrarLibros('todos');
});