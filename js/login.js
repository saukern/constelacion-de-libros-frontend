// URL base del backend
const API_URL = 'http://localhost:3000/api';

document.getElementById('login-form').addEventListener('submit', async (e) => {
	e.preventDefault();

	const usuario = document.getElementById('username').value;
	const contrasena = document.getElementById('password').value;

	try {
		// Peticion al backend 
		const respuesta = await fetch(`${API_URL}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				correo: usuario,
				password: contrasena
			})
		});

		const datos = await respuesta.json();

		if (!respuesta.ok) {
			throw new Error(datos.error || 'Credenciales incorrectas');
		}
		// Guardamos el token en el localStorage
		localStorage.setItem('token', datos.token);
		localStorage.setItem('sesionActiva', 'true');

		window.location.href = 'PlanetaDigital.html';

	} catch (error) {
		alert(`Error al iniciar sesión: ${error.message}`);
	}
});
