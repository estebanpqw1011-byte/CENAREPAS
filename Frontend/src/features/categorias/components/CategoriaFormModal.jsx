import { useState, useEffect, useMemo, useCallback } from 'react';
import { FolderTree } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';

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

  useEffect(() => {
    if (open) {
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
      return nombre.trim() !== '' || descripcion.trim() !== '';
    }
    return (
      nombre !== (categoria.nombre || '') ||
      descripcion !== (categoria.descripcion || '') ||
      estado !== (categoria.estado || 'Activo')
    );
  }, [open, soloLectura, categoria, nombre, descripcion, estado]);

  const validateStep = useCallback(() => {
    if (!nombre.trim()) {
      return 'El nombre de la categoría es obligatorio.';
    }
    if (nombre.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres.';
    }
    return true;
  }, [nombre]);

  const handleSubmit = useCallback(() => {
    const v = validateStep();
    if (v !== true) return;

    const payload = categoria
      ? { ...categoria, nombre: nombre.trim(), descripcion: descripcion.trim() || null, estado }
      : { nombre: nombre.trim(), descripcion: descripcion.trim() || null, estado };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep, categoria, nombre, descripcion, estado, onSave, onClose]);

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
  ], [nombre, estado, descripcion, validateStep, soloLectura]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="CATEGORÍAS"
      title={{ crear: 'Nueva Categoría', editar: 'Editar Categoría', ver: 'Detalle de Categoría' }[modoActual]}
      subtitle="Organiza los productos terminados en familias y líneas de producción"
      steps={steps}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel={modoActual === 'editar' ? 'Guardar Cambios' : 'Crear Categoría'}
      mode={soloLectura ? 'view' : modoActual === 'editar' ? 'edit' : 'create'}
      isDirty={isDirty}
    />
  );
}

export default CategoriaFormModal;
