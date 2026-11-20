# Panel de gestión de biblioteca

Frontend Angular standalone para administrar el catálogo, sus autores y el ciclo
de préstamos mediante la API REST de `library-api`. La interfaz usa una paleta
negra, plateada y dorada, con diseño adaptable para pantallas pequeñas.

## Funciones

- Crear, editar, buscar, filtrar y eliminar libros.
- Administrar autores y asignarlos a los libros.
- Registrar préstamos, consultar su estado y registrar devoluciones.
- Mostrar indicadores del catálogo y mensajes de resultado de la API.

La API impide eliminar libros con préstamos activos y autores que todavía tengan
libros asociados; el panel presenta esos errores para que se puedan resolver.

## Ejecutar localmente

Requiere Node.js y npm. Desde la carpeta del frontend:

```bash
npm ci
npm start
```

La aplicación se sirve en `http://localhost:4200/` y, de forma local, consulta
`http://localhost:3000/api/v1`. Para apuntar a otra API, cambia `apiUrl` en
`src/environments/environment.ts`. La compilación de producción usa
`src/environments/environment.production.ts`.

## Compilar y probar

```bash
npm run build
npm test -- --watch=false
```

## Data binding en Angular

Los ejemplos didácticos están en `src/app/features/book/books.html`:

- **Interpolación** (`{{ ... }}`): muestra métricas y valores de libros.
- **Property binding** (`[disabled]`, `[class...]`): actualiza propiedades y
  estados visuales desde el componente.
- **Event binding** (`(click)`, `(ngModelChange)`): conecta acciones de la UI
  con funciones del componente.
- **Two-way binding** (`[(ngModel)]`): sincroniza formularios y filtros con sus
  campos en `src/app/features/book/books.ts`.

## Publicar en Render

`render.yaml` configura un Static Site con `npm ci && npm run build`, publica
`dist/front-api/browser` y reescribe las rutas de Angular a `index.html`. Se
puede desplegar creando un Blueprint de Render desde el repositorio del frontend.
