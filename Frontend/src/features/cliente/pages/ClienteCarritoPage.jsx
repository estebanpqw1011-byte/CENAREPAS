import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Construction } from 'lucide-react';

export default function ClienteCarritoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D] text-[10.5px] font-bold mb-2">
            <Construction className="size-3" />
            <span>EN CONSTRUCCIÓN · PARTE 2</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Mi Carrito de Compras
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Revisa tus productos seleccionados y cantidades antes del checkout.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl border border-dashed border-[#E8B23D]/50 bg-card text-center py-16 shadow-xs">
        <div className="p-4 rounded-2xl bg-[#E8B23D]/10 text-[#8A5A14] dark:text-[#E8B23D] w-fit mx-auto mb-4">
          <ShoppingCart className="size-8" />
        </div>
        <h3 className="text-base font-bold text-foreground">Módulo en Construcción</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
          Esta vista se implementará en la <strong>Parte 2</strong> con el desglose de productos agregados, ajuste de cantidades, cálculo de totales y paso directo al checkout.
        </p>
        <NavLink to="/cliente" className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-colors">
          <ArrowLeft className="size-3.5" /> Volver al Inicio
        </NavLink>
      </div>
    </div>
  );
}
