import { useState, useEffect, useMemo, useCallback } from 'react';
import { Factory, Plus, Trash2, Package, Calendar, UserCheck } from 'lucide-react';
import { getFichaTecnicaInsumos } from '../../fichas-tecnicas/services/fichasTecnicasService';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getOpcionesComo, conValorActual } from '../../../shared/services/opciones';

export function ProduccionFormModal({ open, onClose, lote = null, onSave, isLoading = false }) {
  const [idFicha, setIdFicha] = useState('1');
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [idUsuarioResponsable, setIdUsuarioResponsable] = useState('1');
  const [fechaProduccion, setFechaProduccion] = useState('');
  const [estado, setEstado] = useState('En proceso');
  const [observaciones, setObservaciones] = useState('');

  const [fichas, setFichas] = useState([]);
  const [availableInsumos, setAvailableInsumos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [insumosList, setInsumosList] = useState([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    getOpcionesComo('fichas-tecnicas', 'id_ficha')
      .then((data) => {
        if (Array.isArray(data)) setFichas(data);
      })
      .catch(() => {});
    getOpcionesComo('insumos', 'id_insumo')
      .then((data) => {
        if (Array.isArray(data)) setAvailableInsumos(data);
      })
      .catch(() => {});
    getOpcionesComo('usuarios', 'id_usuario')
      .then((data) => {
        if (Array.isArray(data)) setUsuarios(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (lote) {
        setIdFicha(lote.id_ficha ? String(lote.id_ficha) : '1');
        setCantidadProducida(lote.cantidad_producida != null ? String(lote.cantidad_producida) : '');
        setIdUsuarioResponsable(lote.id_usuario_responsable ? String(lote.id_usuario_responsable) : '1');
        setFechaProduccion(lote.fecha_produccion || '');
        setEstado(lote.estado || 'En proceso');
        setObservaciones(lote.observaciones || '');
        if (Array.isArray(lote.insumos_consumidos)) {
          setInsumosList(
            lote.insumos_consumidos.map((item) => {
              const ins = availableInsumos.find((i) => i.id_insumo === item.id_insumo);
              return {
                id_insumo: item.id_insumo,
                nombre: item.insumo_nombre || ins?.nombre || `Insumo #${item.id_insumo}`,
                cantidad: item.cantidad_consumida,
                unidad_medida: ins?.unidad_medida || 'kg',
              };
            })
          );
        }
      } else {
        setIdFicha(fichas[0]?.id_ficha ? String(fichas[0].id_ficha) : '1');
        setCantidadProducida('');
        setIdUsuarioResponsable(usuarios[0]?.id_usuario ? String(usuarios[0].id_usuario) : '1');
        setFechaProduccion(new Date().toISOString().split('T')[0]);
        setEstado('En proceso');
        setObservaciones('');
        setInsumosList([]);
      }
      setSelectedInsumoId('');
      setCantidadInsumo('');
    } else {
      setCurrentStep(0);
    }
  }, [lote, open, fichas, usuarios, availableInsumos]);

  // Actualizar insumos sugeridos desde la receta al crear nuevo lote
  useEffect(() => {
    if (!idFicha || lote || !open) return;
    getFichaTecnicaInsumos(idFicha)
      .then((recipeInsumos) => {
        if (Array.isArray(recipeInsumos) && recipeInsumos.length > 0) {
          setInsumosList(
            recipeInsumos.map((item) => {
              const ins = availableInsumos.find((i) => i.id_insumo === item.id_insumo);
              return {
                id_insumo: item.id_insumo,
                nombre: ins?.nombre || item.insumo_nombre || `Insumo #${item.id_insumo}`,
                cantidad: item.cantidad,
                unidad_medida: item.unidad_medida || ins?.unidad_medida || 'kg',
              };
            })
          );
        }
      })
      .catch(() => {});
  }, [idFicha, availableInsumos, lote, open]);

  const handleAddInsumo = () => {
    if (!selectedInsumoId || !cantidadInsumo || Number(cantidadInsumo) <= 0) return;
    const ins = availableInsumos.find((i) => String(i.id_insumo) === String(selectedInsumoId));
    if (!ins) return;

    const existingIdx = insumosList.findIndex((i) => String(i.id_insumo) === String(selectedInsumoId));
    if (existingIdx >= 0) {
      const updated = [...insumosList];
      updated[existingIdx].cantidad = Number(cantidadInsumo);
      setInsumosList(updated);
    } else {
      setInsumosList([
        ...insumosList,
        {
          id_insumo: ins.id_insumo,
          nombre: ins.nombre,
          cantidad: Number(cantidadInsumo),
          unidad_medida: ins.unidad_medida || 'kg',
        },
      ]);
    }
    setSelectedInsumoId('');
    setCantidadInsumo('');
  };

  const handleRemoveInsumo = (idToRemove) => {
    setInsumosList(insumosList.filter((i) => i.id_insumo !== idToRemove));
  };

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!lote) {
      return cantidadProducida !== '' || insumosList.length > 0;
    }
    return (
      idFicha !== String(lote.id_ficha || '1') ||
      cantidadProducida !== String(lote.cantidad_producida ?? '') ||
      idUsuarioResponsable !== String(lote.id_usuario_responsable || '1') ||
      fechaProduccion !== (lote.fecha_produccion || '') ||
      estado !== (lote.estado || 'En proceso') ||
      observaciones !== (lote.observaciones || '')
    );
  }, [open, lote, idFicha, cantidadProducida, idUsuarioResponsable, fechaProduccion, estado, observaciones, insumosList]);

  const validateStep1 = useCallback(() => {
    if (!idFicha) {
      return 'Debes seleccionar una receta o ficha técnica.';
    }
    if (!cantidadProducida || isNaN(Number(cantidadProducida)) || Number(cantidadProducida) <= 0) {
      return 'La cantidad producida debe ser un número mayor a 0.';
    }
    if (!fechaProduccion) {
      return 'La fecha de producción es obligatoria.';
    }
    return true;
  }, [idFicha, cantidadProducida, fechaProduccion]);

  const validateStep2 = useCallback(() => {
    return true;
  }, []);

  const handleSubmit = useCallback(() => {
    const v1 = validateStep1();
    if (v1 !== true) {
      setCurrentStep(0);
      return;
    }

    const payload = lote
      ? {
          ...lote,
          id_ficha: Number(idFicha) || 1,
          cantidad_producida: Number(cantidadProducida) || 0,
          id_usuario_responsable: Number(idUsuarioResponsable) || 1,
          fecha_produccion: fechaProduccion || new Date().toISOString().split('T')[0],
          insumos: insumosList,
          estado,
          observaciones: observaciones.trim() || null,
        }
      : {
          id_ficha: Number(idFicha) || 1,
          cantidad_producida: Number(cantidadProducida) || 0,
          id_usuario_responsable: Number(idUsuarioResponsable) || 1,
          fecha_produccion: fechaProduccion || new Date().toISOString().split('T')[0],
          insumos: insumosList,
          estado: estado || 'En proceso',
          observaciones: observaciones.trim() || null,
        };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep1, lote, idFicha, cantidadProducida, idUsuarioResponsable, fechaProduccion, insumosList, estado, observaciones, onSave, onClose]);

  const steps = useMemo(() => [
    {
      id: 'datos-lote',
      title: 'Parámetros del Lote',
      description: 'Ficha técnica, unidades elaboradas, fecha y responsable',
      validate: validateStep1,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {/* Ficha Técnica */}
            <div className="sm:col-span-2">
              <label htmlFor="lote_id_ficha" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
                Ficha Técnica / Receta base <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="lote_id_ficha"
                name="id_ficha"
                placeholder="Seleccionar receta base..."
                value={idFicha}
                onChange={(e) => setIdFicha(e.target.value)}
                options={conValorActual(fichas, 'id_ficha', lote?.id_ficha, lote?.ficha_nombre).map((f) => ({
                  value: String(f.id_ficha),
                  label: f.nombre,
                }))}
              />
            </div>

            {/* Cantidad a producir */}
            <div className="sm:col-span-1">
              <label htmlFor="lote_cantidad_producida" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
                Cantidad a Producir (paquetes) <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <input
                id="lote_cantidad_producida"
                name="cantidad_producida"
                type="number"
                min="1"
                step="1"
                required
                placeholder="Ej. 500"
                value={cantidadProducida}
                onChange={(e) => setCantidadProducida(e.target.value)}
                className="w-full h-10 px-3.5 border border-border bg-input-background rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs font-mono"
              />
            </div>

            {/* Fecha de producción */}
            <div className="sm:col-span-1">
              <label htmlFor="lote_fecha_produccion" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
                Fecha de Producción <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  id="lote_fecha_produccion"
                  name="fecha_produccion"
                  type="date"
                  required
                  value={fechaProduccion}
                  onChange={(e) => setFechaProduccion(e.target.value)}
                  className="w-full h-10 pl-10 pr-3.5 border border-border bg-input-background rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Responsable */}
            <div className="sm:col-span-1">
              <label htmlFor="lote_id_usuario_responsable" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
                Operario / Supervisor responsable <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="lote_id_usuario_responsable"
                name="id_usuario_responsable"
                value={idUsuarioResponsable}
                onChange={(e) => setIdUsuarioResponsable(e.target.value)}
                options={conValorActual(usuarios, 'id_usuario', lote?.id_usuario_responsable, lote?.responsable_nombre).map((u) => ({
                  value: String(u.id_usuario),
                  label: u.nombre,
                }))}
              />
            </div>

            {/* Estado */}
            <div className="sm:col-span-1">
              <label htmlFor="lote_estado" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
                Estado del lote <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="lote_estado"
                name="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                options={[
                  { value: 'En proceso', label: 'En proceso (En línea de horneo/amasado)' },
                  { value: 'Terminado', label: 'Terminado (Listo para empaque/CEDIS)' },
                  { value: 'Anulado', label: 'Anulado (Descartado por calidad)' },
                ]}
              />
            </div>

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label htmlFor="lote_observaciones" className="block text-xs sm:text-sm font-bold text-foreground mb-1.5">
                Observaciones del turno
              </label>
              <textarea
                id="lote_observaciones"
                name="observaciones"
                maxLength={255}
                rows={2}
                placeholder="Anotaciones sobre temperatura, humedad de masa o novedades en turno..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full p-3 min-h-[56px] border border-border bg-input-background rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs resize-none"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'insumos-lote',
      title: 'Insumos Consumidos',
      description: 'Materias primas a descontar del inventario de bodega',
      validate: validateStep2,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <Package className="size-4 text-primary" />
                <span>Descuento de Insumos para este Lote</span>
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-full">
                {insumosList.length} insumos requeridos
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Combobox
                  id="lote_insumo_id_insumo"
                  placeholder="Seleccionar insumo adicional..."
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
                  id="lote_insumo_cantidad_consumida"
                  name="cantidad_consumida"
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
                  className="px-3.5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Plus className="size-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* Tabla de Insumos */}
            {insumosList.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                {insumosList.map((item) => (
                  <div key={item.id_insumo} className="flex items-center justify-between p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
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
                        title="Quitar insumo"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                No hay insumos vinculados para descontar en este lote.
              </div>
            )}
          </div>

          <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-start gap-2.5">
            <Factory className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              Los insumos listados se descontarán automáticamente del stock general de materias primas cuando el estado del lote sea confirmado.
            </p>
          </div>
        </div>
      ),
    },
  ], [fichas, idFicha, cantidadProducida, fechaProduccion, usuarios, idUsuarioResponsable, estado, observaciones, availableInsumos, selectedInsumoId, cantidadInsumo, insumosList, validateStep1, validateStep2]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="PRODUCCIÓN"
      title={lote ? 'Editar Lote de Producción' : 'Registrar Lote de Producción'}
      subtitle="Planifica la elaboración de arepas y calcula el consumo de materia prima"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel={lote ? 'Guardar Cambios' : 'Registrar Lote'}
      isDirty={isDirty}
    />
  );
}

export default ProduccionFormModal;
