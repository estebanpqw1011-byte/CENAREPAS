// components/Nosotros.jsx
import { Section } from './Section';
import { Factory, Award, Truck } from 'lucide-react';

export const Nosotros = () => (
  <Section id="nosotros">
    <h2 style={{
      textAlign: 'center',
      fontSize: 32,
      fontWeight: 700,
      color: '#1A5CDB',
      marginBottom: 48,
      letterSpacing: '0.04em',
      fontFamily: "'Playfair Display', serif"
    }}>
      ¿QUIÉNES SOMOS?
    </h2>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: 60,
      alignItems: 'start'
    }}>
      <p style={{
        fontSize: 15,
        lineHeight: 1.8,
        color: '#374151'
      }}>
        Somos una fábrica dedicada a la producción de arepas de alta calidad.
        Trabajamos con ingredientes frescos y procesos tradicionales para garantizar
        el mejor sabor en cada arepa que llega a tu mesa. Nuestro compromiso es llevar
        a tu hogar un producto artesanal, nutritivo y delicioso, elaborado con el
        cariño de siempre.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16
      }}>
        {[
          { Icon: Factory, title: 'Producción', sub: 'diaria', color: '#C1502D', bg: 'rgba(193,80,45,0.1)' },
          { Icon: Award, title: 'Calidad', sub: 'garantizada', color: '#E8B23D', bg: 'rgba(232,178,61,0.15)' },
          { Icon: Truck, title: 'Entrega', sub: 'rápida', color: '#5A7A3A', bg: 'rgba(90,122,58,0.12)' },
        ].map((c, i) => {
          const IconComponent = c.Icon;
          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '20px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              textAlign: 'center',
              background: '#FFFFFF',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: c.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IconComponent style={{ width: 24, height: 24, color: c.color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>{c.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{c.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </Section>
);