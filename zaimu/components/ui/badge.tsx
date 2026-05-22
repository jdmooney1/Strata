import React from 'react';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'navy';

const variantMap: Record<BadgeVariant, string> = {
  green: 'badge-green',
  amber: 'badge-amber',
  red:   'badge-red',
  blue:  'badge-blue',
  gray:  'badge-gray',
  navy:  'badge-navy',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={`badge ${variantMap[variant]}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  );
}
