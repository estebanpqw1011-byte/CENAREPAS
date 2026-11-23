import { motion } from 'framer-motion';

export function MetricCard({ title, value, icon: Icon, variant = 'primary', index = 0 }) {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
  };

  const iconStyle = variantStyles[variant] || variantStyles.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: (index || 0) * 0.08, ease: 'easeOut' }}
      className="bg-card p-4 rounded-xl border border-border flex items-center gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default h-full w-full min-h-[76px]"
    >
      {Icon && (
        <div className={`size-11 min-w-11 min-h-11 rounded-lg ${iconStyle} shrink-0 transition-transform duration-200 flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <p className="text-xs sm:text-sm text-muted-foreground truncate leading-tight">{title}</p>
        <h3 className="text-lg sm:text-xl font-bold text-foreground truncate mt-0.5 leading-tight">{value}</h3>
      </div>
    </motion.div>
  );
}

export default MetricCard;

