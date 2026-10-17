import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Calendar, Truck } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getOpcionesComo, conValorActual } from '../../../shared/services/opciones';

export function InsumoFormModal({ open, onClose, insumo = null, onSave, isLoading = false }) {
  const [nombre, setNombre] = useState('');
  const [stockActual, setStockActual] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('kg');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [idProveedor, setIdProveedor] = useState('1');
  const [estado, setEstado] = useState('Activo');
  const [proveedores, setProveedores] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    getOpcionesComo('proveedores', 'id_proveedor')
      .then((data) => {
        if (Array.isArray(data)) setProveedores(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (insumo) {
        setNombre(insumo.nombre || '');
        setStockActual(insumo.stock_actual != null ? String(insumo.stock_actual) : '');
        setUnidadMedida(insumo.unidad_medida || 'kg');
        setFechaVencimiento(insumo.fecha_vencimiento || '');
        setStockMinimo(insumo.stock_minimo != null ? String(insumo.stock_minimo) : '');
        setIdProveedor(insumo.id_proveedor ? String(insumo.id_proveedor) : '1');
        const isInactive = String(insumo.estado ?? '').toLowerCase() === 'inactivo';
        setEstado(isInactive ? 'Inactivo' : 'Activo');
      } else {
        setNombre('');
        setStockActual('');
        setUnidadMedida('kg');
        setFechaVencimiento('');
        setStockMinimo('');
        setIdProveedor('1');
        setEstado('Activo');
      }
    } else {
      setCurrentStep(0);
    }
  }, [insumo, open]);

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!insumo) {
      return nombre.trim() !== '' || stockActual !== '';
    }
    return (
      nombre !== (insumo.nombre || '') ||
      stockActual !== String(insumo.stock_actual ?? '') ||
      unidadMedida !== (insumo.unidad_medida || 'kg') ||
      fechaVencimiento !== (insumo.fecha_vencimiento || '') ||
      stockMinimo !== String(insumo.stock_minimo ?? '') ||
      idProveedor !== String(insumo.id_proveedor || '1') ||
      estado !== (insumo.estado || 'Activo')
    );
  }, [open, insumo, nombre, stockActual, unidadMedida, fechaVencimiento, stockMinimo, idProveedor, estado]);

  const validateStep1 = useCallback(() => {
    if (!nombre.trim()) {
      return 'El nombre del insumo o materia prima es obligatorio.';
    }
    if (nombre.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres.';
    }
    if (!idProveedor) {
      return 'Debes seleccionar un proveedor asociado.';
    }
    return true;
  }, [nombre, idProveedor]);

  const validateStep2 = useCallback(() => {
    if (stockActual === '' || isNaN(Number(stockActual)) || Number(stockActual) < 0) {
      return 'El stock inicial debe ser un número válido mayor o igual a 0.';
    }
    if (stockMinimo !== '' && (isNaN(Number(stockMinimo)) || Number(stockMinimo) < 0)) {
      return 'El stock mínimo debe ser un número válido.';
    }
    return true;
  }, [stockActual, stockMinimo]);

  const handleSubmit = useCallback(() => {
    const v1 = validateStep1();
    if (v1 !== true) {
      setCurrentStep(0);
      return;
    }
    const v2 = validateStep2();
    if (v2 !== true) {
      setCurrentStep(1);
      return;
    }

    const payload = insumo
      ? {
          ...insumo,
          nombre: nombre.trim(),
          stock_actual: Number(stockActual) || 0,
          unidad_medida: unidadMedida,
          fecha_vencimiento: fechaVencimiento || null,
          stock_minimo: Number(stockMinimo) || 0,
          id_proveedor: Number(idProveedor) || idProveedor,
          estado,
        }
      : {
          nombre: nombre.trim(),
          stock_actual: Number(stockActual) || 0,
          unidad_medida: unidadMedida,
          fecha_vencimiento: fechaVencimiento || null,
          stock_minimo: Number(stockMinimo) || 0,
          id_proveedor: Number(idProveedor) || 1,
          estado,
        };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep1, validateStep2, insumo, nombre, stockActual, unidadMedida, fechaVencimiento, stockMinimo, idProveedor, estado, onSave, onClose]);

  const steps = useMemo(() => [
    {
      id: 'info-insumo',
      title: 'Datos generales',
      description: 'Nombre del insumo, proveedor asociado y estado',
      validate: validateStep1,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <label htmlFor="insumo_nombre" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Nombre del insumo <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="insumo_nombre"
                name="nombre"
                type="text"
                maxLength={100}
                autoFocus
                placeholder="Ej. Harina de Maíz Amarillo, Sal Refinada, Queso Costeño..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Proveedor */}
          <div className="sm:col-span-1">
            <label htmlFor="insumo_id_proveedor" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Proveedor habitual <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="insumo_id_proveedor"
              name="id_proveedor"
              value={idProveedor}
              onChange={(e) => setIdProveedor(e.target.value)}
              options={conValorActual(proveedores, 'id_proveedor', insumo?.id_proveedor, insumo?.proveedor_nombre).map((p) => ({
                value: String(p.id_proveedor),
                label: p.nombre,
              }))}
            />
          </div>

          {/* Estado */}
          <div className="sm:col-span-1">
            <label htmlFor="insumo_estado" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Estado <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="insumo_estado"
              name="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              options={[
                { value: 'Activo', label: 'Activo' },
                { value: 'Inactivo', label: 'Inactivo' },
              ]}
            />
          </div>

          {/* Ayuda contextual */}
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
            <Truck className="size-4 text-[#C1502D] dark:text-[#E8B23D] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Control de abastecimiento</span>
              En el siguiente paso podrás registrar las existencias actuales, unidad de medida y el umbral de stock mínimo para alertas.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'stock-inventario',
      title: 'Inventario',
      description: 'Cantidades, unidad de medida, stock mínimo y vigencia',
      validate: validateStep2,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Stock Actual */}
          <div className="sm:col-span-1">
            <label htmlFor="insumo_stock_actual" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Stock actual en bodega <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <input
              id="insumo_stock_actual"
              name="stock_actual"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej. 250"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              className="w-full h-10 px-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
            />
          </div>

          {/* Unidad de Medida */}
          <div className="sm:col-span-1">
            <label htmlFor="insumo_unidad_medida" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Unidad de medida <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="insumo_unidad_medida"
              name="unidad_medida"
              value={unidadMedida}
              onChange={(e) => setUnidadMedida(e.target.value)}
              options={[
                { value: 'kg', label: 'kg (Kilogramos)' },
                { value: 'g', label: 'g (Gramos)' },
                { value: 'l', label: 'l (Litros)' },
                { value: 'ml', label: 'ml (Mililitros)' },
                { value: 'unidad', label: 'unidad (Unidades)' },
              ]}
            />
          </div>

          {/* Stock Mínimo */}
          <div className="sm:col-span-1">
            <label htmlFor="insumo_stock_minimo" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Stock mínimo (Alerta)
            </label>
            <input
              id="insumo_stock_minimo"
              name="stock_minimo"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej. 50"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className="w-full h-10 px-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
            />
          </div>

          {/* Fecha de Vencimiento */}
          <div className="sm:col-span-1">
            <label htmlFor="insumo_fecha_vencimiento" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Fecha de vencimiento
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="insumo_fecha_vencimiento"
                name="fecha_vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-input bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Ayuda contextual */}
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
            <Package className="size-4 text-[#5A7A3A] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Disponibilidad para recetas</span>
              Este insumo estará disponible para ser asignado a las recetas en Fichas Técnicas y deducido en órdenes de Producción.
            </div>
          </div>
        </div>
      ),
    },
  ], [nombre, idProveedor, estado, stockActual, unidadMedida, stockMinimo, fechaVencimiento, proveedores, validateStep1, validateStep2]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="PRODUCCIÓN"
      title={insumo ? 'Editar Insumo' : 'Nuevo Insumo'}
      subtitle="Control de materias primas e insumos para la elaboración de arepas"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel={insumo ? 'Guardar Cambios' : 'Crear Insumo'}
      isDirty={isDirty}
    />
  );
}

export default InsumoFormModal;
