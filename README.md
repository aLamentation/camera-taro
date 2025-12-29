# 🎴 神秘塔罗牌 - Camera Tarot

一个基于手势识别的3D塔罗牌占卜体验项目。通过摄像头捕捉手势，用户可以用手势与虚拟塔罗牌进行交互，获得神秘的占卜体验。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Three.js](https://img.shields.io/badge/Three.js-r128-orange.svg)

## ✨ 特性

- 🎥 **摄像头手势识别** - 使用 MediaPipe Hands 实现实时手势追踪
- 🎴 **3D 塔罗牌展示** - 基于 Three.js 的精美 3D 渲染效果
- ✋ **直观手势控制** - 支持多种手势进行自然交互
- 🌟 **流畅动画效果** - 使用 GSAP 实现丝滑的动画转场
- 📱 **响应式设计** - 适配不同屏幕尺寸

## 🎯 支持的手势

| 手势 | 功能 | 说明 |
|------|------|------|
| 🖐️ **张开手掌** | 展开卡牌 | 将卡牌从堆叠状态展开成扇形 |
| ✊ **握拳收手** | 收起卡牌 | 将展开的卡牌收回堆叠状态 |
| 👈👉 **左右移动** | 选择卡牌 | 通过手掌位置选择不同的卡牌 |
| ☝️ **竖起食指** | 抽取卡牌 | 抽取当前选中的卡牌 |
| 👌 **OK 手势** | 查看解读 | 显示卡牌的详细含义和解读 |

## 🚀 快速开始

### 前置要求

- 现代浏览器（Chrome、Edge、Safari 等）
- 摄像头权限
- 本地 Web 服务器（推荐使用 Live Server）

### 安装与运行

1. **克隆项目**
   ```bash
   git clone https://github.com/lampardrodgers/camera_tarot.git
   cd camera_tarot
   ```

2. **启动本地服务器**
   
   使用 VS Code Live Server 插件：
   - 右键点击 `index.html`
   - 选择 "Open with Live Server"
   
   或使用 Python：
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   或使用 Node.js：
   ```bash
   npx http-server
   ```

3. **访问应用**
   
   在浏览器中打开 `http://localhost:8000`

4. **允许摄像头权限**
   
   首次访问时，浏览器会请求摄像头权限，请点击"允许"

## 📁 项目结构

```
camera_tarot/
├── index.html              # 主 HTML 文件
├── css/
│   └── styles.css         # 样式文件
├── js/
│   ├── app.js             # 主应用入口
│   ├── scene.js           # Three.js 场景管理
│   ├── cards.js           # 塔罗牌系统
│   ├── gesture.js         # 手势识别逻辑
│   └── animations.js      # 动画控制器
└── README.md              # 项目说明文档
```

## 🛠️ 技术栈

- **[Three.js](https://threejs.org/)** (r128) - 3D 渲染引擎
- **[MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)** - 手部追踪和手势识别
- **[GSAP](https://greensock.com/gsap/)** - 动画库
- **Vanilla JavaScript (ES6+)** - 核心逻辑
- **CSS3** - 样式和布局

## 🎮 使用说明

1. **启动应用**
   - 打开网页后，允许摄像头权限
   - 等待系统初始化完成

2. **展开卡牌**
   - 对着摄像头张开手掌（五指分开）
   - 卡牌会自动展开成扇形

3. **选择卡牌**
   - 左右移动手掌，可以看到不同的卡牌被高亮
   - 也可以将手移到屏幕边缘进行滚动选择

4. **抽取卡牌**
   - 当选中心仪的卡牌后，竖起食指（👍）
   - 卡牌会被抽出并翻转

5. **查看解读**
   - 翻转后，做出 OK 手势（👌）
   - 即可查看卡牌的详细含义

6. **重新占卜**
   - 点击"继续占卜"按钮或关闭信息面板
   - 系统会重置，可以开始新一轮占卜

## 🎨 自定义

### 修改塔罗牌数据

在 `js/cards.js` 文件中，可以修改塔罗牌的数据：

```javascript
const cards = [
    { name: '愚者', number: 0, meaning: '新的开始，冒险精神' },
    // 添加或修改更多塔罗牌...
];
```

### 调整手势灵敏度

在 `js/gesture.js` 文件中，可以调整手势识别的阈值：

```javascript
this.gestureThresholds = {
    openHand: 0.7,      // 张开手掌阈值
    closedFist: 0.3,    // 握拳阈值
    // 更多阈值设置...
};
```

## 🐛 常见问题

### Q: 摄像头无法启动？
A: 请确保：
- 浏览器有摄像头权限
- 使用 HTTPS 或 localhost 运行
- 没有其他应用占用摄像头

### Q: 手势识别不准确？
A: 建议：
- 确保光线充足
- 保持手部在摄像头可见范围内
- 手势要清晰明确
- 调整摄像头角度

### Q: 卡牌显示异常？
A: 尝试：
- 刷新页面重新加载
- 检查浏览器控制台是否有错误
- 确保使用现代浏览器

## 📝 开发计划

- [ ] 添加完整的 22 张大阿尔卡纳牌
- [ ] 支持 56 张小阿尔卡纳牌
- [ ] 添加更多占卜布阵（三牌阵、凯尔特十字等）
- [ ] 优化手势识别算法
- [ ] 添加声音效果
- [ ] 支持移动端触摸控制
- [ ] 多语言支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

lampardrodgers

## 🙏 致谢

- [Three.js](https://threejs.org/) - 优秀的 3D 库
- [MediaPipe](https://google.github.io/mediapipe/) - 强大的机器学习模型
- [GSAP](https://greensock.com/) - 专业的动画库
- 所有开源贡献者

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
