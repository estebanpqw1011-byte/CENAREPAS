import { useState, useEffect, useMemo, useCallback } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { StepperModal } from '../../../shared/components/StepperModal';
import { PersonaFields } from '../../../shared/components/PersonaFields';
import { personaDe, validarPersona, personaPayload, personaCambio } from '../../../shared/utils/persona';

const PERSONA_NUEVA = { tipoPorDefecto: 'Jurídica' };

const etiqueta = 'block text-xs sm:text-sm font-semibold text-foreground mb-1.5';
const campo =
  'w-full h-10 pl-10 pr-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all read-only:opacity-80';

/** Título de cada grupo del formulario (y del detalle). */
function Grupo({ titulo }) {
  return (
    <h3 className="sm:col-span-2 pt-2 first:pt-0 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">
      {titulo}
    </h3>
  );
}

/**
 * Formulario único de proveedores. modo: 'crear' | 'editar' | 'ver' (por
 * defecto, 'editar' si llega un proveedor y 'crear' si no). Los campos van
 * agrupados en este orden: identificación → contacto → ubicación → estado.
 * En 'ver' es el detalle: todo de solo lectura y sin botón de guardar.
 */
export function ProveedorFormModal({ open, onClose, proveedor = null, onSave, isLoading = false, modo }) {
  const modoActual = modo || (proveedor ? 'editar' : 'crear');
  const soloLectura = modoActual === 'ver';
  // Proveedor nuevo: Jurídica con NIT, como la mayoría.
  const [persona, setPersona] = useState(() => personaDe(null, PERSONA_NUEVA));
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [estado, setEstado] = useState('Activo');

  useEffect(() => {
    if (!open) return;
    setPersona(personaDe(proveedor, PERSONA_NUEVA));
    setTelefono(proveedor?.telefono || '');
    setCorreo(proveedor?.correo || '');
    setDireccion(proveedor?.direccion || '');
    const inactivo = String(proveedor?.estado ?? '').toLowerCase() === 'inactivo';
    setEstado(inactivo ? 'Inactivo' : 'Activo');
  }, [proveedor, open]);

  const isDirty = useMemo(() => {
    if (!open || soloLectura) return false;
    return (
      personaCambio(persona, proveedor, PERSONA_NUEVA) ||
      telefono !== (proveedor?.telefono || '') ||
      correo !== (proveedor?.correo || '') ||
      direccion !== (proveedor?.direccion || '') ||
      (proveedor ? estado.toLowerCase() !== String(proveedor.estado || 'Activo').toLowerCase() : false)
    );
  }, [open, soloLectura, proveedor, persona, telefono, correo, direccion, estado]);

  const validar = useCallback(() => {
    const v = validarPersona(persona);
    if (v !== true) return v;
    if (correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      return 'El correo electrónico no tiene un formato válido.';
    }
    return true;
  }, [persona, correo]);

  const handleSubmit = useCallback(() => {
    if (validar() !== true) return;
    // `nombre` no se envía: el backend lo arma con nombres + apellidos o razón social.
    const { nombre: _nombre, ...proveedorSinNombre } = proveedor || {};
    const payload = {
      ...proveedorSinNombre,
      ...personaPayload(persona),
      nit: persona.documento.trim(),
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      direccion: direccion.trim() || null,
      estado,
    };
    if (onSave) onSave(payload);
    else onClose();
  }, [validar, proveedor, persona, telefono, correo, direccion, estado, onSave, onClose]);

  const steps = useMemo(() => [
    {
      id: 'datos-proveedor',
      title: 'Datos del proveedor',
      description: 'Identificación, contacto, ubicación y estado',
      validate: validar,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          <Grupo titulo="Identificación" />
          <PersonaFields persona={persona} onChange={setPersona} prefijo="proveedor" soloLectura={soloLectura} autoFocus />

          <Grupo titulo="Contacto" />
          <div className="sm:col-span-1">
            <label htmlFor="proveedor_telefono" className={etiqueta}>Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="proveedor_telefono"
                name="telefono"
                type="tel"
                maxLength={20}
                readOnly={soloLectura}
                placeholder={soloLectura ? 'Sin teléfono' : '+57 310 123 4567'}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={campo}
              />
            </div>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="proveedor_correo" className={etiqueta}>Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="proveedor_correo"
                name="correo"
                type="email"
                maxLength={150}
                readOnly={soloLectura}
                placeholder={soloLectura ? 'Sin correo' : 'ventas@proveedor.com'}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <Grupo titulo="Ubicación" />
          <div className="sm:col-span-2">
            <label htmlFor="proveedor_direccion" className={etiqueta}>Dirección de la sede o bodega</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="proveedor_direccion"
                name="direccion"
                type="text"
                maxLength={255}
                readOnly={soloLectura}
                placeholder={soloLectura ? 'Sin dirección' : 'Ej. Carrera 5 # 18-40, Zona Industrial'}
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <Grupo titulo="Estado" />
          <div className="sm:col-span-1">
            <label htmlFor="proveedor_estado" className={etiqueta}>
              Estado <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <Combobox
              id="proveedor_estado"
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
          {soloLectura && proveedor?.fecha_creacion && (
            <div className="sm:col-span-1">
              <span className={etiqueta}>Fecha de creación</span>
              <p className="h-10 flex items-center text-sm text-foreground">{proveedor.fecha_creacion}</p>
            </div>
          )}
        </div>
      ),
    },
  ], [persona, telefono, correo, direccion, estado, soloLectura, proveedor, validar]);

  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="COMPRAS"
      title={{ crear: 'Nuevo Proveedor', editar: 'Editar Proveedor', ver: 'Detalle del Proveedor' }[modoActual]}
      subtitle="Información de identificación, contacto y ubicación del proveedor"
      steps={steps}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel={modoActual === 'editar' ? 'Guardar Cambios' : 'Crear Proveedor'}
      mode={soloLectura ? 'view' : modoActual === 'editar' ? 'edit' : 'create'}
      isDirty={isDirty}
    />
  );
}

export default ProveedorFormModal;
