// URL base del backend
const API_URL = 'https://constelacion-de-libros-backend.onrender.com/api';

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

		window.location.href = 'biblioteca.html';

	} catch (error) {
		alert(`Error al iniciar sesión: ${error.message}`);
	}
});

window.handleCredentialResponse = async (response) => {
	try {
		const idToken = response.credential;
		const respuesta = await fetch(`${API_URL}/auth/google`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ idToken })
		});

		const datos = await respuesta.json();

		if (!respuesta.ok) {
			throw new Error(datos.error || 'Fallo de autenticación con Google');
		}

		localStorage.setItem('token', datos.token);
		localStorage.setItem('sesionActiva', 'true');

		window.location.href = 'biblioteca.html';

	} catch (error) {
		alert(`Error al iniciar sesión con Google: ${error.message}`);
	}
};
