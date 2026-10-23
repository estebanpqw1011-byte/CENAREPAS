# ImageUploader: subir imágenes a Cloudinary en un formulario

`ImageUploader` (en esta carpeta) sube una imagen al backend (`POST /uploads/imagen`), que la guarda en Cloudinary en `cenarepas/<carpeta>`. Valida antes de subir: JPG, PNG o WEBP de máximo 5 MB. Muestra vista previa, Cambiar, Quitar, carga y error, y funciona en tema claro y oscuro.

## 1. En el formulario

```jsx
import { ImageUploader } from '../../../shared/components/ImageUploader';

const [imagen, setImagen] = useState(null); // { url, public_id } nueva, o null si se quitó
const [quitada, setQuitada] = useState(false);

<ImageUploader
  carpeta="productos"                       // carpeta de tu módulo
  value={imagen?.url ?? (quitada ? null : producto?.imagen_url)}
  onChange={(nueva) => {
    setImagen(nueva);
    setQuitada(nueva === null);
  }}
  label="Imagen del producto"
/>

// Al guardar, envía solo lo que cambió:
const payload = {
  ...datos,
  ...(imagen ? { imagen_url: imagen.url, imagen_public_id: imagen.public_id } : {}),
  ...(quitada && producto?.imagen_url ? { quitar_imagen: true } : {}),
};
```

- `onChange` entrega `{ url, public_id }` apenas sube la imagen, o `null` al quitarla.
- Guarda **las dos** en el registro: la URL para mostrarla y el `public_id` para borrarla después.
- Si el usuario cambia la imagen otra vez antes de guardar, el componente borra la que subió en esa edición. La imagen original del registro **no** se borra desde el frontend.

## 2. En el servicio del backend (al guardar)

Borra la imagen anterior **después** de que el UPDATE se guardó:

```js
import { reemplazarArchivo } from '../utils/almacenamiento.js';

const anterior = (await query('SELECT imagen_public_id FROM producto WHERE id_producto = $1', [id])).rows[0];
// ... UPDATE con imagen_url e imagen_public_id nuevos ...
await reemplazarArchivo(anterior?.imagen_public_id, data.imagen_public_id);
```

`productos.service.js` y `categorias.service.js` ya lo hacen así (con `quitar_imagen`).

## 3. Carpetas habilitadas

Se definen en `Backend/src/routes/uploads.routes.js` (`CARPETAS_IMAGEN`), cada una con su permiso y su tabla:

| Carpeta | Permiso para subir o eliminar | Tabla |
|---|---|---|
| `productos` | `productos:crear` o `productos:editar` | `producto` |
| `categorias` | `categorias:crear` o `categorias:editar` | `categoria_producto` |

Para un módulo nuevo, primero se crea su campo de imagen (`imagen_url` + `imagen_public_id`, con migración) y después se agrega una línea en `CARPETAS_IMAGEN`.

## 4. Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/uploads/imagen` (multipart: `imagen` + `carpeta`) | 201 `{ url, public_id, ... }`. 400: tipo, contenido, más de 5 MB o carpeta no válida. 401/403: sin sesión o sin permiso. 502: Cloudinary no respondió o las credenciales son incorrectas. |
| DELETE | `/uploads/imagen` `{ public_id }` | 200. 400: `public_id` no válido. 403: sin permiso. 404: no existe. 409: un registro la tiene guardada (se reemplaza o se quita desde ese registro). |

Del frontend: `subirImagen(file, carpeta)` y `eliminarImagen(publicId)` en `shared/services/uploadService.js`.
