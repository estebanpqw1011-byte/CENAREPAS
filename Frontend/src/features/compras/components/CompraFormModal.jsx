import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Package, Paperclip, FileText } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getOpcionesComo, conValorActual } from '../../../shared/services/opciones';
import { subirArchivo, validarArchivo, FORMATOS_ARCHIVO } from '../../../shared/services/uploadService';

export function CompraFormModal({ open, onClose, compra = null, onSave, isLoading = false }) {
  const [fechaCompra, setFechaCompra] = useState('');
  const [idProveedor, setIdProveedor] = useState('1');
  const [medioPago, setMedioPago] = useState('Transferencia');
  // Soporte (factura): el que ya tiene la compra, o un archivo nuevo por subir.
  const [tieneSoporte, setTieneSoporte] = useState(false);
  const [archivoSoporte, setArchivoSoporte] = useState(null);
  const [errorSoporte, setErrorSoporte] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [estado, setEstado] = useState('Registrada');

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [availableInsumos, setAvailableInsumos] = useState([]);

  // Detalle de Compra (detalle_compra)
  const [detalles, setDetalles] = useState([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('');
  const [valorUnitarioInsumo, setValorUnitarioInsumo] = useState('');

  // Errores de validación
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getOpcionesComo('proveedores', 'id_proveedor').then((data) => {
      if (Array.isArray(data)) setProveedores(data);
    }).catch(() => {});
    getOpcionesComo('insumos', 'id_insumo').then((data) => {
      if (Array.isArray(data)) setAvailableInsumos(data);
    }).catch(() => {});
  }, []);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (compra) {
        setFechaCompra(compra.fecha_compra || '');
        setIdProveedor(compra.id_proveedor ? String(compra.id_proveedor) : '1');
        setMedioPago(compra.medio_pago || 'Transferencia');
        setTieneSoporte(Boolean(compra.comprobante_public_id || compra.comprobante_url));
        setEstado(compra.estado || 'Registrada');

        if (Array.isArray(compra.detalles) && compra.detalles.length > 0) {
          setDetalles(
            compra.detalles.map((d) => {
              const ins = availableInsumos.find((i) => i.id_insumo === d.id_insumo);
              return {
                id_insumo: d.id_insumo,
                nombre_insumo: ins?.nombre || d.nombre_insumo || `Insumo #${d.id_insumo}`,
                unidad_medida: ins?.unidad_medida || d.unidad_medida || 'kg',
                cantidad: Number(d.cantidad) || 0,
                valor_unitario: Number(d.valor_unitario) || 0,
                subtotal: Number(d.subtotal) || Number(d.cantidad) * Number(d.valor_unitario),
              };
            })
          );
        } else {
          setDetalles([]);
        }
      } else {
        setFechaCompra(new Date().toISOString().split('T')[0]);
        setIdProveedor(proveedores[0]?.id_proveedor ? String(proveedores[0].id_proveedor) : '1');
        setMedioPago('Transferencia');
        setTieneSoporte(false);
        setEstado('Registrada');
        setDetalles([]);
      }
      setSelectedInsumoId('');
      setCantidadInsumo('');
      setValorUnitarioInsumo('');
      setArchivoSoporte(null);
      setErrorSoporte('');
      setErrors({});
    } else {
      setCurrentStep(0);
    }
  }, [compra, open, proveedores, availableInsumos]);

  // Cálculo automático del valor total
  const valorTotalCalculado = useMemo(() => {
    return detalles.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
  }, [detalles]);

  const handleAddDetalle = () => {
    if (!selectedInsumoId || !cantidadInsumo || Number(cantidadInsumo) <= 0 || !valorUnitarioInsumo || Number(valorUnitarioInsumo) <= 0) {
      return;
    }

    const ins = availableInsumos.find((i) => String(i.id_insumo) === String(selectedInsumoId));
    if (!ins) return;

    const cant = Number(cantidadInsumo);
    const unitPrice = Number(valorUnitarioInsumo);
    const subtotal = cant * unitPrice;

    const existingIndex = detalles.findIndex((d) => String(d.id_insumo) === String(selectedInsumoId));
    if (existingIndex >= 0) {
      const updated = [...detalles];
      updated[existingIndex] = {
        ...updated[existingIndex],
        cantidad: cant,
        valor_unitario: unitPrice,
        subtotal,
      };
      setDetalles(updated);
    } else {
      setDetalles([
        ...detalles,
        {
          id_insumo: ins.id_insumo,
          nombre_insumo: ins.nombre,
          unidad_medida: ins.unidad_medida || 'kg',
          cantidad: cant,
          valor_unitario: unitPrice,
          subtotal,
        },
      ]);
    }

    setSelectedInsumoId('');
    setCantidadInsumo('');
    setValorUnitarioInsumo('');
    if (errors.detalles) {
      setErrors((prev) => ({ ...prev, detalles: null }));
    }
  };

  const handleRemoveDetalle = (idInsumoToRemove) => {
    setDetalles(detalles.filter((d) => d.id_insumo !== idInsumoToRemove));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!fechaCompra) errs.fechaCompra = 'La fecha de compra es obligatoria';
    if (!idProveedor) errs.idProveedor = 'Debes seleccionar un proveedor';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (detalles.length === 0) {
      errs.detalles = 'Debes agregar al menos un insumo a la orden de compra';
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const elegirSoporte = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const error = validarArchivo(file, 'compra');
    if (error) {
      setErrorSoporte(error);
      return;
    }
    setErrorSoporte('');
    setArchivoSoporte(file);
  };

  const quitarSoporte = () => {
    setArchivoSoporte(null);
    setTieneSoporte(false);
    setErrorSoporte('');
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep(0);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(1);
      return;
    }

    // Soporte nuevo: se sube (Cloudinary privado o disco del servidor) al
    // guardar. Si se quitó el que tenía, quitar_comprobante lo borra.
    const soporte = {};
    if (archivoSoporte) {
      try {
        setSubiendo(true);
        const subido = await subirArchivo(archivoSoporte, 'compra');
        soporte.comprobante_url = subido.url;
        soporte.comprobante_public_id = subido.public_id;
        soporte.comprobante_recurso = subido.recurso;
      } catch (err) {
        setErrorSoporte(`No se pudo subir el soporte: ${err.message || 'error desconocido'}`);
        setCurrentStep(0);
        return;
      } finally {
        setSubiendo(false);
      }
    } else if (compra && !tieneSoporte && (compra.comprobante_public_id || compra.comprobante_url)) {
      soporte.quitar_comprobante = true;
    }

    // Al editar no se reenvían los datos del soporte guardado (solo los cambios).
    const { comprobante_url: _u, comprobante_public_id: _p, comprobante_recurso: _r, ...compraSinSoporte } = compra || {};
    const payload = compra
      ? {
          ...compraSinSoporte,
          fecha_compra: fechaCompra,
          id_proveedor: Number(idProveedor) || 1,
          id_usuario: compra.id_usuario || 1,
          valor_total: valorTotalCalculado,
          medio_pago: medioPago,
          ...soporte,
          estado,
          detalles,
        }
      : {
          fecha_compra: fechaCompra,
          id_proveedor: Number(idProveedor) || 1,
          id_usuario: 1,
          valor_total: valorTotalCalculado,
          medio_pago: medioPago,
          ...soporte,
          estado: estado || 'Registrada',
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
      title: 'Datos de la Orden',
      description: 'Define fecha, proveedor, medio de pago y soporte documental',
      validate: validateStep1,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {/* Fecha de compra */}
            <div className="sm:col-span-1">
              <label htmlFor="compra_fecha_compra" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Fecha de Compra <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <input
                id="compra_fecha_compra"
                name="fecha_compra"
                type="date"
                required
                value={fechaCompra}
                onChange={(e) => {
                  setFechaCompra(e.target.value);
                  if (errors.fechaCompra) setErrors((prev) => ({ ...prev, fechaCompra: null }));
                }}
                className={`w-full h-10 px-3.5 border rounded-xl text-xs sm:text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  errors.fechaCompra ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.fechaCompra && <p className="text-xs text-destructive mt-1">{errors.fechaCompra}</p>}
            </div>

            {/* Proveedor */}
            <div className="sm:col-span-1">
              <label htmlFor="compra_id_proveedor" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Proveedor <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="compra_id_proveedor"
                name="id_proveedor"
                value={idProveedor}
                onChange={(e) => {
                  setIdProveedor(e.target.value);
                  if (errors.idProveedor) setErrors((prev) => ({ ...prev, idProveedor: null }));
                }}
                options={conValorActual(proveedores, 'id_proveedor', compra?.id_proveedor, compra?.proveedor_nombre).map((p) => ({
                  value: String(p.id_proveedor),
                  label: p.nombre,
                }))}
              />
              {errors.idProveedor && <p className="text-xs text-destructive mt-1">{errors.idProveedor}</p>}
            </div>

            {/* Medio de Pago */}
            <div className="sm:col-span-1">
              <label htmlFor="compra_medio_pago" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Medio de Pago <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="compra_medio_pago"
                name="medio_pago"
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                options={[
                  { value: 'Transferencia', label: 'Transferencia Bancaria' },
                  { value: 'Efectivo', label: 'Efectivo' },
                  { value: 'Credito', label: 'Crédito Proveedor' },
                ]}
              />
            </div>

            {/* Estado */}
            <div className="sm:col-span-1">
              <label htmlFor="compra_estado" className="block mb-1.5 text-xs sm:text-sm font-bold text-foreground">
                Estado de la Compra <span className="text-destructive font-bold ml-0.5">*</span>
              </label>
              <Combobox
                id="compra_estado"
                name="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                options={[
                  { value: 'Registrada', label: 'Registrada' },
                  { value: 'Anulada', label: 'Anulada' },
                ]}
              />
            </div>

            {/* Soporte: factura o comprobante */}
            <div className="sm:col-span-2 p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                <Paperclip className="size-4 text-primary" />
                Factura o soporte <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
              </span>
              {archivoSoporte || tieneSoporte ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
                  <span className="flex items-center gap-2 min-w-0 text-xs text-foreground">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span className="truncate">
                      {archivoSoporte ? `${archivoSoporte.name} · se sube al guardar` : 'Soporte adjunto (se abre desde el detalle)'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={quitarSoporte}
                    className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer font-semibold shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                    Quitar
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="compra_soporte"
                  className="flex items-center justify-center gap-2 w-full h-14 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer text-xs px-3"
                >
                  <Paperclip className="size-4 text-primary" />
                  <span className="font-semibold text-foreground">Adjuntar archivo</span>
                  <span className="text-muted-foreground">{FORMATOS_ARCHIVO.compra.texto} · máximo 5 MB</span>
                  <input
                    id="compra_soporte"
                    name="soporte"
                    type="file"
                    accept={FORMATOS_ARCHIVO.compra.accept}
                    onChange={elegirSoporte}
                    className="sr-only"
                  />
                </label>
              )}
              {errorSoporte && <p role="alert" className="text-xs font-semibold text-destructive">{errorSoporte}</p>}
            </div>
          </div>

          <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-start gap-2.5">
            <Package className="size-4 text-primary shrink-0 mt-0.5" />
            <p>
              Verifica que el proveedor y medio de pago coincidan con la factura física o electrónica recibida antes de añadir las líneas de insumos.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'insumos',
      title: 'Insumos y Liquidación',
      description: 'Agrega los insumos recibidos, cantidades y precios acordados',
      validate: validateStep2,
      content: (
        <div className="space-y-4">
          <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <Package className="size-4 text-primary" />
                Agregar Insumo a la Orden
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona el insumo recibido, cantidad y valor unitario pactado
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <Combobox
                  id="detalle_compra_id_insumo"
                  aria-label="Seleccionar insumo para compra"
                  placeholder="Seleccionar insumo..."
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  options={[
                    { value: '', label: 'Seleccionar insumo...' },
                    ...availableInsumos.map((ins) => ({
                      value: String(ins.id_insumo),
                      label: `${ins.nombre} (${ins.unidad_medida})`,
                    })),
                  ]}
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  id="detalle_compra_cantidad"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Cantidad"
                  value={cantidadInsumo}
                  onChange={(e) => setCantidadInsumo(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-input-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  id="detalle_compra_valor_unitario"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Precio Unitario ($)"
                  value={valorUnitarioInsumo}
                  onChange={(e) => setValorUnitarioInsumo(e.target.value)}
                  className="w-full h-10 px-3 border border-border bg-input-background rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddDetalle}
                  disabled={!selectedInsumoId || !cantidadInsumo || !valorUnitarioInsumo}
                  className="w-full h-10 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center justify-center transition-opacity cursor-pointer shadow-xs"
                  title="Agregar insumo a la compra"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Listado de líneas agregadas */}
            {detalles.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden max-h-44 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-12 gap-2 p-2 bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-card">
                  <div className="col-span-5">Insumo</div>
                  <div className="col-span-2 text-center">Cant.</div>
                  <div className="col-span-2 text-right">V. Unitario</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                  <div className="col-span-1 text-center">Quitar</div>
                </div>
                {detalles.map((d) => (
                  <div key={d.id_insumo} className="grid grid-cols-12 gap-2 p-2.5 text-xs items-center">
                    <div className="col-span-5 font-medium text-foreground truncate">
                      {d.nombre_insumo}
                    </div>
                    <div className="col-span-2 text-center text-muted-foreground">
                      {d.cantidad} {d.unidad_medida}
                    </div>
                    <div className="col-span-2 text-right font-mono">
                      ${Number(d.valor_unitario).toLocaleString('es-CO')}
                    </div>
                    <div className="col-span-2 text-right font-semibold font-mono text-primary">
                      ${Number(d.subtotal).toLocaleString('es-CO')}
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveDetalle(d.id_insumo)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                        title="Eliminar insumo"
                      >
                        <Trash2 className="size-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                No hay insumos agregados en esta compra.
              </div>
            )}
            {errors.detalles && <p className="text-xs text-destructive">{errors.detalles}</p>}
          </div>

          {/* Campo Calculado: Valor Total */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-xs sm:text-sm font-semibold text-foreground">Valor Total de la Compra:</span>
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
      category="Compras"
      title={compra ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
      subtitle="Registra la adquisición de materias primas e insumos a proveedores"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      submitLabel={compra ? 'Guardar Cambios' : 'Guardar Compra'}
      isLoading={isLoading || subiendo}
      isDirty={detalles.length > 0 || archivoSoporte != null}
    />
  );
}
