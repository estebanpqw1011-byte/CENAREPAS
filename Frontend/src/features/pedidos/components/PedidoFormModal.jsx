import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getOpciones, getOpcionesComo, conValorActual } from '../../../shared/services/opciones';

export function PedidoFormModal({ open, onClose, pedido = null, onSave, isLoading = false }) {
  const [idCliente, setIdCliente] = useState('1');
  const [idSede, setIdSede] = useState('1');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [observaciones, setObservaciones] = useState('');

  // Catálogos
  const [clientes, setClientes] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [estados, setEstados] = useState([]);
  const [availableProductos, setAvailableProductos] = useState([]);

  // Detalle de Pedido (detalle_pedido)
  const [detalles, setDetalles] = useState([]);
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');

  // Errores de validación
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getOpcionesComo('clientes', 'id_cliente').then((data) => {
      if (Array.isArray(data)) setClientes(data);
    }).catch(() => {});
    getOpcionesComo('sedes', 'id_sede').then((data) => {
      if (Array.isArray(data)) setSedes(data);
    }).catch(() => {});
    getOpciones('estados-pedido').then((data) => {
      if (Array.isArray(data)) setEstados(data);
    }).catch(() => {});
    getOpcionesComo('productos', 'id_producto').then((data) => {
      if (Array.isArray(data)) setAvailableProductos(data);
    }).catch(() => {});
  }, []);

  // Al cambiar el producto seleccionado, precargar su precio_venta
  useEffect(() => {
    if (selectedProductoId) {
      const prod = availableProductos.find((p) => String(p.id_producto) === String(selectedProductoId));
      if (prod) {
        setPrecioUnitario(String(prod.precio_venta || ''));
      }
    } else {
      setPrecioUnitario('');
    }
  }, [selectedProductoId, availableProductos]);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (pedido) {
        setIdCliente(pedido.id_cliente ? String(pedido.id_cliente) : (clientes[0]?.id_cliente ? String(clientes[0].id_cliente) : '1'));
        setIdSede(pedido.id_sede ? String(pedido.id_sede) : (sedes[0]?.id_sede ? String(sedes[0].id_sede) : '1'));
        setFechaEntrega(pedido.fecha_entrega || '');
        setEstado(pedido.estado || 'Pendiente');
        setObservaciones(pedido.observaciones || '');

        if (Array.isArray(pedido.detalles) && pedido.detalles.length > 0) {
          setDetalles(
            pedido.detalles.map((d) => {
              const prod = availableProductos.find((p) => p.id_producto === d.id_producto);
              return {
                id_producto: d.id_producto,
                nombre_producto: prod?.nombre || d.nombre_producto || `Producto #${d.id_producto}`,
                cantidad: Number(d.cantidad) || 0,
                precio_unitario: Number(d.precio_unitario) || 0,
                subtotal: Number(d.subtotal) || Number(d.cantidad) * Number(d.precio_unitario),
              };
            })
          );
        } else {
          setDetalles([]);
        }
      } else {
        setIdCliente(clientes[0]?.id_cliente ? String(clientes[0].id_cliente) : '1');
        setIdSede(sedes[0]?.id_sede ? String(sedes[0].id_sede) : '1');
        setFechaEntrega('');
        setEstado('Pendiente');
        setObservaciones('');
        setDetalles([]);
      }
      setSelectedProductoId('');
      setCantidadProducto('');
      setPrecioUnitario('');
      setErrors({});
    } else {
      setCurrentStep(0);
    }
  }, [pedido, open, clientes, sedes, availableProductos]);

  // Cálculo automático del valor total
  const valorTotalCalculado = useMemo(() => {
    return detalles.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
  }, [detalles]);

  const handleAddDetalle = () => {
    if (!selectedProductoId || !cantidadProducto || Number(cantidadProducto) <= 0 || !precioUnitario || Number(precioUnitario) <= 0) {
      return;
    }

    const prod = availableProductos.find((p) => String(p.id_producto) === String(selectedProductoId));
    if (!prod) return;

    const cant = Number(cantidadProducto);
    const unitPrice = Number(precioUnitario);
    const subtotal = cant * unitPrice;

    const existingIndex = detalles.findIndex((d) => String(d.id_producto) === String(selectedProductoId));
    if (existingIndex >= 0) {
      const updated = [...detalles];
      updated[existingIndex] = {
        ...updated[existingIndex],
        cantidad: cant,
        precio_unitario: unitPrice,
        subtotal,
      };
      setDetalles(updated);
    } else {
      setDetalles([
        ...detalles,
        {
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre,
          cantidad: cant,
          precio_unitario: unitPrice,
          subtotal,
        },
      ]);
    }

    setSelectedProductoId('');
    setCantidadProducto('');
    setPrecioUnitario('');
    if (errors.detalles) {
      setErrors((prev) => ({ ...prev, detalles: null }));
    }
  };

  const handleRemoveDetalle = (idProductoToRemove) => {
    setDetalles(detalles.filter((d) => d.id_producto !== idProductoToRemove));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!idCliente) errs.idCliente = 'Debes seleccionar un cliente';
    if (!idSede) errs.idSede = 'Debes seleccionar una sede';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (detalles.length === 0) {
      errs.detalles = 'Debes agregar al menos un producto al pedido';
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validateStep1()) {
      setCurrentStep(0);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(1);
      return;
    }

    const payload = pedido
      ? {
          ...pedido,
          id_cliente: Number(idCliente) || 1,
          id_sede: Number(idSede) || 1,
          id_usuario: pedido.id_usuario || 1,
          fecha_entrega: fechaEntrega || null,
          valor_total: valorTotalCalculado,
          estado,
          observaciones: observaciones.trim() || null,
          motivo_anulacion: pedido.motivo_anulacion || null,
          detalles,
        }
      : {
          id_cliente: Number(idCliente) || 1,
          id_sede: Number(idSede) || 1,
          id_usuario: 1,
          fecha_entrega: fechaEntrega || null,
          valor_total: valorTotalCalculado,
          estado: estado || 'Pendiente',
          observaciones: observaciones.trim() || null,
          motivo_anulacion: null,
          detalles,
        };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  };

  const steps = [
    {
      id: 'datos',
      title: 'Información del Pedido',
      description: 'Selecciona el cliente, sede de entrega, estado y observaciones',
      validate: validateStep1,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {/* Cliente */}
            <div className="sm:col-span-1">
              <label htmlFor="pedido_id_cliente" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Cliente Solicitante <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="pedido_id_cliente"
                name="id_cliente"
                value={idCliente}
                onChange={(e) => {
                  setIdCliente(e.target.value);
                  if (errors.idCliente) setErrors((prev) => ({ ...prev, idCliente: null }));
                }}
                options={conValorActual(clientes, 'id_cliente', pedido?.id_cliente, pedido?.cliente_nombre).map((c) => ({
                  value: String(c.id_cliente),
                  label: c.nombre,
                }))}
              />
              {errors.idCliente && <p className="text-xs text-destructive mt-1">{errors.idCliente}</p>}
            </div>

            {/* Sede */}
            <div className="sm:col-span-1">
              <label htmlFor="pedido_id_sede" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Sede de Despacho <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="pedido_id_sede"
                name="id_sede"
                value={idSede}
                onChange={(e) => {
                  setIdSede(e.target.value);
                  if (errors.idSede) setErrors((prev) => ({ ...prev, idSede: null }));
                }}
                options={conValorActual(sedes, 'id_sede', pedido?.id_sede, pedido?.sede_nombre).map((s) => ({
                  value: String(s.id_sede),
                  label: s.nombre,
                }))}
              />
              {errors.idSede && <p className="text-xs text-destructive mt-1">{errors.idSede}</p>}
            </div>

            {/* Fecha entrega */}
            <div className="sm:col-span-1">
              <label htmlFor="pedido_fecha_entrega" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Fecha Estimada de Entrega
              </label>
              <input
                id="pedido_fecha_entrega"
                name="fecha_entrega"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full h-10 px-3.5 border border-border bg-input-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Estado */}
            <div className="sm:col-span-1">
              <label htmlFor="pedido_estado" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Estado del Pedido <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="pedido_estado"
                name="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                // Estados reales del pedido (GET /opciones/estados-pedido); el actual siempre aparece.
                options={(estados.some((e) => e.id === estado) || !estado ? estados : [...estados, { id: estado, nombre: estado }])
                  .map((e) => ({ value: e.id, label: e.nombre }))}
              />
            </div>

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label htmlFor="pedido_observaciones" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Instrucciones u Observaciones de Despacho
              </label>
              <textarea
                id="pedido_observaciones"
                name="observaciones"
                maxLength={255}
                rows={2}
                placeholder="Instrucciones para despacho, horario de recepción o empaque..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full p-3 min-h-[56px] border border-border bg-input-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-start gap-2.5">
            <ShoppingBag className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              Asegúrate de confirmar la sede de despacho correcta para calcular rutas y disponibilidad de inventario terminado.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'productos',
      title: 'Productos Solicitados',
      description: 'Selecciona los productos terminados, cantidades y valida el precio pactado',
      validate: validateStep2,
      content: (
        <div className="space-y-4">
          <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShoppingBag className="size-4 text-primary" />
                Agregar Producto al Pedido
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona el producto terminado y valida la cantidad solicitada
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <Combobox
                  id="detalle_pedido_id_producto"
                  aria-label="Seleccionar producto para pedido"
                  placeholder="Seleccionar producto..."
                  value={selectedProductoId}
                  onChange={(e) => setSelectedProductoId(e.target.value)}
                  options={[
                    { value: '', label: 'Seleccionar producto...' },
                    ...availableProductos.map((prod) => ({
                      value: String(prod.id_producto),
                      label: `${prod.nombre} ($${Number(prod.precio_venta).toLocaleString('es-CO')})`,
                    })),
                  ]}
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  id="detalle_pedido_cantidad"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Cantidad (und)"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-input-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  id="detalle_pedido_precio_unitario"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Precio Unitario ($)"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-input-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddDetalle}
                  disabled={!selectedProductoId || !cantidadProducto || !precioUnitario}
                  className="w-full h-10 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center justify-center transition-opacity cursor-pointer shadow-xs"
                  title="Agregar producto al pedido"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Listado de productos agregados */}
            {detalles.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden max-h-44 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-12 gap-2 p-2 bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-card">
                  <div className="col-span-5">Producto</div>
                  <div className="col-span-2 text-center">Cant.</div>
                  <div className="col-span-2 text-right">P. Unitario</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                  <div className="col-span-1 text-center">Quitar</div>
                </div>
                {detalles.map((d) => (
                  <div key={d.id_producto} className="grid grid-cols-12 gap-2 p-2.5 text-xs items-center">
                    <div className="col-span-5 font-medium text-foreground truncate">
                      {d.nombre_producto}
                    </div>
                    <div className="col-span-2 text-center text-muted-foreground">
                      {d.cantidad} und
                    </div>
                    <div className="col-span-2 text-right font-mono">
                      ${Number(d.precio_unitario).toLocaleString('es-CO')}
                    </div>
                    <div className="col-span-2 text-right font-semibold font-mono text-primary">
                      ${Number(d.subtotal).toLocaleString('es-CO')}
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveDetalle(d.id_producto)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="size-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                No hay productos agregados en este pedido.
              </div>
            )}
            {errors.detalles && <p className="text-xs text-destructive">{errors.detalles}</p>}
          </div>

          {/* Campo Calculado: Valor Total */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-xs sm:text-sm font-semibold text-foreground">Valor Total del Pedido:</span>
            <span className="text-base sm:text-lg font-bold font-mono text-primary">
              ${valorTotalCalculado.toLocaleString('es-CO')}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      category="Pedidos"
      title={pedido ? 'Editar Pedido' : 'Nuevo Pedido de Cliente'}
      subtitle="Programa órdenes de despacho y cantidades solicitadas por clientes"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      submitLabel={pedido ? 'Guardar Cambios' : 'Crear Pedido'}
      isLoading={isLoading}
      isDirty={detalles.length > 0 || Boolean(observaciones)}
    />
  );
}

export default PedidoFormModal;

