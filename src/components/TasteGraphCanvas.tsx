import React, { useRef, useEffect } from 'react';

export const TasteGraphCanvas = ({ items, categoryCounts }: { items: any[], categoryCounts: Record<string, number> }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const mouseRef = useRef<{x: number, y: number, isHovering: boolean, hoveredItem: any, hoveredCatId: string | null}>({ x: -1000, y: -1000, isHovering: false, hoveredItem: null, hoveredCatId: null });
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;
        
        // Define Categories
        const categories = Object.keys(categoryCounts);
        const catNodes = categories.map((cat, i) => {
             const angle = (i / categories.length) * Math.PI * 2;
             const targetRadius = width > 600 ? Math.min(width, height) * 0.35 : Math.min(width, height) * 0.3;
             return {
                 id: cat,
                 label: cat === 'watch' ? 'Movies/TV' : cat,
                 baseX: width/2 + Math.cos(angle) * targetRadius,
                 baseY: height/2 + Math.sin(angle) * targetRadius,
                 x: width/2,
                 y: height/2,
                 color: `hsl(${(i * 360) / categories.length}, 70%, 50%)`,
                 radius: 20 + Math.min((categoryCounts[cat] || 0) * 2, 30)
             };
        });

        // Define Item Particles
        const particles = (items || []).filter(i => !!i.category).slice(0, 150).map(item => {
             let c = (item.category || 'other').toLowerCase();
             if (c === 'game' || c.includes('sports')) c = 'games';
             if (c.includes('tv') || c.includes('movie') || c === 'watch') c = 'watch';
             if (c === 'book') c = 'books';
             
             const parentCat = catNodes.find(n => n.id === c) || catNodes[0];
             
             return {
                 id: item.id,
                 title: item.title,
                 catId: c,
                 x: width/2 + (Math.random() - 0.5) * 200,
                 y: height/2 + (Math.random() - 0.5) * 200,
                 vx: (Math.random() - 0.5) * 4,
                 vy: (Math.random() - 0.5) * 4,
                 baseAngle: Math.random() * Math.PI * 2,
                 orbitRadius: 30 + Math.random() * 80,
                 orbitSpeed: 0.002 + Math.random() * 0.005 * (Math.random() > 0.5 ? 1 : -1),
                 color: parentCat ? parentCat.color : '#888',
                 radius: item.reaction === 'love' ? 4 : (item.rating > 7 ? 3 : 1.5),
                 history: [] as {x: number, y: number}[],
                 item: item
             };
        });

        // Mouse Handlers
        const handleMouseMove = (e: MouseEvent) => {
             const rect = canvas.getBoundingClientRect();
             mouseRef.current.x = e.clientX - rect.left;
             mouseRef.current.y = e.clientY - rect.top;
             mouseRef.current.isHovering = true;
        };
        const handleMouseLeave = () => {
             mouseRef.current.isHovering = false;
             mouseRef.current.x = -1000;
             mouseRef.current.y = -1000;
             mouseRef.current.hoveredItem = null;
             mouseRef.current.hoveredCatId = null;
        };
        const handleClick = () => {
             if (mouseRef.current.hoveredItem) {
                 window.dispatchEvent(new CustomEvent('open-item', { detail: mouseRef.current.hoveredItem }));
             } else if (mouseRef.current.hoveredCatId) {
                 window.dispatchEvent(new CustomEvent('set-taste-category', { detail: mouseRef.current.hoveredCatId }));
             }
        };
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('click', handleClick);

        const render = () => {
             // Add motion blur effect
             ctx.globalCompositeOperation = 'destination-out';
             ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
             ctx.fillRect(0, 0, width, height);
             ctx.globalCompositeOperation = 'source-over';

             const centerX = width / 2;
             const centerY = height / 2;
             const mx = mouseRef.current.x;
             const my = mouseRef.current.y;

             // Gently move categories to their base positions
             catNodes.forEach(cat => {
                 cat.x += (cat.baseX - cat.x) * 0.05;
                 cat.y += (cat.baseY - cat.y) * 0.05;
                 
                 // Mouse repel
                 if (mouseRef.current.isHovering) {
                     const dx = cat.x - mx;
                     const dy = cat.y - my;
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     if (dist < 150) {
                         cat.x += (dx / dist) * 4;
                         cat.y += (dy / dist) * 4;
                     }
                 }
             });

             // Draw subtle connections between particles
             ctx.globalCompositeOperation = 'source-over';
             particles.forEach((p, i) => {
                for(let j=i+1; j<particles.length; j++) {
                    const p2 = particles[j];
                    if (p.catId === p2.catId) {
                        const dx = p.x - p2.x;
                        const dy = p.y - p2.y;
                        const dist = dx*dx + dy*dy;
                        if (dist < 4000) {
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.strokeStyle = p.color;
                            ctx.globalAlpha = 0.1 * (1 - dist/4000);
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    }
                }
             });

             // Update and draw particles
             let hoveredParticle = null;
             particles.forEach(p => {
                 const parentCat = catNodes.find(n => n.id === p.catId);
                 if (parentCat) {
                     p.baseAngle += p.orbitSpeed;
                     const targetX = parentCat.x + Math.cos(p.baseAngle) * p.orbitRadius;
                     const targetY = parentCat.y + Math.sin(p.baseAngle) * p.orbitRadius;
                     
                     p.vx += (targetX - p.x) * 0.02;
                     p.vy += (targetY - p.y) * 0.02;
                     p.vx *= 0.92; // friction
                     p.vy *= 0.92;
                     
                     p.x += p.vx;
                     p.y += p.vy;

                     // Mouse repel with swirl
                     if (mouseRef.current.isHovering) {
                         const dx = p.x - mx;
                         const dy = p.y - my;
                         const dist = Math.sqrt(dx*dx + dy*dy);
                         if (dist < 120) {
                             const force = (120 - dist) / 120;
                             p.vx += (dx * 0.05 - dy * 0.1) * force;
                             p.vy += (dy * 0.05 + dx * 0.1) * force;
                         }
                         if (dist < 30) hoveredParticle = p;
                     }

                     // Trail memory
                     p.history.push({x: p.x, y: p.y});
                     if (p.history.length > 8) p.history.shift();

                     // Draw glowing trail
                     if (p.history.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(p.history[0].x, p.history[0].y);
                        for(let k=1; k<p.history.length; k++) {
                           ctx.lineTo(p.history[k].x, p.history[k].y);
                        }
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = 0.4;
                        ctx.lineWidth = p.radius * 0.8;
                        ctx.lineCap = 'round';
                        ctx.stroke();
                     }

                     // Draw glowing core
                     ctx.beginPath();
                     ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                     ctx.fillStyle = p.color;
                     ctx.shadowColor = p.color;
                     ctx.shadowBlur = p.radius * 3;
                     ctx.globalAlpha = 0.9;
                     ctx.fill();
                     ctx.shadowBlur = 0;
                 }
             });

             // Draw Center Element
             ctx.beginPath();
             ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
             ctx.fillStyle = '#10b981';
             ctx.shadowColor = '#10b981';
             ctx.shadowBlur = 20;
             ctx.fill();
             ctx.shadowBlur = 0;

             // Draw Categories
             let hoveredCatId = null;
             catNodes.forEach(cat => {
                 const dx = mx - cat.x;
                 const dy = my - cat.y;
                 if (Math.sqrt(dx*dx + dy*dy) < cat.radius) {
                     hoveredCatId = cat.id;
                 }
                 ctx.beginPath();
                 ctx.arc(cat.x, cat.y, cat.radius * 0.8, 0, Math.PI * 2);
                 const grad = ctx.createRadialGradient(cat.x, cat.y, 0, cat.x, cat.y, cat.radius);
                 grad.addColorStop(0, cat.color);
                 grad.addColorStop(1, 'rgba(255,255,255,0)');
                 ctx.fillStyle = grad;
                 ctx.globalAlpha = 0.8;
                 ctx.fill();
             });

             // Draw Hovered Tooltip
             if (hoveredParticle) {
                 const { x, y, title, color } = hoveredParticle;
                 ctx.fillStyle = '#1f2937';
                 ctx.font = 'bold 12px Inter';
                 const textWidth = ctx.measureText(title).width;
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                 ctx.beginPath();
                 ctx.roundRect(x + 10, y - 25, textWidth + 20, 30, 8);
                 ctx.fill();
                 ctx.shadowColor = 'rgba(0,0,0,0.1)';
                 ctx.shadowBlur = 10;
                 ctx.fill();
                 ctx.shadowBlur = 0;
                 
                 ctx.fillStyle = color;
                 ctx.fillText(title, x + 20 + textWidth/2, y - 10);
                 
                 // Glow on particle
                 ctx.beginPath();
                 ctx.arc(x, y, hoveredParticle.radius * 2, 0, Math.PI*2);
                 ctx.fillStyle = color;
                 ctx.fill();
             }

             mouseRef.current.hoveredItem = hoveredParticle ? hoveredParticle.item : null;
             mouseRef.current.hoveredCatId = hoveredCatId;
             requestRef.current = requestAnimationFrame(render);
        };
        
        requestRef.current = requestAnimationFrame(render);
        
        const handleResize = () => {
             width = canvas.width = canvas.offsetWidth;
             height = canvas.height = canvas.offsetHeight;
             catNodes.forEach((cat, i) => {
                 const angle = (i / categories.length) * Math.PI * 2;
                 const targetRadius = width > 600 ? Math.min(width, height) * 0.35 : Math.min(width, height) * 0.3;
                 cat.baseX = width/2 + Math.cos(angle) * targetRadius;
                 cat.baseY = height/2 + Math.sin(angle) * targetRadius;
             });
        };
        window.addEventListener('resize', handleResize);

        return () => {
             if (requestRef.current) cancelAnimationFrame(requestRef.current);
             canvas.removeEventListener('mousemove', handleMouseMove);
             canvas.removeEventListener('mouseleave', handleMouseLeave);
             window.removeEventListener('resize', handleResize);
        };
    }, [categoryCounts, items]);

    return (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-20 cursor-crosshair mix-blend-multiply" />
    );
};
