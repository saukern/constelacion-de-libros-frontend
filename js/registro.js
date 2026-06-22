// URL base del backend
const API_URL = 'http://localhost:3000/api';

document.getElementById('registro-form').addEventListener('submit', async (e) => {
	e.preventDefault();

	const username = document.getElementById('reg-username').value.trim();
	const email = document.getElementById('reg-email').value.trim();
	const password = document.getElementById('reg-password').value;

	try {
		const respuesta = await fetch(`${API_URL}/auth/registro`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				nombre_usuario: username,
				correo: email,
				password: password
			})
		});

		const datos = await respuesta.json();

		if (!respuesta.ok) {
			throw new Error(datos.error || 'Error al procesar el registro');
		}

		//Si el registro fue correcto guardamos token y iniciamos sesion
		localStorage.setItem('token', datos.token);
		localStorage.setItem('sesionActiva', 'true');

		alert('¡Cuenta creada y sesión iniciada con éxito!');

		window.location.href = 'PlanetaDigital.html';

	} catch (error) {
		alert(`Error al registrarse: ${error.message}`);
	}
});
