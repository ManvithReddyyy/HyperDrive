import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  direction?: 'top' | 'bottom';
  animateBy?: 'words' | 'letters';
}

export function BlurText({
  text,
  className = '',
  delay = 200,
  direction = 'bottom',
  animateBy = 'words'
}: BlurTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px 0px' });

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const item: Variants = {
    hidden: {
      filter: 'blur(10px)',
      opacity: 0,
      y: direction === 'bottom' ? 50 : -50,
    },
    visible: {
      filter: ['blur(10px)', 'blur(5px)', 'blur(0px)'],
      opacity: [0, 0.5, 1],
      y: direction === 'bottom' ? [50, -5, 0] : [-50, 5, 0],
      transition: {
        duration: 0.35 * 3, // 3 keyframe steps
        times: [0, 0.5, 1],
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={container}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={`flex flex-wrap ${className}`}
    >
      {elements.map((element, index) => (
        <motion.span
          key={index}
          variants={item}
          className="inline-block whitespace-pre"
        >
          {element}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.div>
  );
}
