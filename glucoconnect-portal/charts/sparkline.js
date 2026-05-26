(function () {
    'use strict';
    window.GlucoConnect = window.GlucoConnect || {};
    window.GlucoConnect.charts = window.GlucoConnect.charts || {};

    window.GlucoConnect.charts.Sparkline = class {
        constructor(container, data, options = {}) {
            this.container = container;
            this.data = data;
            this.options = Object.assign({
                width: 100,
                height: 32,
                lineWidth: 2,
                color: '#00d4ff', // default cyan
                fill: 'rgba(0, 212, 255, 0.1)',
                animate: true
            }, options);

            // Determine color based on last reading
            if (this.data.length > 0) {
                const last = this.data[this.data.length - 1];
                if (last < 70) { this.options.color = '#00d4ff'; this.options.fill = 'rgba(0, 212, 255, 0.15)'; }
                else if (last <= 180) { this.options.color = '#00e676'; this.options.fill = 'rgba(0, 230, 118, 0.15)'; }
                else if (last <= 250) { this.options.color = '#ffb800'; this.options.fill = 'rgba(255, 184, 0, 0.15)'; }
                else { this.options.color = '#ff4757'; this.options.fill = 'rgba(255, 71, 87, 0.15)'; }
            }

            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.container.innerHTML = '';
            this.container.appendChild(this.canvas);
            
            // Handle DPI
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = this.options.width * dpr;
            this.canvas.height = this.options.height * dpr;
            this.canvas.style.width = `${this.options.width}px`;
            this.canvas.style.height = `${this.options.height}px`;
            this.ctx.scale(dpr, dpr);
        }

        render() {
            if (!this.data || this.data.length === 0) return;

            const ctx = this.ctx;
            const width = this.options.width;
            const height = this.options.height;
            const max = Math.max(...this.data) * 1.1; // Add 10% padding
            const min = Math.min(...this.data) * 0.9;

            const stepX = width / (this.data.length - 1 || 1);
            
            // Map value to Y coordinate
            const getY = (val) => height - ((val - min) / (max - min) * (height - 4)) - 2;

            ctx.clearRect(0, 0, width, height);

            // Draw line
            ctx.beginPath();
            ctx.moveTo(0, getY(this.data[0]));
            
            for (let i = 1; i < this.data.length; i++) {
                // simple curve via quadratic curve or straight lines. Using straight lines for sparkline performance
                ctx.lineTo(i * stepX, getY(this.data[i]));
            }
            
            ctx.strokeStyle = this.options.color;
            ctx.lineWidth = this.options.lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Fill
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.fillStyle = this.options.fill;
            ctx.fill();

            // Draw dot at end
            const lastX = width;
            const lastY = getY(this.data[this.data.length - 1]);
            ctx.beginPath();
            ctx.arc(lastX - 2, lastY, 3, 0, Math.PI * 2);
            ctx.fillStyle = this.options.color;
            ctx.fill();
        }
        
        destroy() {
            this.container.innerHTML = '';
        }
    };
})();
