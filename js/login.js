// Lógica del Login temporal antes de conectar la base de datos
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault(); // Evita que la página se recargue
    
    const usuario = document.getElementById('username').value;
    const contrasena = document.getElementById('password').value;

    // Simulación de validación aqui despues se valida con la base de datos
    if (usuario.trim() !== "" && contrasena === "1234") {
        // Guardamos en la memoria del navegador que el usuario ya entró
        localStorage.setItem('sesionActiva', 'true');
        // Lo mandamos a la biblioteca principal
        window.location.href = 'PlanetaDigital.html';
    } else {
        alert("Contraseña incorrecta (Prueba usando '1234')");
    }
});
