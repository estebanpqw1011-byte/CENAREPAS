import { useState, useEffect } from 'react';
import { X, Package, Plus, Trash2 } from 'lucide-react';
import { getFichasTecnicas, getFichaTecnicaInsumos } from '../../fichas-tecnicas/services/fichasTecnicasService';
import { getInsumos } from '../../insumos/services/insumosService';
import { getUsuarios } from '../../usuarios/services/usuariosService';
import { Combobox } from '../../../shared/ui/Combobox';
import { formatDate } from '../../../shared/utils/formatDate';
import { toast } from '../../../shared/utils/toast';

export function ProduccionFormModal({ open, onClose, lote = null, onSave, isLoading = false }) {
  const [idFicha, setIdFicha] = useState('');
  const [cantidadProducida, setCantidadProducida] = useState('');
  const [idUsuarioResponsable, setIdUsuarioResponsable] = useState('');
  const [fechaProduccion, setFechaProduccion] = useState('');
  const [estado, setEstado] = useState('en_proceso');
  const [observaciones, setObservaciones] = useState('');

  const [fichas, setFichas] = useState([]);
  const [availableInsumos, setAvailableInsumos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [insumosList, setInsumosList] = useState([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');

  useEffect(() => {
    getFichasTecnicas().then((data) => {
      if (Array.isArray(data)) setFichas(data);
    }).catch(() => {});
    getInsumos().then((data) => {
      if (Array.isArray(data)) setAvailableInsumos(data);
    }).catch(() => {});
    getUsuarios().then((data) => {
      if (Array.isArray(data)) setUsuarios(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (lote) {
      setIdFicha(lote.id_ficha ? String(lote.id_ficha) : '');
      setCantidadProducida(lote.cantidad_producida != null ? String(lote.cantidad_producida) : '');
      setIdUsuarioResponsable(lote.id_usuario_responsable ? String(lote.id_usuario_responsable) : '');
      setFechaProduccion(formatDate(lote.fecha_produccion, { forInput: true }));
      setEstado(lote.estado || 'en_proceso');
      setObservaciones(lote.observaciones || '');
      const loteInsumos = Array.isArray(lote.insumos) ? lote.insumos : lote.insumos_consumidos;
      setInsumosList(Array.isArray(loteInsumos) ? loteInsumos.map((item) => {
        const ins = availableInsumos.find((availableItem) => availableItem.id_insumo === item.id_insumo);
        return {
          ...item,
          nombre: item.insumo_nombre || item.nombre || ins?.nombre || '—',
          cantidad: item.cantidad ?? item.cantidad_consumida,
          unidad_medida: item.unidad_medida || ins?.unidad_medida || '—',
        };
      }) : []);
    } else {
      setIdFicha(fichas[0]?.id_ficha ? String(fichas[0].id_ficha) : '');
      setCantidadProducida('');
      setIdUsuarioResponsable(usuarios[0]?.id_usuario ? String(usuarios[0].id_usuario) : '');
      setFechaProduccion(formatDate(new Date(), { forInput: true }));
      setEstado('en_proceso');
      setObservaciones('');
    }
  }, [lote, open, fichas, usuarios, availableInsumos]);

  // Actualizar insumos requeridos cuando cambia la ficha seleccionada
  useEffect(() => {
    if (!idFicha || lote) return;
    getFichaTecnicaInsumos(idFicha)
      .then((ficha) => {
        const recipeInsumos = Array.isArray(ficha) ? ficha : ficha?.insumos;
        if (!Array.isArray(recipeInsumos)) {
          throw new Error('La respuesta de insumos de la receta no es válida');
        }
        setInsumosList(
          recipeInsumos.map((item) => {
            const ins = availableInsumos.find((i) => i.id_insumo === item.id_insumo);
            return {
              id_insumo: item.id_insumo,
              nombre: ins?.nombre || item.insumo_nombre || `Insumo #${item.id_insumo}`,
              cantidad: item.cantidad,
              unidad_medida: item.unidad_medida || ins?.unidad_medida || '—',
            };
          })
        );
      })
      .catch((error) => {
        toast.error(error.message || 'No se pudieron cargar los insumos de la receta');
      });
  }, [idFicha, availableInsumos, lote]);


  if (!open) return null;

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
          unidad_medida: ins.unidad_medida || '—',
        },
      ]);
    }
    setSelectedInsumoId('');
    setCantidadInsumo('');
  };

  const handleRemoveInsumo = (idToRemove) => {
    setInsumosList(insumosList.filter((i) => i.id_insumo !== idToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = lote
      ? {
          ...lote,
          id_ficha: idFicha ? Number(idFicha) : null,
          cantidad_producida: Number(cantidadProducida) || 0,
          id_usuario_responsable: idUsuarioResponsable ? Number(idUsuarioResponsable) : null,
          fecha_produccion: formatDate(fechaProduccion || new Date(), { forInput: true }),
          insumos: insumosList,
          estado,
          observaciones: observaciones.trim() || null,
        }
      : {
          id_ficha: idFicha ? Number(idFicha) : null,
          cantidad_producida: Number(cantidadProducida) || 0,
          id_usuario_responsable: idUsuarioResponsable ? Number(idUsuarioResponsable) : null,
          fecha_produccion: formatDate(fechaProduccion || new Date(), { forInput: true }),
          insumos: insumosList,
          estado: estado || 'en_proceso',
          observaciones: observaciones.trim() || null,
        };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="form-modal-panel bg-card text-card-foreground p-6 rounded-xl max-w-lg w-full border border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">{lote ? 'Editar Lote de Producción' : 'Registrar Lote de Producción'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control de producción de lotes y balance de insumos utilizados
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar formulario"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-grid space-y-4">
          <div className="modal-field-wide">
            <label htmlFor="lote_id_ficha" className="block mb-1.5 text-sm font-medium">Ficha Técnica (Receta) *</label>
            <Combobox
              id="lote_id_ficha"
              name="id_ficha"
              placeholder="Seleccionar receta..."
              value={idFicha}
              onValueChange={setIdFicha}
              onChange={(e) => setIdFicha(e.target.value)}
              required
              options={fichas.map((f) => ({
                value: String(f.id_ficha),
                label: f.nombre,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lote_cantidad_producida" className="block mb-1.5 text-sm font-medium">Cantidad Producida (und) *</label>
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
                className="w-full px-4 py-2 border border-input bg-input-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="lote_fecha_produccion" className="block mb-1.5 text-sm font-medium">Fecha de Producción *</label>
              <input
                id="lote_fecha_produccion"
                name="fecha_produccion"
                type="date"
                required
                value={fechaProduccion}
                onChange={(e) => setFechaProduccion(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-input-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lote_id_usuario_responsable" className="block mb-1.5 text-sm font-medium">Usuario Responsable *</label>
              <Combobox
                id="lote_id_usuario_responsable"
                name="id_usuario_responsable"
                value={idUsuarioResponsable}
                onValueChange={setIdUsuarioResponsable}
                onChange={(e) => setIdUsuarioResponsable(e.target.value)}
                required
                options={usuarios.map((u) => ({
                  value: String(u.id_usuario),
                  label: u.nombre,
                }))}
              />
            </div>
          </div>

          {/* Sección de Insumos Requeridos con Select Radix UI */}
          <div className="modal-field-wide space-y-3 p-4 rounded-xl border border-border bg-muted/20">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                Insumos Requeridos
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Insumos y materias primas a descontar del inventario
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Combobox
                  id="lote_insumo_id_insumo"
                  placeholder="Seleccionar insumo..."
                  value={selectedInsumoId}
                  onValueChange={setSelectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  options={availableInsumos.map((ins) => ({
                    value: String(ins.id_insumo),
                    label: `${ins.nombre} (${ins.unidad_medida})`,
                  }))}
                />
              </div>

              <div className="flex gap-2 sm:w-56">
                <input
                  id="lote_insumo_cantidad_consumida"
                  name="cantidad_consumida"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Cantidad"
                  value={cantidadInsumo}
                  onChange={(e) => setCantidadInsumo(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-input-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleAddInsumo}
                  disabled={!selectedInsumoId || !cantidadInsumo}
                  className="px-3.5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center gap-1 shrink-0 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
            </div>

            {insumosList.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                {insumosList.map((item) => (
                  <div key={item.id_insumo} className="flex items-center justify-between p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium text-foreground">{item.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground px-2 py-0.5 bg-muted rounded">
                        {item.cantidad} {item.unidad_medida}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInsumo(item.id_insumo)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Eliminar insumo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No hay insumos requeridos seleccionados para este lote.
              </div>
            )}
          </div>

          <div className="modal-field-wide">
            <label htmlFor="lote_observaciones" className="block mb-1.5 text-sm font-medium">Observaciones</label>
            <textarea
              id="lote_observaciones"
              name="observaciones"
              maxLength={255}
              rows={2}
              placeholder="Notas sobre el turno, incidencias o condiciones del lote..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-input-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="modal-field-wide">
            <label htmlFor="lote_estado" className="block mb-1.5 text-sm font-medium">Estado *</label>
            <Combobox
              id="lote_estado"
              name="estado"
              value={estado}
              onValueChange={setEstado}
              onChange={(e) => setEstado(e.target.value)}
              options={[
                { value: 'en_proceso', label: 'En proceso' },
                { value: 'finalizado', label: 'Finalizado' },
                { value: 'programado', label: 'Programado' },
              ]}
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium transition-colors shadow-xs"
            >
              {isLoading ? 'Guardando...' : lote ? 'Guardar Cambios' : 'Registrar Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
