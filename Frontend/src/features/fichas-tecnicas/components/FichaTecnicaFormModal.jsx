import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Package, Clock, BookOpen } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getOpcionesComo } from '../../../shared/services/opciones';

export function FichaTecnicaFormModal({ open, onClose, ficha = null, onSave, isLoading = false }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [tiempo, setTiempo] = useState('');
  const [rendimiento, setRendimiento] = useState('');
  const [estado, setEstado] = useState('Activo');

  const [availableInsumos, setAvailableInsumos] = useState([]);
  const [insumosRequeridos, setInsumosRequeridos] = useState([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    getOpcionesComo('insumos', 'id_insumo')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAvailableInsumos(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (ficha) {
        setNombre(ficha.nombre || '');
        setDescripcion(ficha.descripcion || '');
        setInstrucciones(ficha.instrucciones_preparacion || '');
        setTiempo(ficha.tiempo_estimado_minutos != null ? String(ficha.tiempo_estimado_minutos) : '');
        setRendimiento(ficha.rendimiento_lote != null ? String(ficha.rendimiento_lote) : '');
        const isInactive = String(ficha.estado ?? '').toLowerCase() === 'inactivo';
        setEstado(isInactive ? 'Inactivo' : 'Activo');

        if (Array.isArray(ficha.insumos) && ficha.insumos.length > 0) {
          setInsumosRequeridos(
            ficha.insumos.map((item) => {
              const insumoData = availableInsumos.find((i) => i.id_insumo === item.id_insumo);
              return {
                id_insumo: item.id_insumo,
                nombre: item.insumo_nombre || insumoData?.nombre || `Insumo #${item.id_insumo}`,
                cantidad: Number(item.cantidad) || 0,
                unidad_medida: item.unidad_medida || insumoData?.unidad_medida || 'kg',
              };
            })
          );
        } else {
          setInsumosRequeridos([]);
        }
      } else {
        setNombre('');
        setDescripcion('');
        setInstrucciones('');
        setTiempo('');
        setRendimiento('');
        setEstado('Activo');
        setInsumosRequeridos([]);
      }
      setSelectedInsumoId('');
      setCantidadInsumo('');
    } else {
      setCurrentStep(0);
    }
  }, [ficha, open, availableInsumos]);

  const handleAddInsumo = () => {
    if (!selectedInsumoId || !cantidadInsumo || Number(cantidadInsumo) <= 0) return;

    const insumoObj = availableInsumos.find((i) => String(i.id_insumo) === String(selectedInsumoId));
    if (!insumoObj) return;

    const existingIndex = insumosRequeridos.findIndex((i) => String(i.id_insumo) === String(selectedInsumoId));
    if (existingIndex >= 0) {
      const updated = [...insumosRequeridos];
      updated[existingIndex].cantidad = Number(cantidadInsumo);
      setInsumosRequeridos(updated);
    } else {
      setInsumosRequeridos([
        ...insumosRequeridos,
        {
          id_insumo: insumoObj.id_insumo,
          nombre: insumoObj.nombre,
          cantidad: Number(cantidadInsumo),
          unidad_medida: insumoObj.unidad_medida || 'kg',
        },
      ]);
    }

    setSelectedInsumoId('');
    setCantidadInsumo('');
  };

  const handleRemoveInsumo = (idToRemove) => {
    setInsumosRequeridos(insumosRequeridos.filter((i) => i.id_insumo !== idToRemove));
  };

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!ficha) {
      return nombre.trim() !== '' || insumosRequeridos.length > 0;
    }
    return (
      nombre !== (ficha.nombre || '') ||
      descripcion !== (ficha.descripcion || '') ||
      instrucciones !== (ficha.instrucciones_preparacion || '') ||
      tiempo !== String(ficha.tiempo_estimado_minutos ?? '') ||
      rendimiento !== String(ficha.rendimiento_lote ?? '') ||
      estado !== (ficha.estado || 'Activo')
    );
  }, [open, ficha, nombre, descripcion, instrucciones, tiempo, rendimiento, estado, insumosRequeridos]);

  const validateStep1 = useCallback(() => {
    if (!nombre.trim()) {
      return 'El nombre de la ficha técnica / receta es obligatorio.';
    }
    if (nombre.trim().length < 3) {
      return 'El nombre debe contener al menos 3 caracteres.';
    }
    return true;
  }, [nombre]);

  const validateStep2 = useCallback(() => {
    if (insumosRequeridos.length === 0) {
      return 'Debes agregar al menos un insumo a la formulación de la receta.';
    }
    return true;
  }, [insumosRequeridos]);

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

    const payload = ficha
      ? {
          ...ficha,
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          instrucciones_preparacion: instrucciones.trim(),
          tiempo_estimado_minutos: Number(tiempo) || 0,
          rendimiento_lote: Number(rendimiento) || 0,
          insumos: insumosRequeridos,
          estado,
        }
      : {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          instrucciones_preparacion: instrucciones.trim(),
          tiempo_estimado_minutos: Number(tiempo) || 0,
          rendimiento_lote: Number(rendimiento) || 0,
          insumos: insumosRequeridos,
          estado,
        };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep1, validateStep2, ficha, nombre, descripcion, instrucciones, tiempo, rendimiento, insumosRequeridos, estado, onSave, onClose]);

  const steps = useMemo(() => [
    {
      id: 'datos-generales',
      title: 'Parámetros base',
      description: 'Nombre, descripción, rendimiento y tiempo de preparación',
      validate: validateStep1,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <label htmlFor="ficha_nombre" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Nombre de la receta / ficha técnica <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="ficha_nombre"
                name="nombre"
                type="text"
                maxLength={100}
                autoFocus
                placeholder="Ej. Arepa Telita Tradicional, Arepa de Chócolo con Queso..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="sm:col-span-2">
            <label htmlFor="ficha_descripcion" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Descripción general <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
            </label>
            <textarea
              id="ficha_descripcion"
              name="descripcion"
              rows={2}
              maxLength={255}
              placeholder="Descripción de la preparación, tipo de masa y contextura..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full p-3 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none min-h-[60px]"
            />
          </div>

          {/* Rendimiento */}
          <div className="sm:col-span-1">
            <label htmlFor="ficha_rendimiento_lote" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Rendimiento por lote (unidades)
            </label>
            <input
              id="ficha_rendimiento_lote"
              name="rendimiento_lote"
              type="number"
              min="0"
              step="1"
              placeholder="Ej. 100"
              value={rendimiento}
              onChange={(e) => setRendimiento(e.target.value)}
              className="w-full h-10 px-3.5 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
            />
          </div>

          {/* Tiempo */}
          <div className="sm:col-span-1">
            <label htmlFor="ficha_tiempo_estimado_minutos" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Tiempo estimado (min)
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="ficha_tiempo_estimado_minutos"
                name="tiempo_estimado_minutos"
                type="number"
                min="0"
                placeholder="Ej. 45"
                value={tiempo}
                onChange={(e) => setTiempo(e.target.value)}
                className="w-full h-10 pl-10 pr-3 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
              />
            </div>
          </div>

        </div>
      ),
    },
    {
      id: 'insumos-receta',
      title: 'Insumos y receta',
      description: 'Materias primas por lote, instrucciones y estado',
      validate: validateStep2,
      content: (
        <div className="space-y-4 py-1">
          {/* Formulario de Agregar Insumo */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Package className="size-4 text-primary" />
                <span>Agregar Insumo a la Receta</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Especifica la materia prima requerida y la cantidad por tanda
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Combobox
                  id="ficha_insumo_id_insumo"
                  placeholder="Seleccionar insumo de la bodega..."
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  options={availableInsumos.map((ins) => ({
                    value: String(ins.id_insumo),
                    label: `${ins.nombre} (${ins.unidad_medida})`,
                  }))}
                />
              </div>

              <div className="flex gap-2 sm:w-48">
                <input
                  id="ficha_insumo_cantidad"
                  name="cantidad"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Cantidad"
                  value={cantidadInsumo}
                  onChange={(e) => setCantidadInsumo(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-input-background rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={handleAddInsumo}
                  disabled={!selectedInsumoId || !cantidadInsumo}
                  className="px-3.5 h-10 bg-[#C1502D] hover:bg-[#8A3418] text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Plus className="size-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* Tabla de Insumos */}
            {insumosRequeridos.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden max-h-32 overflow-y-auto custom-scrollbar">
                {insumosRequeridos.map((item) => (
                  <div key={item.id_insumo} className="flex items-center justify-between p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#C1502D]" />
                      <span className="font-semibold text-foreground">{item.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-foreground px-2 py-0.5 bg-muted rounded-md text-[11.5px]">
                        {item.cantidad} {item.unidad_medida}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInsumo(item.id_insumo)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                        title="Eliminar insumo"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                No has añadido ningún insumo a esta formulación.
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div>
            <label htmlFor="ficha_instrucciones_preparacion" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
              Instrucciones y pasos de preparación
            </label>
            <textarea
              id="ficha_instrucciones_preparacion"
              name="instrucciones_preparacion"
              rows={2}
              placeholder="Indica el orden de mezclado, tiempo de amasado, punto de humedad y temperatura de cocción..."
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              className="w-full p-3 border border-border bg-input-background rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs resize-none"
            />
          </div>

          {/* Estado */}
          <div className="sm:col-span-2">
            <label htmlFor="ficha_estado" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Estado <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="ficha_estado"
              name="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              options={[
                { value: 'Activo', label: 'Activo' },
                { value: 'Inactivo', label: 'Inactivo' },
              ]}
            />
          </div>
        </div>
      ),
    },
  ], [nombre, rendimiento, tiempo, estado, descripcion, availableInsumos, selectedInsumoId, cantidadInsumo, insumosRequeridos, instrucciones, validateStep1, validateStep2]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="PRODUCCIÓN"
      title={ficha ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}
      subtitle="Define la formulación estándar, insumos y proceso de elaboración de arepas"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel={ficha ? 'Guardar Cambios' : 'Crear Ficha Técnica'}
      isDirty={isDirty}
    />
  );
}

export default FichaTecnicaFormModal;
