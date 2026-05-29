// Color presets for custom accent colors
const COLOR_PRESETS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#ef4444", label: "Red" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#00aeec", label: "Bili Blue" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" }
];

class CanvasApp {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.editMode = false;
    
    // Canvas Pan & Zoom State
    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;
    this.minScale = 0.15;
    this.maxScale = 3.0;

    // Interactive Dragging/Resizing States
    this.isPanning = false;
    this.isDraggingNode = false;
    this.isResizingNode = false;
    this.isConnecting = false;
    
    this.draggedNodeId = null;
    this.resizedNodeId = null;
    this.connectingSource = null; // { nodeId, side, x, y }
    
    this.startX = 0;
    this.startY = 0;
    this.nodeStartX = 0;
    this.nodeStartY = 0;
    this.nodeStartW = 0;
    this.nodeStartH = 0;
    this.spacePressed = false;

    // DOM Elements
    this.viewport = document.getElementById("canvas-viewport");
    this.container = document.getElementById("canvas-container");
    this.nodesContainer = document.getElementById("nodes-container");
    this.edgesSvg = document.getElementById("edges-svg");

    // Temp UI elements
    this.tempEdgePath = null;

    this.init();
  }

  init() {
    this.loadTheme();
    this.loadData();
    this.renderPresets();
    this.setupEventListeners();
    this.setupUploadHandlers();
    this.updateStats();
  }

  // --- Theme Management ---
  loadTheme() {
    const savedTheme = localStorage.getItem("canvas-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeButtonIcon(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("canvas-theme", newTheme);
    this.updateThemeButtonIcon(newTheme);
  }

  updateThemeButtonIcon(theme) {
    const btn = document.getElementById("btn-theme");
    if (theme === "dark") {
      btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
      btn.title = "切换浅色主题";
    } else {
      btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
      btn.title = "切换深色主题";
    }
  }

  // --- Data & Storage (Synchronized with Backend API) ---
  async loadData() {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error("Failed to fetch data from server.");
      const parsed = await response.json();
      
      this.nodes = parsed.nodes || [];
      this.edges = parsed.edges || [];
      
      this.renderCanvas();
      this.zoomToFit();
      this.updateStats();
    } catch (e) {
      console.warn("Could not reach backend API. Falling back to local storage cache.", e);
      this.loadLocalFallback();
    }
  }

  loadLocalFallback() {
    const savedData = localStorage.getItem("yk-homepage-canvas");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.nodes = parsed.nodes || [];
        this.edges = parsed.edges || [];
      } catch (e) {
        console.error("Local cache corrupt, loading inline defaults.", e);
        this.loadDefaultData();
      }
    } else {
      this.loadDefaultData();
    }
    this.renderCanvas();
    this.zoomToFit();
    this.updateStats();
  }

  loadDefaultData() {
    if (typeof DEFAULT_CANVAS_DATA !== "undefined") {
      this.nodes = JSON.parse(JSON.stringify(DEFAULT_CANVAS_DATA.nodes));
      this.edges = JSON.parse(JSON.stringify(DEFAULT_CANVAS_DATA.edges));
    } else {
      this.nodes = [];
      this.edges = [];
    }
  }

  async saveData() {
    const payload = {
      nodes: this.nodes,
      edges: this.edges
    };
    
    // Save to local storage as high-speed local cache
    localStorage.setItem("yk-homepage-canvas", JSON.stringify(payload));
    this.updateStats();

    // Persist to server disk via API
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Server save failed.");
    } catch (e) {
      console.error("Failed to save data on server. Local storage updated only.", e);
    }
  }

  updateStats() {
    document.getElementById("stat-nodes").textContent = `${this.nodes.length} 个节点`;
    document.getElementById("stat-edges").textContent = `${this.edges.length} 条连线`;
    document.getElementById("stat-zoom").textContent = `${Math.round(this.scale * 100)}%`;
  }

  // --- Render Preset Colors in Modal ---
  renderPresets() {
    const container = document.getElementById("color-presets");
    container.innerHTML = "";
    COLOR_PRESETS.forEach((preset, index) => {
      const dot = document.createElement("div");
      dot.className = `color-dot ${index === 0 ? "active" : ""}`;
      dot.style.backgroundColor = preset.value;
      dot.dataset.color = preset.value;
      dot.title = preset.label;
      dot.addEventListener("click", () => {
        document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
        dot.classList.add("active");
      });
      container.appendChild(dot);
    });
  }

  // --- Event Listeners ---
  setupEventListeners() {
    // Zoom via wheel
    this.viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      const nextScale = e.deltaY < 0 ? this.scale * zoomFactor : this.scale / zoomFactor;
      
      if (nextScale >= this.minScale && nextScale <= this.maxScale) {
        // Zoom relative to pointer position
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Coordinates before scaling
        const canvasX = (mouseX - this.panX) / this.scale;
        const canvasY = (mouseY - this.panY) / this.scale;

        this.scale = nextScale;
        
        // Calculate new pan to keep mouse pointing at same canvas coordinate
        this.panX = mouseX - canvasX * this.scale;
        this.panY = mouseY - canvasY * this.scale;

        this.applyTransform();
        this.updateStats();
      }
    }, { passive: false });

    // Key handlers (Space for pan, Tab for Edit Mode toggle)
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        if (!this.spacePressed) {
          this.spacePressed = true;
          this.viewport.style.cursor = "grab";
        }
      }
      if (e.code === "Tab" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        this.toggleEditMode();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.spacePressed = false;
        this.viewport.style.cursor = this.editMode ? "default" : "grab";
      }
    });

    // Panning & dragging mouse handlers
    this.viewport.addEventListener("mousedown", (e) => {
      const isMiddleClick = e.button === 1;
      const isLeftClick = e.button === 0;

      if (isMiddleClick || (isLeftClick && (this.spacePressed || !this.editMode))) {
        // Start panning
        this.isPanning = true;
        this.startX = e.clientX - this.panX;
        this.startY = e.clientY - this.panY;
        this.viewport.style.cursor = "grabbing";
        e.preventDefault();
        return;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
        this.applyTransform();
        return;
      }

      if (this.isDraggingNode && this.draggedNodeId) {
        const deltaX = (e.clientX - this.startX) / this.scale;
        const deltaY = (e.clientY - this.startY) / this.scale;
        
        const node = this.nodes.find(n => n.id === this.draggedNodeId);
        if (node) {
          // Snap to 10px grid if shift is not pressed
          let nextX = this.nodeStartX + deltaX;
          let nextY = this.nodeStartY + deltaY;
          if (!e.shiftKey) {
            nextX = Math.round(nextX / 10) * 10;
            nextY = Math.round(nextY / 10) * 10;
          }

          node.x = nextX;
          node.y = nextY;
          
          this.updateNodeElement(node);
          this.drawEdges();
        }
        return;
      }

      if (this.isResizingNode && this.resizedNodeId) {
        const deltaX = (e.clientX - this.startX) / this.scale;
        const deltaY = (e.clientY - this.startY) / this.scale;

        const node = this.nodes.find(n => n.id === this.resizedNodeId);
        if (node) {
          let nextW = this.nodeStartW + deltaX;
          let nextH = this.nodeStartH + deltaY;
          
          // Limits
          nextW = Math.max(220, nextW);
          nextH = Math.max(160, nextH);

          if (!e.shiftKey) {
            nextW = Math.round(nextW / 10) * 10;
            nextH = Math.round(nextH / 10) * 10;
          }

          node.width = nextW;
          node.height = nextH;

          this.updateNodeElement(node);
          this.drawEdges();
        }
        return;
      }

      if (this.isConnecting && this.connectingSource) {
        const rect = this.container.getBoundingClientRect();
        const mouseCanvasX = (e.clientX - rect.left) / this.scale;
        const mouseCanvasY = (e.clientY - rect.top) / this.scale;
        
        this.drawTempEdge(this.connectingSource.x, this.connectingSource.y, mouseCanvasX, mouseCanvasY);
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.style.cursor = this.editMode ? "default" : "grab";
      }

      if (this.isDraggingNode) {
        this.isDraggingNode = false;
        this.draggedNodeId = null;
        this.saveData();
      }

      if (this.isResizingNode) {
        this.isResizingNode = false;
        this.resizedNodeId = null;
        this.saveData();
      }

      if (this.isConnecting) {
        this.isConnecting = false;
        if (this.tempEdgePath) {
          this.tempEdgePath.remove();
          this.tempEdgePath = null;
        }

        // Check if cursor is over another node's connection point
        const targetPoint = e.target.closest(".connection-point");
        if (targetPoint) {
          const targetNodeId = targetPoint.dataset.nodeId;
          const targetSide = targetPoint.dataset.side;
          
          if (targetNodeId !== this.connectingSource.nodeId) {
            // Establish standard JSON Canvas Edge
            const newEdge = {
              id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              fromNode: this.connectingSource.nodeId,
              fromSide: this.connectingSource.side,
              toNode: targetNodeId,
              toSide: targetSide
            };
            this.edges.push(newEdge);
            this.saveData();
            this.drawEdges();
          }
        }
        this.connectingSource = null;
      }
    });

    // Toolbar buttons
    document.getElementById("btn-edit-mode").addEventListener("click", () => this.toggleEditMode());
    document.getElementById("btn-add-node").addEventListener("click", () => this.showAddModal());
    document.getElementById("btn-zoom-in").addEventListener("click", () => this.zoom(1.2));
    document.getElementById("btn-zoom-out").addEventListener("click", () => this.zoom(0.8));
    document.getElementById("btn-zoom-fit").addEventListener("click", () => this.zoomToFit());
    document.getElementById("btn-theme").addEventListener("click", () => this.toggleTheme());
    
    // Import / Export
    document.getElementById("btn-export").addEventListener("click", () => this.exportCanvas());
    document.getElementById("btn-import").addEventListener("click", () => document.getElementById("file-input").click());
    document.getElementById("file-input").addEventListener("change", (e) => this.importCanvas(e));

    // Modal buttons
    document.getElementById("btn-modal-close").addEventListener("click", () => this.closeModal("card-modal"));
    document.getElementById("btn-modal-cancel").addEventListener("click", () => this.closeModal("card-modal"));
    document.getElementById("btn-modal-save").addEventListener("click", () => this.handleNodeSave());

    document.getElementById("btn-edge-close").addEventListener("click", () => this.closeModal("edge-modal"));
    document.getElementById("btn-edge-cancel").addEventListener("click", () => this.closeModal("edge-modal"));
    document.getElementById("btn-edge-save").addEventListener("click", () => this.handleEdgeSave());
    document.getElementById("btn-edge-delete").addEventListener("click", () => this.handleEdgeDelete());
  }

  // --- Upload Handlers ---
  setupUploadHandlers() {
    const uploadBtn = document.getElementById("btn-upload-image");
    const imageFileInput = document.getElementById("image-file-input");
    const imageUrlField = document.getElementById("field-image");

    uploadBtn.addEventListener("click", () => {
      imageFileInput.click();
    });

    imageFileInput.addEventListener("change", async () => {
      const file = imageFileInput.files[0];
      if (!file) return;

      // Loading state
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 上传中...';

      const formData = new FormData();
      formData.append("image", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          const errRes = await response.json();
          throw new Error(errRes.error || "Upload failed.");
        }

        const data = await response.json();
        imageUrlField.value = data.url;
      } catch (err) {
        alert("上传失败: " + err.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 上传图片';
        imageFileInput.value = ""; // clear file field
      }
    });
  }

  // --- Letter Initials Logo Generator ---
  getInitials(label) {
    if (!label) return "YK";
    const trimmed = label.trim();
    
    // Check if it starts with Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    
    if (hasChinese) {
      // Extract first two Chinese characters
      const matches = trimmed.match(/[\u4e00-\u9fa5]/g);
      if (matches) {
        return matches.slice(0, 2).join("");
      }
    }

    // English word handling
    const words = trimmed.split(/[\s_-]+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    // Single word: take first two characters or first if length is 1
    return trimmed.slice(0, 2).toUpperCase();
  }

  // --- Rendering Pipeline ---
  applyTransform() {
    this.container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  renderCanvas() {
    this.nodesContainer.innerHTML = "";
    this.nodes.forEach(node => {
      const nodeEl = this.createNodeElement(node);
      this.nodesContainer.appendChild(nodeEl);
    });
    this.applyTransform();
    this.drawEdges();
  }

  createNodeElement(node) {
    const card = document.createElement("div");
    card.className = "canvas-node";
    card.id = `node-${node.id}`;
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;
    card.style.width = `${node.width}px`;
    card.style.height = `${node.height}px`;

    // Extract domain name
    let domain = "";
    try {
      if (node.url) {
        domain = new URL(node.url).hostname.replace("www.", "");
      }
    } catch (_) {}

    const customColor = node.color || "#6366f1";

    // Dynamic banner content depending on whether an image exists
    let bannerHtml = "";
    if (node.image) {
      bannerHtml = `<div class="card-banner" style="background-image: url('${node.image}')"></div>`;
    } else {
      const initials = this.getInitials(node.label || "未命名");
      const textGradient = `background: linear-gradient(135deg, ${customColor}ee 0%, ${customColor}55 100%)`;
      bannerHtml = `
        <div class="card-banner" style="${textGradient}">
          <div class="card-avatar-initials">${initials}</div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-color-strip" style="background-color: ${customColor}"></div>
      ${bannerHtml}
      <div class="card-content">
        <div>
          <div class="card-header-row">
            <h4 class="card-title" title="${node.label || ''}">${node.label || '未命名'}</h4>
            <a class="card-link-icon" href="${node.url || '#'}" target="_blank" title="在新窗口打开">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
          <p class="card-description" title="${node.description || ''}">${node.description || '暂无描述信息'}</p>
        </div>
        <div class="card-footer">
          <span class="card-domain" title="${node.url || ''}">${domain || 'local'}</span>
          <div class="card-actions">
            <button class="node-btn" onclick="window.open('${node.url}', '_blank'); event.stopPropagation();">
              访问 <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Edit overlays (resizer, connection points, edit controls) -->
      <div class="node-edit-controls">
        <div class="node-edit-btn edit" title="编辑节点属性"><i class="fa-solid fa-pen"></i></div>
        <div class="node-edit-btn delete" title="删除节点"><i class="fa-solid fa-trash"></i></div>
      </div>
      <div class="resize-handle"></div>
      
      <!-- Connection points for relational mapping -->
      <div class="connection-point top" data-node-id="${node.id}" data-side="top"></div>
      <div class="connection-point bottom" data-node-id="${node.id}" data-side="bottom"></div>
      <div class="connection-point left" data-node-id="${node.id}" data-side="left"></div>
      <div class="connection-point right" data-node-id="${node.id}" data-side="right"></div>
    `;

    // Interactive event listeners
    this.attachNodeEvents(card, node);

    return card;
  }

  updateNodeElement(node) {
    const el = document.getElementById(`node-${node.id}`);
    if (el) {
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.width = `${node.width}px`;
      el.style.height = `${node.height}px`;

      // Update inner texts in case of simple adjustments
      const titleEl = el.querySelector(".card-title");
      if (titleEl) titleEl.textContent = node.label || "未命名";
      const descEl = el.querySelector(".card-description");
      if (descEl) descEl.textContent = node.description || "暂无描述信息";
    }
  }

  attachNodeEvents(element, node) {
    // Normal node clicking opens edit if editMode is on, or navigates in normal view
    element.addEventListener("mousedown", (e) => {
      // Ignore right clicks or middle clicks
      if (e.button !== 0) return;
      
      // If clicking action elements, do nothing
      if (e.target.closest("a") || e.target.closest("button") || e.target.closest(".node-btn")) {
        return;
      }

      // Check if edit buttons clicked
      const editBtn = e.target.closest(".node-edit-btn.edit");
      const delBtn = e.target.closest(".node-edit-btn.delete");
      const resizeHandle = e.target.closest(".resize-handle");
      const connPoint = e.target.closest(".connection-point");

      if (delBtn) {
        e.stopPropagation();
        this.deleteNode(node.id);
        return;
      }

      if (editBtn) {
        e.stopPropagation();
        this.showEditModal(node);
        return;
      }

      if (resizeHandle) {
        e.stopPropagation();
        this.isResizingNode = true;
        this.resizedNodeId = node.id;
        this.startX = e.clientX;
        this.nodeStartW = node.width;
        this.nodeStartH = node.height;
        return;
      }

      if (connPoint) {
        e.stopPropagation();
        this.isConnecting = true;
        const side = connPoint.dataset.side;
        const ptPos = this.getConnectionPointCoords(node, side);
        this.connectingSource = {
          nodeId: node.id,
          side: side,
          x: ptPos.x,
          y: ptPos.y
        };
        return;
      }

      if (this.editMode) {
        // Drag node around
        e.stopPropagation();
        this.isDraggingNode = true;
        this.draggedNodeId = node.id;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.nodeStartX = node.x;
        this.nodeStartY = node.y;

        // Visual selection border
        document.querySelectorAll(".canvas-node").forEach(n => n.classList.remove("selected"));
        element.classList.add("selected");
      }
    });

    element.addEventListener("click", (e) => {
      // If editMode is off, double click or just single click opens modal optionally
      if (!this.editMode && !e.target.closest("a") && !e.target.closest("button")) {
        // Normal homepage click actions can be added here
      }
    });
  }

  // --- Connection Coordinate Logic ---
  getConnectionPointCoords(node, side) {
    switch (side) {
      case "top":
        return { x: node.x + node.width / 2, y: node.y };
      case "bottom":
        return { x: node.x + node.width / 2, y: node.y + node.height };
      case "left":
        return { x: node.x, y: node.y + node.height / 2 };
      case "right":
        return { x: node.x + node.width, y: node.y + node.height / 2 };
      default:
        return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }
  }

  // --- Draw Relations (Edges) ---
  drawEdges() {
    // Clear old edges
    const paths = this.edgesSvg.querySelectorAll(".edge-path, .edge-text-group");
    paths.forEach(p => p.remove());

    this.edges.forEach(edge => {
      const fromNode = this.nodes.find(n => n.id === edge.fromNode);
      const toNode = this.nodes.find(n => n.id === edge.toNode);

      if (fromNode && toNode) {
        // If sides are undefined, dynamically choose closest sides
        let fromSide = edge.fromSide;
        let toSide = edge.toSide;

        if (!fromSide || !toSide) {
          const closest = this.getClosestSides(fromNode, toNode);
          fromSide = fromSide || closest.fromSide;
          toSide = toSide || closest.toSide;
        }

        const startPt = this.getConnectionPointCoords(fromNode, fromSide);
        const endPt = this.getConnectionPointCoords(toNode, toSide);

        // Draw bezier path
        const pathData = this.calculateBezierPath(startPt, endPt, fromSide, toSide);
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("class", "edge-path");
        path.setAttribute("marker-end", "url(#arrow)");
        
        // Add double click or click event to edit connection label / delete it
        path.style.pointerEvents = "stroke";
        path.style.cursor = "pointer";
        
        path.addEventListener("mouseover", () => {
          path.classList.add("active");
          path.setAttribute("marker-end", "url(#arrow-active)");
        });
        
        path.addEventListener("mouseout", () => {
          path.classList.remove("active");
          path.setAttribute("marker-end", "url(#arrow)");
        });

        path.addEventListener("click", (e) => {
          e.stopPropagation();
          this.showEdgeModal(edge);
        });

        this.edgesSvg.appendChild(path);

        // Draw Label if exists
        if (edge.label) {
          const midX = (startPt.x + endPt.x) / 2;
          const midY = (startPt.y + endPt.y) / 2;

          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.setAttribute("class", "edge-text-group");

          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

          text.setAttribute("x", midX.toString());
          text.setAttribute("y", midY.toString());
          text.setAttribute("class", "edge-text");
          text.textContent = edge.label;
          
          group.appendChild(rect);
          group.appendChild(text);
          this.edgesSvg.appendChild(group);

          // Size the backing rectangle perfectly to fit the text bounds
          setTimeout(() => {
            try {
              const bbox = text.getBBox();
              rect.setAttribute("x", (bbox.x - 6).toString());
              rect.setAttribute("y", (bbox.y - 3).toString());
              rect.setAttribute("width", (bbox.width + 12).toString());
              rect.setAttribute("height", (bbox.height + 6).toString());
              rect.setAttribute("rx", "4");
              rect.setAttribute("fill", "var(--bg-color)");
              rect.setAttribute("stroke", "var(--card-border)");
              rect.setAttribute("stroke-width", "1");
            } catch (_) {}
          }, 0);
          
          group.addEventListener("click", (e) => {
            e.stopPropagation();
            this.showEdgeModal(edge);
          });
        }
      }
    });
  }

  getClosestSides(nodeA, nodeB) {
    const centerA = { x: nodeA.x + nodeA.width / 2, y: nodeA.y + nodeA.height / 2 };
    const centerB = { x: nodeB.x + nodeB.width / 2, y: nodeB.y + nodeB.height / 2 };

    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;

    let fromSide = "right";
    let toSide = "left";

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        fromSide = "right";
        toSide = "left";
      } else {
        fromSide = "left";
        toSide = "right";
      }
    } else {
      if (dy > 0) {
        fromSide = "bottom";
        toSide = "top";
      } else {
        fromSide = "top";
        toSide = "bottom";
      }
    }
    return { fromSide, toSide };
  }

  calculateBezierPath(start, end, fromSide, toSide) {
    const curveness = 50;
    let cp1x = start.x;
    let cp1y = start.y;
    let cp2x = end.x;
    let cp2y = end.y;

    if (fromSide === "left") cp1x -= curveness;
    else if (fromSide === "right") cp1x += curveness;
    else if (fromSide === "top") cp1y -= curveness;
    else if (fromSide === "bottom") cp1y += curveness;

    if (toSide === "left") cp2x -= curveness;
    else if (toSide === "right") cp2x += curveness;
    else if (toSide === "top") cp2y -= curveness;
    else if (toSide === "bottom") cp2y += curveness;

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  drawTempEdge(x1, y1, x2, y2) {
    if (!this.tempEdgePath) {
      this.tempEdgePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      this.tempEdgePath.setAttribute("class", "edge-path active");
      this.tempEdgePath.setAttribute("marker-end", "url(#arrow-active)");
      this.edgesSvg.appendChild(this.tempEdgePath);
    }
    
    // Choose curvature dynamically
    const startSide = this.connectingSource.side;
    const endSide = "left"; // placeholder
    const pathData = this.calculateBezierPath({ x: x1, y: y1 }, { x: x2, y: y2 }, startSide, endSide);
    this.tempEdgePath.setAttribute("d", pathData);
  }

  // --- CRUD Modals & Event Handles ---
  toggleEditMode() {
    this.editMode = !this.editMode;
    const body = document.body;
    const btn = document.getElementById("btn-edit-mode");
    const addBtn = document.getElementById("btn-add-node");
    const divider = document.getElementById("toolbar-divider");

    if (this.editMode) {
      body.classList.add("edit-mode-active");
      btn.classList.add("active");
      addBtn.style.display = "inline-flex";
      divider.style.display = "inline-block";
      this.viewport.style.cursor = "default";
    } else {
      body.classList.remove("edit-mode-active");
      btn.classList.remove("active");
      addBtn.style.display = "none";
      divider.style.display = "none";
      this.viewport.style.cursor = "grab";
      document.querySelectorAll(".canvas-node").forEach(n => n.classList.remove("selected"));
    }
  }

  showAddModal() {
    document.getElementById("modal-title").textContent = "添加新链接卡片";
    document.getElementById("field-node-id").value = "";
    document.getElementById("field-title").value = "";
    document.getElementById("field-url").value = "";
    document.getElementById("field-description").value = "";
    document.getElementById("field-image").value = "";
    
    // Default select first preset color
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
    const firstDot = document.querySelector(".color-dot");
    if (firstDot) firstDot.classList.add("active");

    this.openModal("card-modal");
  }

  showEditModal(node) {
    document.getElementById("modal-title").textContent = "编辑链接卡片";
    document.getElementById("field-node-id").value = node.id;
    document.getElementById("field-title").value = node.label || "";
    document.getElementById("field-url").value = node.url || "";
    document.getElementById("field-description").value = node.description || "";
    document.getElementById("field-image").value = node.image || "";

    // Set correct active preset dot
    document.querySelectorAll(".color-dot").forEach(d => {
      d.classList.remove("active");
      if (d.dataset.color.toLowerCase() === (node.color || "").toLowerCase()) {
        d.classList.add("active");
      }
    });

    this.openModal("card-modal");
  }

  handleNodeSave() {
    const id = document.getElementById("field-node-id").value;
    const title = document.getElementById("field-title").value.trim();
    const url = document.getElementById("field-url").value.trim();
    const description = document.getElementById("field-description").value.trim();
    const image = document.getElementById("field-image").value.trim();
    
    const activeColorDot = document.querySelector(".color-dot.active");
    const color = activeColorDot ? activeColorDot.dataset.color : "#6366f1";

    if (!title || !url) {
      alert("标题和网站链接不能为空！");
      return;
    }

    if (id) {
      // Edit existing
      const node = this.nodes.find(n => n.id === id);
      if (node) {
        node.label = title;
        node.url = url;
        node.description = description;
        node.image = image;
        node.color = color;
      }
    } else {
      // Add new node in center of current viewport
      const viewportRect = this.viewport.getBoundingClientRect();
      const centerX = (viewportRect.width / 2 - this.panX) / this.scale;
      const centerY = (viewportRect.height / 2 - this.panY) / this.scale;

      const newNode = {
        id: `node-${Date.now()}`,
        type: "link",
        x: Math.round(centerX - 150),
        y: Math.round(centerY - 110),
        width: 300,
        height: 220,
        url: url,
        label: title,
        description: description,
        image: image,
        color: color
      };
      this.nodes.push(newNode);
    }

    this.saveData();
    this.renderCanvas();
    this.closeModal("card-modal");
  }

  deleteNode(nodeId) {
    if (confirm("确定要删除这个节点吗？所有相关的连接线也会被一并删除。")) {
      // Filter out node
      this.nodes = this.nodes.filter(n => n.id !== nodeId);
      // Filter out relations associated with node
      this.edges = this.edges.filter(e => e.fromNode !== nodeId && e.toNode !== nodeId);
      
      this.saveData();
      this.renderCanvas();
    }
  }

  // --- Connection Line Edits ---
  showEdgeModal(edge) {
    if (!this.editMode) return;
    
    document.getElementById("field-edge-id").value = edge.id;
    document.getElementById("field-edge-label").value = edge.label || "";
    this.openModal("edge-modal");
  }

  handleEdgeSave() {
    const id = document.getElementById("field-edge-id").value;
    const label = document.getElementById("field-edge-label").value.trim();

    const edge = this.edges.find(e => e.id === id);
    if (edge) {
      edge.label = label;
      this.saveData();
      this.drawEdges();
    }
    this.closeModal("edge-modal");
  }

  handleEdgeDelete() {
    const id = document.getElementById("field-edge-id").value;
    if (confirm("确认删除这条连线吗？")) {
      this.edges = this.edges.filter(e => e.id !== id);
      this.saveData();
      this.drawEdges();
      this.closeModal("edge-modal");
    }
  }

  // --- Zoom Helpers ---
  zoom(factor) {
    const nextScale = this.scale * factor;
    if (nextScale >= this.minScale && nextScale <= this.maxScale) {
      const rect = this.viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const canvasX = (centerX - this.panX) / this.scale;
      const canvasY = (centerY - this.panY) / this.scale;

      this.scale = nextScale;
      this.panX = centerX - canvasX * this.scale;
      this.panY = centerY - canvasY * this.scale;

      this.applyTransform();
      this.updateStats();
    }
  }

  zoomToFit() {
    if (this.nodes.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const viewportRect = this.viewport.getBoundingClientRect();
    const scaleX = viewportRect.width / width;
    const scaleY = viewportRect.height / height;
    
    // Choose conservative scale
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, Math.min(scaleX, scaleY, 1.0)));

    // Centering calculation
    const boundsCenterX = minX + (maxX - minX) / 2;
    const boundsCenterY = minY + (maxY - minY) / 2;

    this.panX = viewportRect.width / 2 - boundsCenterX * this.scale;
    this.panY = viewportRect.height / 2 - boundsCenterY * this.scale;

    this.applyTransform();
    this.updateStats();
  }

  // --- Modal Utilities ---
  openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
  }

  // --- Import / Export (JSON Canvas Compatibility) ---
  exportCanvas() {
    const dataStr = JSON.stringify({
      nodes: this.nodes,
      edges: this.edges
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `my-homepage.canvas`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  importCanvas(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        
        // Basic schema verification
        if (parsed && Array.isArray(parsed.nodes)) {
          this.nodes = parsed.nodes;
          this.edges = Array.isArray(parsed.edges) ? parsed.edges : [];
          
          this.saveData();
          this.renderCanvas();
          this.zoomToFit();
          alert("导入成功！");
        } else {
          alert("无效的 JSON Canvas 格式！文件缺少 nodes 数组。");
        }
      } catch (err) {
        alert("解析文件失败，请确保该文件为合法的 JSON / Canvas 文件！");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    event.target.value = "";
  }
}

// Instantiate and start the app on DOM Load
window.addEventListener("DOMContentLoaded", () => {
  window.app = new CanvasApp();
});
