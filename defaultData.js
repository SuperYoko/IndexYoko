const DEFAULT_CANVAS_DATA = {
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
      "image": "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=500&auto=format&fit=crop&q=60",
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
      "image": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=60",
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_CANVAS_DATA };
}
