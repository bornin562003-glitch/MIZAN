import React, { useEffect, useState } from 'react';
import { useReducedMotion, useSpring } from 'motion/react';
import { useMizanStore } from '../../store/useMizanStore';
import { formatCurrency } from '../../utils/formatters';

interface AnimatedAmountProps {
  value: number;
  currency: string;
  compact?: boolean;
  className?: string;
}

export const AnimatedAmount: React.FC<AnimatedAmountProps> = ({
  value,
  currency,
  compact = false,
  className = '',
}) => {
  const discreetMode = useMizanStore((s) => s.discreetMode);
  const prefersReducedMotion = useReducedMotion();
  const spring = useSpring(value, { stiffness: 140, damping: 24, mass: 0.8 });
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (prefersReducedMotion || discreetMode) {
      setDisplayValue(value);
      return;
    }
    spring.set(value);
  }, [value, prefersReducedMotion, discreetMode, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return () => unsubscribe();
  }, [spring]);

  return (
    <span className={`font-mono-num tabular-nums ${className}`}>
      {formatCurrency(prefersReducedMotion ? value : displayValue, currency, compact, discreetMode)}
    </span>
  );
};
