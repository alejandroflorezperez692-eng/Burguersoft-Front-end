# Guía de seguridad de Burguersoft (en lenguaje sencillo)

> Checklist acordado el 11 de noviembre de 2026.
> Pendiente a propósito (decisión del equipo): **no** tocar el `.env` en Git
> ni montar la revisión automática de librerías por ahora.

## Estado actual — lo que ya está hecho ✅

| Tema | Estado |
|---|---|
| Carga de la página por partes (que el cliente no descargue el panel admin) | ✅ Hecho en `App.tsx` |
| Build limpio (sin avisos de variables sin usar) | ✅ Hecho |
| Prueba de la llave falsa del demo contra el servidor | ✅ Probado: el servidor la rechaza (ver nota abajo) |
| "Cerrar sesión" avisa al servidor para anular la llave | ✅ Hecho en `AuthContext` (falta la ruta en el backend, ver punto 5) |
| Guía con código Laravel listo para pegar | ✅ En este documento (puntos 3, 4, 5, 6 y 7) |

## 1. Cambiar las claves — DECIDIDO: NO HACERLO POR AHORA

Queda pendiente a propósito. Recordatorio del riesgo: las claves subieron a
GitHub dentro de `.env` y siguen visibles en el historial del repositorio.
Si algún día cambia de opinión, este punto va primero.

## 2. Restringir las claves para que "solo abran en mis puertas"

Se hace en los paneles web, no en código:

- **Cloudflare Turnstile** (el captcha del login):
  entra al panel de Cloudflare, abre el widget de Burguersoft y en los
  *dominios permitidos* deja únicamente tu dominio de producción y
  `localhost` (para pruebas). Quítalo de "gestionar" cualquier otro dominio.
- **Google reCAPTCHA** (el del registro):
  en el panel de reCAPTCHA, edita la clave y en *Dominios* deja solo tus
  dominios reales y `localhost`.
- **Firebase** (login por teléfono):
  en la consola de Firebase → *Configuración del proyecto* → tus claves web.
  En Google Cloud Console (*APIs y servicios → Credenciales*) edita la clave
  web y agrega *Restricciones de referenciador* con tus dominios y
  `localhost`. Así, aunque alguien copie la clave, no le sirve desde otra
  página.

## 3. Que el servidor verifique permisos en CADA petición

Las pantallas del frontend que ocultan botones y redirigen son solo el
letrero; el que debe poner la reja es Laravel. **Código listo para pegar:**

```php
// app/Http/Middleware/CheckRole.php  (crear el archivo)
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $rol = $request->user()?->rol?->nombre ?? $request->user()?->rol;

        if (! in_array($rol, $roles)) {
            abort(403, 'No tienes permiso para esta acción.');
        }

        return $next($request);
    }
}
```

```php
// bootstrap/app.php (Laravel 11/12) — registrar el middleware con alias
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['role' => \App\Http\Middleware\CheckRole::class]);
})
```

```php
// routes/api.php — proteger los grupos con rol real
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/usuarios', [UsuarioController::class, 'index']);
    Route::get('/reportes', [ReporteController::class, 'index']);
    // ...todo lo que sea solo del admin
});
```

- [ ] Cada ruta de la API protegida con `auth:sanctum` — ninguna consulta "abierta".
- [ ] Cada grupo con su middleware de rol (`role:admin`, `role:cajero`, etc.).
- [ ] Cambiar el rol de un usuario: permitido solo dentro del grupo `role:admin`.
- [ ] Probar con Postman: `/api/usuarios` con token de cliente → debe dar **403**.

## 4. Contar los intentos para que no adivinen contraseñas

En Laravel ya existe el contador de intentos (throttle). **Código listo:**

```php
// routes/api.php — limitar login y registro
Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});
Route::post('/registro', [AuthController::class, 'registro'])
    ->middleware('throttle:5,60'); // 5 por hora
Route::post('/recuperar-contrasena', [AuthController::class, 'recuperar'])
    ->middleware('throttle:3,60'); // 3 códigos por hora
```

```php
// bootstrap/app.php — definir la regla del login (por correo + IP)
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

->withMiddleware(function (Middleware $middleware) {
    RateLimiter::for('login', function (Request $request) {
        return [
            Limit::perMinute(5)->by($request->input('correo').'|'.$request->ip()),
        ];
    });
})
```

**Y el más importante: que el servidor valide de verdad el visto bueno de
Cloudflare** (el frontend ya lo manda en el campo `turnstileToken`):

```php
// En AuthController::login, ANTES de revisar correo y contraseña:
use Illuminate\Support\Facades\Http;

$verificacion = Http::asForm()->post('https://api.cloudflare.com/turnstile/v0/siteverify', [
    'secret'   => config('services.turnstile.secret'), // clave SECRETA (en .env del backend, no la del frontend)
    'response' => $request->input('turnstileToken'),
    'remoteip' => $request->ip(),
]);

abort_unless($verificacion->json('success'), 422, 'Verificación anti-robot fallida.');
```

- [ ] Validar el token de Turnstile en el servidor (código de arriba).
- [ ] Guardar la clave secreta de Turnstile en el `.env` del backend.
- [ ] Login: 5 intentos por minuto, con espera creciente al fallar.
- [ ] Registro: máximo 5 por hora por IP.
- [ ] "Recuperar contraseña": máximo 3 por hora por correo.

## 5. Que "cerrar sesión" cierre de verdad

✅ **Parte del frontend: ya está hecha.** Al cerrar sesión, la app ahora
avisa al servidor (`POST /logout`) para que anule la llave. Si el backend
aún no tiene esa ruta, simplemente lo ignora y el cierre local sigue
funcionando igual que siempre. Falta la parte del servidor:

```php
// routes/api.php — ruta para anular la llave actual
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', function (Request $request) {
        $request->user()->currentAccessToken()->delete(); // anula ESTA llave
        return response()->noContent();
    });
});
```

- [ ] Crear la ruta `POST /api/logout` (código de arriba).
- [ ] Tokens de vida corta (horas) o vencimiento máximo de 1 día:
      en el modelo de tokens (`HasApiTokens`), configurar
      `$token->expires_at` o renovar con `sanctum` según lo que usen.
- [ ] Probar: cerrar sesión en la página y luego reintentar la misma llave
      con Postman → debe responder **401**.

## 6. Doble llave para los administradores

- [ ] La opción más simple: código de 6 dígitos por correo al iniciar sesión
      el personal, con Laravel (notificación + tabla `codigos_login` con
      vencimiento de 10 minutos y máximo 5 intentos).
- [ ] Alternativa: código por SMS con Firebase (ya tienen la infraestructura
      de teléfono en `firebase.ts`).
- [ ] Pedirlo **solo** para roles de personal (admin, cajero, cocinero,
      mesero), no para clientes.
- [ ] El flujo: el login del personal responde `{"requiere_codigo": true}`
      y el frontend pide el código en una segunda pantalla antes de dar
      el token. Cuando el backend lo tenga, se adapta `Login.tsx`.

## 7. Prueba de la llave falsa del demo — RESULTADO (11/11/2026)

Se probó contra el backend local (`127.0.0.1:8000`) pedir `/me` y
`/usuarios` con el token falso del modo demo, y también sin token:

- ✅ **Ninguna petición devolvió datos**: el servidor rechaza todo. Bien.
- ⚠️ **Pero responde con error 500** (servidor roto) en vez de **401**
  (no autorizado). Casi con seguridad el middleware de autenticación está
  lanzando una excepción en vez de rechazar limpio.

Qué revisar en el backend:
- [ ] Que las rutas protegidas usen el middleware `auth:sanctum` y no fallen
      con excepción. Si al quitar el middleware manual sigue el 500, revisar
      `app/Exceptions` por algún `try/catch` global que convierta el rechazo
      en error de servidor.
- [ ] Que sin token la respuesta sea 401 con mensaje claro
      (`{"message": "No autenticado."}`), que es el estándar de
      Laravel/Sanctum.
- [ ] Consecuencia práctica: mientras sea 500, la app del cliente muestra
      "error del servidor" en vez de "debes iniciar sesión" — por eso
      conviene arreglarlo, además de evitar alarmas falsas.

## Ideas para después (opcional)

- Cookie `httpOnly` para el token en vez de `sessionStorage` (el servidor
  la manda y el JavaScript de la página no puede leerla ni robarla).
- Revisión automática de librerías con `npm audit` en el robot de GitHub
  (quedó pendiente a propósito).
