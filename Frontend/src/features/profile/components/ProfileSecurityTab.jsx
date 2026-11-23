import { Lock, Monitor, LogOut } from 'lucide-react';

export function ProfileSecurityTab({
  passwordData,
  setPasswordData,
  handleChangePassword,
  sessions = [],
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      <div className="bg-card p-6 rounded-lg border border-border flex flex-col justify-between h-full w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Cambiar Contraseña</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">Contraseña Actual</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-input bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">Nueva Contraseña</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-input bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">Confirmar Contraseña</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-input bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 font-medium mt-auto"
          >
            Actualizar Contraseña
          </button>
        </form>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border flex flex-col justify-between h-full w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Monitor className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Sesiones Activas</h3>
            <p className="text-sm text-muted-foreground">Dispositivos con acceso a tu cuenta</p>
          </div>
        </div>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {session.dispositivo}
                    {session.actual && <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">Actual</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{session.ubicacion} • {session.fecha}</p>
                </div>
              </div>
              {!session.actual && (
                <button className="p-2 hover:bg-muted rounded-lg text-red-600">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="w-full mt-4 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">
          Cerrar Todas las Sesiones
        </button>
      </div>
    </div>
  );
}
