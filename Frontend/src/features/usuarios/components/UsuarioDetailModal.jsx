import { X, Mail, Shield, Calendar, Hash, UserCheck, UserX, IdCard } from 'lucide-react';
import { NOMBRES_DOCUMENTO } from '../../../shared/config/negocio';

export default function UsuarioDetailModal({ isOpen, onClose, usuario, roleNames = {} }) {
  if (!isOpen || !usuario) return null;

  const isActive = String(usuario.estado || '').toLowerCase() === 'activo';
  const roleName = roleNames[usuario.id_rol] || usuario.id_rol || 'Sin rol asignado';

  // Obtener inicial(es) del nombre del usuario
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground p-6 rounded-xl max-w-md w-full border border-border shadow-2xl space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Detalle del Usuario</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Información del perfil y credenciales de acceso
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Hero Section (Avatar de solo lectura con inicial) */}
        <div className="flex flex-col items-center text-center space-y-3 py-2">
          <div className="w-20 h-20 bg-primary/10 text-primary border-2 border-primary/20 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner select-none">
            {getInitials(usuario.nombre)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{usuario.nombre}</h3>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {usuario.correo}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Hash className="w-3.5 h-3.5" />
              ID de Usuario
            </span>
            <span className="font-mono font-semibold text-xs text-foreground">
              #{usuario.id_usuario}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <IdCard className="w-3.5 h-3.5" />
              Documento
            </span>
            <span className="text-xs font-medium text-foreground text-right">
              {usuario.documento
                ? `${NOMBRES_DOCUMENTO[usuario.tipo_documento] || usuario.tipo_documento} ${usuario.documento}`
                : 'Sin registrar'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Rol Asignado
            </span>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
              {roleName}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              Fecha de Creación
            </span>
            <span className="text-xs font-medium text-foreground">
              {formatDate(usuario.fecha_creacion)}
            </span>
          </div>

          {/* Estado (siempre de último) */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              {isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
              Estado
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {isActive ? (
                <>
                  <UserCheck className="w-3 h-3" />
                  Activo
                </>
              ) : (
                <>
                  <UserX className="w-3 h-3" />
                  Inactivo
                </>
              )}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm font-medium transition-opacity shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
