/**
 * VibeSnap Annotation Engine
 * Manages drawing on the selection overlay canvas (Pen, Arrow, Rect, Text, Highlight, Blur).
 */

class AnnotationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Drawing state
    this.activeTool = 'select'; // select, pen, arrow, rect, text, highlight, blur
    this.currentColor = '#ff3b30';
    this.lineWidth = 3;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    // Undo stack stores canvas ImageData states
    this.undoStack = [];
    this.maxUndo = 20;

    this.tempImageData = null;

    this.initEvents();
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  resize(width, height) {
    if (width <= 0 || height <= 0) return;
    if (this.canvas.width === width && this.canvas.height === height) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width || 1;
    tempCanvas.height = this.canvas.height || 1;
    const tempCtx = tempCanvas.getContext('2d');

    if (this.canvas.width > 0 && this.canvas.height > 0) {
      tempCtx.drawImage(this.canvas, 0, 0);
    }

    this.canvas.width = width;
    this.canvas.height = height;

    if (tempCanvas.width > 0 && tempCanvas.height > 0) {
      this.ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack = [];
  }

  saveState() {
    if (this.canvas.width <= 0 || this.canvas.height <= 0) return;
    if (this.undoStack.length >= this.maxUndo) {
      this.undoStack.shift();
    }
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.undoStack.pop(); // Remove current state
      const prevState = this.undoStack[this.undoStack.length - 1];
      this.ctx.putImageData(prevState, 0, 0);
    } else if (this.undoStack.length === 1) {
      this.undoStack.pop();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  setTool(tool) {
    this.activeTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseDown(e) {
    if (this.activeTool === 'select') return;

    this.isDrawing = true;
    const pos = this.getPointerPos(e);
    this.startX = pos.x;
    this.startY = pos.y;

    if (this.canvas.width > 0 && this.canvas.height > 0) {
      this.tempImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.activeTool === 'pen' || this.activeTool === 'highlight') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
    } else if (this.activeTool === 'text') {
      this.createInlineTextEditor(pos.x, pos.y);
      this.isDrawing = false;
    }
  }

  onMouseMove(e) {
    if (!this.isDrawing || this.activeTool === 'select') return;

    const pos = this.getPointerPos(e);

    if (this.activeTool === 'pen') {
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    } else if (this.activeTool === 'highlight') {
      this.ctx.strokeStyle = this.currentColor + '66'; // 40% transparency
      this.ctx.lineWidth = 14;
      this.ctx.lineCap = 'square';
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    } else if (this.activeTool === 'arrow' || this.activeTool === 'rect' || this.activeTool === 'blur') {
      if (this.tempImageData) {
        this.ctx.putImageData(this.tempImageData, 0, 0);
      }

      if (this.activeTool === 'arrow') {
        this.drawArrow(this.startX, this.startY, pos.x, pos.y);
      } else if (this.activeTool === 'rect') {
        this.drawRectangle(this.startX, this.startY, pos.x, pos.y);
      } else if (this.activeTool === 'blur') {
        this.drawBlurBox(this.startX, this.startY, pos.x, pos.y);
      }
    }
  }

  onMouseUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.saveState();
  }

  drawArrow(fromX, fromY, toX, toY) {
    const headLength = 14;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.fillStyle = this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';

    // Main line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawRectangle(fromX, fromY, toX, toY) {
    const width = toX - fromX;
    const height = toY - fromY;

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.strokeRect(fromX, fromY, width, height);
  }

  drawBlurBox(fromX, fromY, toX, toY) {
    const x = Math.min(fromX, toX);
    const y = Math.min(fromY, toY);
    const w = Math.abs(toX - fromX);
    const h = Math.abs(toY - fromY);

    if (w < 4 || h < 4) return;

    const bgCanvas = document.getElementById('bgCanvas');
    const selectionBox = document.getElementById('selectionBox');
    const selX = parseInt(selectionBox.style.left || 0);
    const selY = parseInt(selectionBox.style.top || 0);

    const bgCtx = bgCanvas.getContext('2d');
    const imgData = bgCtx.getImageData(selX + x, selY + y, w, h);

    const pixelSize = 10;
    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        const i = (py * w + px) * 4;
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];

        this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        this.ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
      }
    }
  }

  createInlineTextEditor(x, y) {
    const editor = document.createElement('textarea');
    editor.className = 'inline-text-editor';
    editor.style.left = `${x}px`;
    editor.style.top = `${y}px`;
    editor.style.color = this.currentColor;

    this.canvas.parentElement.appendChild(editor);
    setTimeout(() => editor.focus(), 50);

    const finishText = () => {
      const text = editor.value.trim();
      if (text) {
        this.ctx.font = '600 16px Inter, sans-serif';
        this.ctx.fillStyle = this.currentColor;
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          this.ctx.fillText(line, x + 4, y + 20 + index * 20);
        });
        this.saveState();
      }
      editor.remove();
    };

    editor.addEventListener('blur', finishText);
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        editor.blur();
      }
    });
  }
}

window.AnnotationEngine = AnnotationEngine;
