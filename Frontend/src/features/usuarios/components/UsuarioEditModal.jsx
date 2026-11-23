import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Combobox } from '../../../shared/ui/Combobox';
import { getOpcionesComo, conValorActual } from '../../../shared/services/opciones';

export function UsuarioEditModal({ open, editData, setEditData, onClose, onSave, isSaving }) {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getOpcionesComo('roles', 'id_rol').then((data) => {
      if (Array.isArray(data)) setRoles(data);
    }).catch(() => {});
  }, []);


  if (!open || !editData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="form-modal-panel bg-card p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2>Editar Usuario</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Cerrar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-form-grid">
          <div>
            <label htmlFor="edit_usuario_nombre" className="block mb-2 text-sm font-medium">Nombre</label>
            <input
              id="edit_usuario_nombre"
              name="nombre"
              type="text"
              maxLength={100}
              value={editData.nombre}
              onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-input bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="edit_usuario_correo" className="block mb-2 text-sm font-medium">Email</label>
            <input
              id="edit_usuario_correo"
              name="correo"
              type="email"
              value={editData.correo}
              maxLength={100}
              onChange={(e) => setEditData({ ...editData, correo: e.target.value })}
              className="w-full px-4 py-2 border border-input bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="edit_usuario_id_rol" className="block mb-2 text-sm font-medium">Rol</label>
            <Combobox
              id="edit_usuario_id_rol"
              name="id_rol"
              value={editData.id_rol}
              onChange={(e) => setEditData({ ...editData, id_rol: Number(e.target.value) })}
              options={conValorActual(roles, 'id_rol', editData?.id_rol, editData?.rol_nombre).map((r) => ({
                value: r.id_rol,
                label: r.nombre,
              }))}
            />
          </div>
          <div className="modal-field-wide">
            <label htmlFor="edit_usuario_estado" className="block mb-2 text-sm font-medium">Estado</label>
            <Combobox
              id="edit_usuario_estado"
              name="estado"
              value={editData.estado}
              onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
              ]}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
