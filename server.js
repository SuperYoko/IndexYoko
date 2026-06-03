const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to unified data directory for Docker persistence
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE_PATH = path.join(DATA_DIR, 'data.canvas');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const TODOS_DIR = path.join(DATA_DIR, 'todos');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TODOS_DIR)) {
  fs.mkdirSync(TODOS_DIR, { recursive: true });
}

// Default layout data if data.canvas does not exist yet
const INITIAL_DATA = {
  "nodes": [
    {
      "id": "node-google",
      "type": "link",
      "x": -350,
      "y": -150,
      "width": 300,
      "height": 220,
      "url": "https://www.google.com",
      "label": "Google",
      "description": "全球最大的搜索引擎，寻找你所需要的一切信息。",
      "image": "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=500&auto=format&fit=crop&q=60",
      "color": "#4285F4"
    },
    {
      "id": "node-github",
      "type": "link",
      "x": 0,
      "y": -150,
      "width": 300,
      "height": 220,
      "url": "https://github.com",
      "label": "GitHub",
      "description": "开源项目的聚集地，与全球数百万开发者共同协作与分享代码。",
      "image": "", // empty to test typography abbreviation icons!
      "color": "#24292e"
    },
    {
      "id": "node-youtube",
      "type": "link",
      "x": 350,
      "y": -150,
      "width": 300,
      "height": 220,
      "url": "https://www.youtube.com",
      "label": "YouTube",
      "description": "全球最大的视频分享平台，探索海量精彩视频、音乐和教程。",
      "image": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60",
      "color": "#FF0000"
    },
    {
      "id": "node-chatgpt",
      "type": "link",
      "x": -350,
      "y": 150,
      "width": 300,
      "height": 220,
      "url": "https://chatgpt.com",
      "label": "ChatGPT",
      "description": "基于深度学习的对话AI助手，帮助你写作、编程、解答各种疑问。",
      "image": "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=500&auto=format&fit=crop&q=60",
      "color": "#10a37f"
    },
    {
      "id": "node-bilibili",
      "type": "link",
      "x": 0,
      "y": 150,
      "width": 300,
      "height": 220,
      "url": "https://www.bilibili.com",
      "label": "哔哩哔哩",
      "description": "国内知名的年轻一代潮流文化娱乐社区，涵盖海量动漫、数码与创作视频。",
      "image": "", // empty to test typography abbreviation icons!
      "color": "#00aeec"
    },
    {
      "id": "node-v2ex",
      "type": "link",
      "x": 350,
      "y": 150,
      "width": 300,
      "height": 220,
      "url": "https://www.v2ex.com",
      "label": "V2EX",
      "description": "一个关于分享与探索新奇事物的社区，汇聚众多互联网从业者与极客。",
      "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60",
      "color": "#ff8e3c"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "fromNode": "node-google",
      "toNode": "node-chatgpt",
      "label": "辅助探索"
    },
    {
      "id": "edge-2",
      "fromNode": "node-github",
      "toNode": "node-v2ex",
      "label": "极客交流"
    }
  ]
};

// Middlewares
app.use(express.json());
app.use(express.static(__dirname)); // Serve HTML, CSS, JS directly
app.use('/uploads', express.static(UPLOADS_DIR)); // Serve uploaded images

// Multer storage configuration for handling image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp|svg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image uploads (jpeg, jpg, png, gif, webp, svg) are allowed!"));
  }
});

// GET endpoint to retrieve canvas data
app.get('/api/data', (req, res) => {
  if (fs.existsSync(DATA_FILE_PATH)) {
    fs.readFile(DATA_FILE_PATH, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).json({ error: "Failed to read canvas data file." });
      }
      try {
        res.json(JSON.parse(data));
      } catch (parseErr) {
        res.status(500).json({ error: "Error parsing canvas data JSON." });
      }
    });
  } else {
    // Write default initial data if none exists
    fs.writeFile(DATA_FILE_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf8', (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to create default data file." });
      }
      res.json(INITIAL_DATA);
    });
  }
});

// Helper function to clean up uploaded images that are no longer referenced in any node
function cleanupOrphanedImages(canvasData) {
  if (!canvasData || !Array.isArray(canvasData.nodes)) return;

  // Collect all active upload image filenames referenced by nodes
  const activeImages = new Set();
  canvasData.nodes.forEach(node => {
    if (node.image && node.image.startsWith('/uploads/')) {
      const filename = node.image.replace('/uploads/', '');
      if (filename) {
        activeImages.add(filename);
      }
    }
  });

  // Read uploads directory and delete orphaned files
  fs.readdir(UPLOADS_DIR, (err, files) => {
    if (err) {
      console.error("Failed to read uploads directory for cleanup:", err);
      return;
    }

    files.forEach(file => {
      // Avoid deleting hidden files or system files
      if (file.startsWith('.')) return;

      if (!activeImages.has(file)) {
        const filePath = path.join(UPLOADS_DIR, file);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`Failed to delete orphaned image ${file}:`, unlinkErr);
          } else {
            console.log(`Successfully deleted orphaned image: ${file}`);
          }
        });
      }
    });
  });
}

// POST endpoint to save canvas data
app.post('/api/data', (req, res) => {
  const canvasData = req.body;
  if (!canvasData || !Array.isArray(canvasData.nodes)) {
    return res.status(400).json({ error: "Invalid canvas data format. Must include nodes array." });
  }

  fs.writeFile(DATA_FILE_PATH, JSON.stringify(canvasData, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to save canvas data." });
    }
    
    // Asynchronously trigger orphaned image cleanup to keep uploads directory pristine
    try {
      cleanupOrphanedImages(canvasData);
    } catch (cleanupErr) {
      console.error("Error during orphaned image cleanup:", cleanupErr);
    }

    res.json({ success: true, message: "Canvas saved successfully on server." });
  });
});

// POST endpoint to handle image uploads
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }
  
  // Return the relative URL to access the uploaded image
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
}, (error, req, res, next) => {
  // Handle multer errors gracefully
  res.status(400).json({ error: error.message });
});

// GET endpoint to retrieve all todos
app.get('/api/todos', (req, res) => {
  fs.readdir(TODOS_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read todos directory." });
    }
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const todos = [];
    let readCount = 0;

    if (jsonFiles.length === 0) {
      return res.json([]);
    }

    jsonFiles.forEach(file => {
      const filePath = path.join(TODOS_DIR, file);
      fs.readFile(filePath, 'utf8', (err, data) => {
        readCount++;
        if (!err) {
          try {
            todos.push(JSON.parse(data));
          } catch (e) {
            console.error(`Error parsing todo file ${file}:`, e);
          }
        }
        if (readCount === jsonFiles.length) {
          res.json(todos);
        }
      });
    });
  });
});

// POST endpoint to create a new todo
app.post('/api/todos', (req, res) => {
  const todo = req.body;
  if (!todo || !todo.id) {
    return res.status(400).json({ error: "Invalid todo format. Must include an id." });
  }

  const filePath = path.join(TODOS_DIR, `todo-${todo.id}.json`);
  fs.writeFile(filePath, JSON.stringify(todo, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to save todo." });
    }
    res.json({ success: true, todo });
  });
});

// PUT endpoint to update a todo
app.put('/api/todos/:id', (req, res) => {
  const id = req.params.id;
  const todo = req.body;
  if (!todo) {
    return res.status(400).json({ error: "Invalid data." });
  }

  const filePath = path.join(TODOS_DIR, `todo-${id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Todo not found." });
  }

  fs.writeFile(filePath, JSON.stringify(todo, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to update todo." });
    }
    res.json({ success: true, todo });
  });
});

// DELETE endpoint to delete a todo
app.delete('/api/todos/:id', (req, res) => {
  const id = req.params.id;
  const filePath = path.join(TODOS_DIR, `todo-${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Todo not found." });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete todo." });
    }
    res.json({ success: true, message: "Todo deleted successfully." });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  IndexYK Canvas Homepage Server is now running!  `);
  console.log(`  Access URL: http://localhost:${PORT}             `);
  console.log(`  Data File:  ${DATA_FILE_PATH}                   `);
  console.log(`==================================================`);
});
