import { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, Trash2, Image as ImageIcon, DollarSign, Box } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { subirArchivo, validarArchivo, FORMATOS_ARCHIVO } from '../../../shared/services/uploadService';
import { getImageUrl } from '../../../shared/services/api';
import { StepperModal } from '../../../shared/components/StepperModal';
import { getOpcionesComo, conValorActual } from '../../../shared/services/opciones';

export function ProductoFormModal({ open, onClose, producto = null, onSave, isLoading = false }) {
  const [nombre, setNombre] = useState('');
  const [idCategoria, setIdCategoria] = useState('1');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stockActual, setStockActual] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idFicha, setIdFicha] = useState('');
  const [idProveedor, setIdProveedor] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorImagen, setErrorImagen] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [estado, setEstado] = useState('Activo');
  const [currentStep, setCurrentStep] = useState(0);

  const [categorias, setCategorias] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    getOpcionesComo('categorias', 'id_categoria')
      .then((data) => {
        if (Array.isArray(data)) setCategorias(data);
      })
      .catch(() => {});
    getOpcionesComo('fichas-tecnicas', 'id_ficha')
      .then((data) => {
        if (Array.isArray(data)) setFichas(data);
      })
      .catch(() => {});
    getOpcionesComo('proveedores', 'id_proveedor')
      .then((data) => {
        if (Array.isArray(data)) setProveedores(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setSelectedFile(null);
      setPreviewUrl('');
      setIsUploading(false);
      setErrorImagen('');

      if (producto) {
        setNombre(producto.nombre || '');
        setIdCategoria(
          producto.id_categoria
            ? String(producto.id_categoria)
            : categorias[0]?.id_categoria
            ? String(categorias[0].id_categoria)
            : '1'
        );
        setPrecioVenta(producto.precio_venta != null ? String(producto.precio_venta) : '');
        setStockActual(producto.stock_actual != null ? String(producto.stock_actual) : '0');
        setDescripcion(producto.descripcion || '');
        setIdFicha(producto.id_ficha ? String(producto.id_ficha) : '');
        setIdProveedor(producto.id_proveedor ? String(producto.id_proveedor) : '');
        setImagenUrl(producto.imagen_url || '');
        setUrlInput('');
        setStockMinimo(producto.stock_minimo != null ? String(producto.stock_minimo) : '0');
        setFechaVencimiento(producto.fecha_vencimiento || '');
        setEstado(producto.estado || 'Activo');
      } else {
        setNombre('');
        setIdCategoria(categorias[0]?.id_categoria ? String(categorias[0].id_categoria) : '1');
        setPrecioVenta('');
        setStockActual('0');
        setDescripcion('');
        setIdFicha('');
        setIdProveedor('');
        setImagenUrl('');
        setUrlInput('');
        setStockMinimo('0');
        setFechaVencimiento('');
        setEstado('Activo');
      }
    } else {
      setCurrentStep(0);
    }
  }, [producto, open, categorias]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const error = validarArchivo(file, 'producto');
    if (error) {
      setErrorImagen(error);
      return;
    }
    setErrorImagen('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const quitarImagenSeleccionada = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImagenUrl('');
    setSelectedFile(null);
    setPreviewUrl('');
    setUrlInput('');
    setErrorImagen('');
  };

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!producto) {
      return nombre.trim() !== '' || precioVenta !== '' || selectedFile != null || imagenUrl !== '';
    }
    return (
      nombre !== (producto.nombre || '') ||
      idCategoria !== String(producto.id_categoria || '1') ||
      precioVenta !== String(producto.precio_venta ?? '') ||
      stockActual !== String(producto.stock_actual ?? '0') ||
      selectedFile != null ||
      imagenUrl !== (producto.imagen_url || '')
    );
  }, [open, producto, nombre, idCategoria, precioVenta, stockActual, selectedFile, imagenUrl]);

  const validateStep1 = useCallback(() => {
    if (!nombre.trim()) {
      return 'El nombre del producto es obligatorio.';
    }
    if (nombre.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres.';
    }
    if (!precioVenta || isNaN(Number(precioVenta)) || Number(precioVenta) <= 0) {
      return 'El precio de venta debe ser un número mayor a 0.';
    }
    // El stock mínimo está en el paso 1: se valida aquí.
    if (stockMinimo !== '' && (isNaN(Number(stockMinimo)) || Number(stockMinimo) < 0)) {
      return 'El stock mínimo debe ser un número válido.';
    }
    return true;
  }, [nombre, precioVenta, stockMinimo]);

  const validateStep2 = useCallback(() => {
    if (stockActual !== '' && (isNaN(Number(stockActual)) || Number(stockActual) < 0)) {
      return 'El stock inicial debe ser un número válido.';
    }
    return true;
  }, [stockActual]);

  const handleSubmit = useCallback(async () => {
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

    // Imagen: archivo nuevo (se sube a Cloudinary o al disco del servidor),
    // URL externa, la que ya tenía o ninguna (quitar_imagen borra la anterior).
    // imagen_public_id va siempre: así no se cuela el del producto (...producto).
    const imagen = { imagen_url: (imagenUrl || urlInput).trim() || null, imagen_public_id: null };
    if (selectedFile) {
      try {
        setIsUploading(true);
        const subido = await subirArchivo(selectedFile, 'producto');
        imagen.imagen_url = subido.url;
        imagen.imagen_public_id = subido.public_id;
      } catch (uploadErr) {
        setErrorImagen(`No se pudo subir la imagen: ${uploadErr.message || 'error desconocido'}`);
        setCurrentStep(1);
        return;
      } finally {
        setIsUploading(false);
      }
    } else if (producto?.imagen_url && !imagen.imagen_url) {
      imagen.quitar_imagen = true;
    }

    const payload = producto
      ? {
          ...producto,
          nombre: nombre.trim(),
          id_categoria: Number(idCategoria) || 1,
          precio_venta: Number(precioVenta) || 0,
          stock_actual: Number(stockActual) || 0,
          descripcion: descripcion.trim() || null,
          id_ficha: idFicha ? Number(idFicha) : null,
          id_proveedor: idProveedor ? Number(idProveedor) : null,
          ...imagen,
          stock_minimo: Number(stockMinimo) || 0,
          fecha_vencimiento: fechaVencimiento || null,
          estado,
        }
      : {
          nombre: nombre.trim(),
          id_categoria: Number(idCategoria) || 1,
          precio_venta: Number(precioVenta) || 0,
          stock_actual: Number(stockActual) || 0,
          descripcion: descripcion.trim() || null,
          id_ficha: idFicha ? Number(idFicha) : null,
          id_proveedor: idProveedor ? Number(idProveedor) : null,
          ...imagen,
          stock_minimo: Number(stockMinimo) || 0,
          fecha_vencimiento: fechaVencimiento || null,
          estado: estado || 'Activo',
        };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep1, validateStep2, producto, nombre, idCategoria, precioVenta, stockActual, descripcion, idFicha, idProveedor, imagenUrl, urlInput, selectedFile, stockMinimo, fechaVencimiento, estado, onSave, onClose]);

  const steps = useMemo(() => [
    {
      id: 'info-comercial',
      title: 'Datos comerciales',
      description: 'Nombre, categoría, descripción, precio de venta y stock mínimo',
      validate: validateStep1,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <label htmlFor="producto_nombre" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Nombre del producto <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <Box className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="producto_nombre"
                name="nombre"
                type="text"
                maxLength={100}
                autoFocus
                placeholder="Ej. Arepa de Queso x5 unidades"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="sm:col-span-2">
            <label htmlFor="producto_id_categoria" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Categoría <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="producto_id_categoria"
              name="id_categoria"
              value={idCategoria}
              onChange={(e) => setIdCategoria(e.target.value)}
              options={conValorActual(categorias, 'id_categoria', producto?.id_categoria, producto?.categoria_nombre).map((cat) => ({
                value: String(cat.id_categoria),
                label: cat.nombre,
              }))}
            />
          </div>

          {/* Descripción */}
          <div className="sm:col-span-2">
            <label htmlFor="producto_descripcion" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Descripción comercial <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
            </label>
            <textarea
              id="producto_descripcion"
              name="descripcion"
              rows={2}
              maxLength={255}
              placeholder="Detalla ingredientes, presentación o recomendaciones..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full p-3 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none min-h-[65px]"
            />
          </div>

          {/* Precio de Venta */}
          <div className="sm:col-span-1">
            <label htmlFor="producto_precio_venta" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Precio de venta ($) <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="producto_precio_venta"
                name="precio_venta"
                type="number"
                step="50"
                min="0"
                placeholder="Ej. 8500"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
              />
            </div>
          </div>

          {/* Stock Mínimo */}
          <div className="sm:col-span-1">
            <label htmlFor="producto_stock_minimo" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Stock mínimo (Alerta)
            </label>
            <input
              id="producto_stock_minimo"
              name="stock_minimo"
              type="number"
              min="0"
              placeholder="Ej. 20"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className="w-full h-10 px-3.5 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
            />
          </div>

        </div>
      ),
    },
    {
      id: 'ficha-imagen',
      title: 'Ficha e imagen',
      description: 'Ficha técnica, proveedor, fotografía y estado',
      validate: validateStep2,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Ficha Técnica */}
          <div className="sm:col-span-1">
            <label htmlFor="producto_id_ficha" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Ficha Técnica (Receta)
            </label>
            <Combobox
              id="producto_id_ficha"
              name="id_ficha"
              value={idFicha}
              placeholder="Sin receta vinculada"
              onChange={(e) => setIdFicha(e.target.value)}
              options={[
                { value: '', label: 'Sin receta vinculada' },
                ...conValorActual(fichas, 'id_ficha', producto?.id_ficha, producto?.ficha_nombre).map((f) => ({
                  value: String(f.id_ficha),
                  label: f.nombre,
                })),
              ]}
            />
          </div>

          {/* Proveedor */}
          <div className="sm:col-span-1">
            <label htmlFor="producto_id_proveedor" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Proveedor principal (Opcional)
            </label>
            <Combobox
              id="producto_id_proveedor"
              name="id_proveedor"
              value={idProveedor}
              placeholder="Sin proveedor asignado"
              onChange={(e) => setIdProveedor(e.target.value)}
              options={[
                { value: '', label: 'Sin proveedor asignado' },
                ...conValorActual(proveedores, 'id_proveedor', producto?.id_proveedor, producto?.proveedor_nombre).map((p) => ({
                  value: String(p.id_proveedor),
                  label: p.nombre,
                })),
              ]}
            />
          </div>

          {/* Fotografía del Producto */}
          <div className="sm:col-span-2 p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <span>Fotografía comercial</span>
              </span>
              {(previewUrl || imagenUrl) && (
                <button
                  type="button"
                  onClick={quitarImagenSeleccionada}
                  className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Trash2 className="size-3.5" />
                  Eliminar
                </button>
              )}
            </div>

            {previewUrl || imagenUrl ? (
              <div className="relative w-full h-36 rounded-xl border border-border bg-card overflow-hidden group shadow-2xs flex items-center justify-center">
                <img
                  src={previewUrl || getImageUrl(imagenUrl)}
                  alt="Vista previa del producto"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="producto_imagen_archivo"
                  className="flex flex-col items-center justify-center gap-1.5 w-full h-28 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-colors cursor-pointer text-center px-3"
                >
                  <Upload className="size-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Subir imagen desde el equipo</span>
                  <span className="text-xs text-muted-foreground">{FORMATOS_ARCHIVO.producto.texto} · máximo 5 MB</span>
                  <input
                    id="producto_imagen_archivo"
                    name="imagen_archivo"
                    type="file"
                    accept={FORMATOS_ARCHIVO.producto.accept}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs text-muted-foreground text-center">o pega la dirección de una imagen</p>
                <div className="flex gap-2">
                  <input
                    id="producto_imagen_url_input"
                    name="imagen_url_input"
                    type="url"
                    maxLength={255}
                    placeholder="https://ejemplo.com/arepas-foto.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 h-10 px-3.5 border border-border bg-input-background rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (urlInput.trim()) {
                        setImagenUrl(urlInput.trim());
                        setSelectedFile(null);
                        setPreviewUrl('');
                      }
                    }}
                    className="px-4 h-10 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cargar URL
                  </button>
                </div>
              </div>
            )}
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                {selectedFile.name} · se sube al guardar el producto
              </p>
            )}
            {errorImagen && (
              <p role="alert" className="text-xs font-semibold text-destructive">{errorImagen}</p>
            )}
          </div>

          {/* Estado */}
          <div className="sm:col-span-1">
            <label htmlFor="producto_estado" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Estado <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="producto_estado"
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
            <Box className="size-4 text-[#5A7A3A] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Catálogo y mostrador</span>
              Este producto terminado se habilitará de inmediato para registrar pedidos de clientes y facturar en el punto de venta.
            </div>
          </div>
        </div>
      ),
    },
  ], [nombre, idCategoria, categorias, precioVenta, estado, descripcion, stockActual, stockMinimo, fechaVencimiento, idFicha, fichas, idProveedor, proveedores, previewUrl, imagenUrl, urlInput, selectedFile, errorImagen, validateStep1, validateStep2]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="PRODUCTOS"
      title={producto ? 'Editar Producto' : 'Nuevo Producto'}
      subtitle="Catálogo de productos terminados para comercialización y despacho"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onSubmit={handleSubmit}
      isLoading={isLoading || isUploading}
      submitLabel={producto ? 'Guardar Cambios' : 'Crear Producto'}
      isDirty={isDirty}
    />
  );
}

export default ProductoFormModal;
