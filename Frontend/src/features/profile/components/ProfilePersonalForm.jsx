import { User, Mail, Phone, Building, Calendar, Clock, Edit, Camera, Save, X } from 'lucide-react';
import { usePermissions } from '../../../shared/contexts/PermissionContext';

export function ProfilePersonalForm({
  profileData,
  setProfileData,
  isEditing,
  setIsEditing,
  handleSaveProfile,
}) {
  const { roleId, roleName, currentUserMeta } = usePermissions();
  const initials = profileData.iniciales || currentUserMeta?.iniciales || 'US';
  const roleBadgeStyle =
    roleId === 2
      ? 'bg-[#5A7A3A]/15 text-[#5A7A3A] dark:text-[#AEC094]'
      : roleId === 3
      ? 'bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D]'
      : 'bg-primary/10 text-primary';

  const avatarBg =
    roleId === 2
      ? 'bg-[#5A7A3A] text-white'
      : roleId === 3
      ? 'bg-[#E8B23D] text-slate-900'
      : 'bg-primary text-primary-foreground';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      <div className="lg:col-span-1 flex flex-col">
        <div className="bg-card p-6 rounded-lg border border-border text-center flex flex-col justify-between h-full w-full">
          <div className="relative inline-block mb-4">
            <div className={`w-28 h-28 ${avatarBg} rounded-full flex items-center justify-center font-bold text-3xl mx-auto shadow-md`}>
              <span>{initials}</span>
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 shadow-sm cursor-pointer">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <h3 className="font-semibold text-lg">{profileData.nombre}</h3>
          <div className="mt-1 mb-4 flex items-center justify-center">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${roleBadgeStyle}`}>
              {profileData.cargo || roleName}
            </span>
          </div>
          <div className="flex gap-2 mt-auto">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                <Edit className="w-4 h-4 inline mr-2" />
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Guardar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col">
        <div className="bg-card p-6 rounded-lg border border-border flex flex-col h-full w-full">
          <h3 className="mb-6 font-semibold text-lg">Información Personal</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm">Nombre Completo</label>
                <div className="flex items-center gap-2 px-4 py-2 border border-input bg-input-background rounded-lg">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.nombre}
                      onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  ) : (
                    <span>{profileData.nombre}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm">Correo Electrónico</label>
                <div className="flex items-center gap-2 px-4 py-2 border border-input bg-input-background rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  ) : (
                    <span>{profileData.email}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm">Teléfono</label>
                <div className="flex items-center gap-2 px-4 py-2 border border-input bg-input-background rounded-lg">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.telefono}
                      onChange={(e) => setProfileData({ ...profileData, telefono: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  ) : (
                    <span>{profileData.telefono}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm">Cargo</label>
                <div className="flex items-center gap-2 px-4 py-2 border border-input bg-input-background rounded-lg">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.cargo}
                      onChange={(e) => setProfileData({ ...profileData, cargo: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  ) : (
                    <span>{profileData.cargo}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="mb-4 font-semibold">Información de Cuenta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 px-4 py-2 border border-input bg-muted rounded-lg">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Creación</p>
                    <p className="text-sm">{profileData.fechaCreacion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border border-input bg-muted rounded-lg">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Último Acceso</p>
                    <p className="text-sm">{profileData.ultimoAcceso}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
