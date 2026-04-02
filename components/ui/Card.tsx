'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className, hover = false, style, onClick }: CardProps) {
  const [hovered, setHovered] = React.useState(false);

  const isActive = hover && hovered;

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg2)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r-lg)',
    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow)',
    transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
    transition: `box-shadow var(--transition), transform var(--transition)`,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  return (
    <div
      className={className}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={hover ? () => setHovered(true) : undefined}
      onMouseLeave={hover ? () => setHovered(false) : undefined}
    >
      {children}
    </div>
  );
}
