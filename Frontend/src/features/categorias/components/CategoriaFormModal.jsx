import { useState, useEffect, useMemo, useCallback } from 'react';
import { FolderTree, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getImageUrl } from '../../../shared/services/api';
import { subirArchivo, validarArchivo, FORMATOS_ARCHIVO } from '../../../shared/services/uploadService';

/**
 * Formulario único de categorías. modo: 'crear' | 'editar' | 'ver' (por
 * defecto, 'editar' si llega una categoría y 'crear' si no). En 'ver' todos
 * los campos son de solo lectura y no hay botón de guardar.
 */
export function CategoriaFormModal({ open, onClose, categoria = null, onSave, isLoading = false, modo }) {
  const modoActual = modo || (categoria ? 'editar' : 'crear');
  const soloLectura = modoActual === 'ver';
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState('Activo');
  // Imagen: la guardada (imagenUrl) o un archivo nuevo con su vista previa.
  const [imagenUrl, setImagenUrl] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const [errorImagen, setErrorImagen] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (open) {
      setArchivo(null);
      setVistaPrevia('');
      setErrorImagen('');
      setImagenUrl(categoria?.imagen_url || '');
      if (categoria) {
        setNombre(categoria.nombre || '');
        setDescripcion(categoria.descripcion || '');
        const isInactive = String(categoria.estado ?? '').toLowerCase() === 'inactivo';
        setEstado(isInactive ? 'Inactivo' : 'Activo');
      } else {
        setNombre('');
        setDescripcion('');
        setEstado('Activo');
      }
    }
  }, [categoria, open]);

  const isDirty = useMemo(() => {
    if (!open || soloLectura) return false;
    if (!categoria) {
      return nombre.trim() !== '' || descripcion.trim() !== '' || archivo != null;
    }
    return (
      archivo != null ||
      imagenUrl !== (categoria.imagen_url || '') ||
      nombre !== (categoria.nombre || '') ||
      descripcion !== (categoria.descripcion || '') ||
      estado !== (categoria.estado || 'Activo')
    );
  }, [open, soloLectura, categoria, nombre, descripcion, estado, archivo, imagenUrl]);

  const elegirArchivo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const error = validarArchivo(file, 'categoria');
    if (error) {
      setErrorImagen(error);
      return;
    }
    setErrorImagen('');
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    setArchivo(file);
    setVistaPrevia(URL.createObjectURL(file));
  };

  const quitarImagen = () => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    setArchivo(null);
    setVistaPrevia('');
    setImagenUrl('');
    setErrorImagen('');
  };

  const validateStep = useCallback(() => {
    if (!nombre.trim()) {
      return 'El nombre de la categoría es obligatorio.';
    }
    if (nombre.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres.';
    }
    return true;
  }, [nombre]);

  const handleSubmit = useCallback(async () => {
    const v = validateStep();
    if (v !== true) return;

    // Imagen nueva: se sube a Cloudinary (o al disco del servidor) al guardar.
    // Si se quitó la que tenía, quitar_imagen la borra.
    const imagen = { imagen_url: imagenUrl || null, imagen_public_id: null };
    if (archivo) {
      try {
        setSubiendo(true);
        const subido = await subirArchivo(archivo, 'categoria');
        imagen.imagen_url = subido.url;
        imagen.imagen_public_id = subido.public_id;
      } catch (err) {
        setErrorImagen(`No se pudo subir la imagen: ${err.message || 'error desconocido'}`);
        return;
      } finally {
        setSubiendo(false);
      }
    } else if (categoria?.imagen_url && !imagen.imagen_url) {
      imagen.quitar_imagen = true;
    }

    const payload = categoria
      ? { ...categoria, nombre: nombre.trim(), descripcion: descripcion.trim() || null, ...imagen, estado }
      : { nombre: nombre.trim(), descripcion: descripcion.trim() || null, ...imagen, estado };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep, categoria, nombre, descripcion, estado, imagenUrl, archivo, onSave, onClose]);

  const steps = useMemo(() => [
    {
      id: 'datos-categoria',
      title: 'Datos de categoría',
      description: 'Nombre, estado y descripción del catálogo',
      validate: validateStep,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Nombre */}
          <div className="sm:col-span-1">
            <label htmlFor="categoria_nombre" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Nombre de la categoría <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <FolderTree className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="categoria_nombre"
                name="nombre"
                type="text"
                maxLength={80}
                autoFocus={!soloLectura}
                readOnly={soloLectura}
                placeholder="Ej. Arepas Tradicionales, Línea Queso..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="sm:col-span-1">
            <label htmlFor="categoria_estado" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Estado <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="categoria_estado"
              name="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              disabled={soloLectura}
              options={[
                { value: 'Activo', label: 'Activo' },
                { value: 'Inactivo', label: 'Inactivo' },
              ]}
            />
          </div>

          {/* Descripción */}
          <div className="sm:col-span-2">
            <label htmlFor="categoria_descripcion" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Descripción de la categoría <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
            </label>
            <textarea
              id="categoria_descripcion"
              name="descripcion"
              maxLength={255}
              rows={3}
              readOnly={soloLectura}
              placeholder="Describe las características principales de los productos en esta categoría..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full p-3 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none min-h-[75px]"
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
              <span>Ayuda a categorizar y filtrar los productos en el catálogo comercial.</span>
              <span>{descripcion.length}/255</span>
            </div>
          </div>

          {/* Imagen */}
          <div className="sm:col-span-2 p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <span>Imagen de la categoría <span className="text-muted-foreground font-normal text-xs">(Opcional)</span></span>
              </span>
              {!soloLectura && (vistaPrevia || imagenUrl) && (
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Trash2 className="size-3.5" />
                  Quitar
                </button>
              )}
            </div>
            {vistaPrevia || imagenUrl ? (
              <div className="w-full h-36 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center">
                <img
                  src={vistaPrevia || getImageUrl(imagenUrl)}
                  alt={`Imagen de ${nombre || 'la categoría'}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : soloLectura ? (
              <p className="text-xs text-muted-foreground">Sin imagen.</p>
            ) : (
              <label
                htmlFor="categoria_imagen"
                className="flex flex-col items-center justify-center gap-1.5 w-full h-28 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer text-center px-3"
              >
                <Upload className="size-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Subir imagen desde el equipo</span>
                <span className="text-xs text-muted-foreground">{FORMATOS_ARCHIVO.categoria.texto} · máximo 5 MB</span>
                <input
                  id="categoria_imagen"
                  name="imagen"
                  type="file"
                  accept={FORMATOS_ARCHIVO.categoria.accept}
                  onChange={elegirArchivo}
                  className="sr-only"
                />
              </label>
            )}
            {archivo && <p className="text-xs text-muted-foreground">{archivo.name} · se sube al guardar</p>}
            {errorImagen && <p role="alert" className="text-xs font-semibold text-destructive">{errorImagen}</p>}
          </div>

          {/* Ayuda contextual */}
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
            <FolderTree className="size-4 text-[#C1502D] dark:text-[#E8B23D] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Clasificación en catálogo</span>
              Las categorías permiten filtrar ágilmente los productos e insumos en los módulos de producción, inventario y ventas.
            </div>
          </div>
        </div>
      ),
    },
  ], [nombre, estado, descripcion, validateStep, soloLectura, imagenUrl, vistaPrevia, archivo, errorImagen]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="CATEGORÍAS"
      title={{ crear: 'Nueva Categoría', editar: 'Editar Categoría', ver: 'Detalle de Categoría' }[modoActual]}
      subtitle="Organiza los productos terminados en familias y líneas de producción"
      steps={steps}
      onSubmit={handleSubmit}
      isLoading={isLoading || subiendo}
      submitLabel={modoActual === 'editar' ? 'Guardar Cambios' : 'Crear Categoría'}
      mode={soloLectura ? 'view' : modoActual === 'editar' ? 'edit' : 'create'}
      isDirty={isDirty}
    />
  );
}

export default CategoriaFormModal;
