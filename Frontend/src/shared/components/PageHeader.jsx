import { Plus, FileDown, FileSpreadsheet } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = 'Nuevo',
  addDisabled = false,
  onExportPdf,
  onExportExcel,
  extraActions,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-xl hover:bg-muted text-xs sm:text-sm font-semibold text-foreground transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Exportar listado a documento PDF"
          >
            <FileDown className="size-4 text-primary" />
            <span>Exportar PDF</span>
          </button>
        )}
        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-xl hover:bg-muted text-xs sm:text-sm font-semibold text-foreground transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Exportar listado a hoja de cálculo Excel"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        )}
        {extraActions}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            disabled={addDisabled}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Plus className="size-4" />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
