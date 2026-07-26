"use client";

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Reinitialize particles when resizing
      if (particlesRef.current.length === 0) {
        initParticles();
      }
    };

    // Particle colors - green and yellow
    const particleColors = [
      'rgba(2, 116, 111, 0.8)',    // teal/green
      'rgba(253, 211, 87, 0.9)',   // yellow
      'rgba(2, 116, 111, 0.7)',    // teal/green (lighter)
      'rgba(253, 211, 87, 0.8)',   // yellow (lighter)
    ];

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: Math.random() * 2.5 + 1,
          color: particleColors[Math.floor(Math.random() * particleColors.length)],
        });
      }
      particlesRef.current = particles;
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      // Create ripple on mouse move
      if (Math.random() > 0.7) {
        ripplesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          radius: 0,
          maxRadius: 120 + Math.random() * 80,
          alpha: 0.6,
        });
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      // Create subtle gradient background - mostly white/gray
      const time = Date.now() * 0.0003;
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3 + Math.sin(time) * 0.1, '#f8f8f8');
      gradient.addColorStop(0.7 + Math.cos(time * 0.7) * 0.1, '#f4f1f2');
      gradient.addColorStop(1, '#fafafa');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Move particle
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Mouse interaction - particles move away from mouse
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 180) {
          const force = (180 - distance) / 180;
          particle.vx -= (dx / distance) * force * 1.2;
          particle.vy -= (dy / distance) * force * 1.2;
        }

        // Damping - less damping for faster movement
        particle.vx *= 0.985;
        particle.vy *= 0.985;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles - gray lines
        for (let j = index + 1; j < particlesRef.current.length; j++) {
          const other = particlesRef.current[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 140) {
            const opacity = 0.25 * (1 - distance / 140);
            ctx.strokeStyle = `rgba(180, 180, 180, ${opacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      });

      // Update and draw ripples - faster expansion
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        ripple.radius += 8;
        ripple.alpha -= 0.025;

        if (ripple.alpha > 0 && ripple.radius < ripple.maxRadius) {
          // Draw outer ripple in green
          ctx.strokeStyle = `rgba(2, 116, 111, ${ripple.alpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Draw inner ripple in yellow
          ctx.strokeStyle = `rgba(253, 211, 87, ${ripple.alpha * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();

          return true;
        }
        return false;
      });

      // Add subtle floating ambient lights - faster movement
      const ambientTime = Date.now() * 0.001;
      for (let i = 0; i < 3; i++) {
        const x = canvas.width * (0.2 + i * 0.3) + Math.sin(ambientTime + i * 2) * 150;
        const y = canvas.height * (0.3 + Math.sin(ambientTime * 0.7 + i * 1.5) * 0.3);

        const ambientGradient = ctx.createRadialGradient(x, y, 0, x, y, 250);
        const useYellow = i % 2 === 0;
        if (useYellow) {
          ambientGradient.addColorStop(0, 'rgba(253, 211, 87, 0.04)');
          ambientGradient.addColorStop(1, 'rgba(253, 211, 87, 0)');
        } else {
          ambientGradient.addColorStop(0, 'rgba(2, 116, 111, 0.05)');
          ambientGradient.addColorStop(1, 'rgba(2, 116, 111, 0)');
        }

        ctx.fillStyle = ambientGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{
        pointerEvents: 'auto',
        width: '100%',
        height: '100%'
      }}
    />
  );
}
