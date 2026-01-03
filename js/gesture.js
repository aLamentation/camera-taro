/**
 * gesture.js - 手势识别模块 (v6 - 优化增强版)
 * 改进手指状态检测、手势判定逻辑和稳定性
 */

export class GestureRecognizer {
    constructor(debugMode = false) {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.isInitialized = false;

        this.currentGesture = 'none';
        this.previousGesture = 'none';
        this.handPosition = { x: 0.5, y: 0.5 };

        // 回调函数
        this.onGestureChange = null;
        this.onThumbsUp = null;      // 竖食指回调 (替代捏合)
        this.onOkGesture = null;
        this.onPositionUpdate = null;
        this.onEdgeScroll = null;

        this.lastGestureTime = 0;
        this.gestureDelay = 300; // 优化延迟时间

        // 边缘滚动
        this.edgeScrollTimer = null;
        this.edgeScrollDirection = null;
        this.edgeScrollInterval = 200;
        this.edgeThreshold = 0.18;

        // 稳定识别 - 优化参数
        this.gestureHistory = [];
        this.gestureHistorySize = 6; // 适中的历史记录长度，平衡响应速度和稳定性
        this.gestureStableMin = 4;   // 降低稳定性要求，提高响应速度

        // 关键点平滑处理 - 使用指数移动平均
        this.landmarkHistory = [];
        this.landmarkHistorySize = 5; // 增加历史记录以提供更好的平滑
        this.smoothingAlpha = 0.6; // EMA平滑系数 (0-1，越大越敏感)
        this.smoothedLandmarks = null; // 存储平滑后的landmarks

        // 位置平滑
        this.positionHistory = [];
        this.positionHistorySize = 5;

        // 调试模式
        this.debugMode = debugMode;
        this.debugInfo = {
            rawGesture: 'none',
            stableGesture: 'none',
            fingerStates: null,
            confidence: 0
        };
    }

    async init() {
        this.videoElement = document.getElementById('camera-feed');
        this.canvasElement = document.getElementById('camera-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        // 优化MediaPipe配置 - 平衡精度和性能
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,                    // 使用中等复杂度模型，平衡性能和精度
            minDetectionConfidence: 0.7,          // 适中的检测置信度
            minTrackingConfidence: 0.5            // 降低追踪置信度，提高连续追踪稳定性
        });

        this.hands.onResults((results) => this.onResults(results));

        // 根据设备类型调整摄像头分辨率
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth < 768;
        
        // 移动端使用较低分辨率以提升性能，桌面端使用较高分辨率
        const cameraWidth = (isMobile || isSmallScreen) ? 640 : 1280;
        const cameraHeight = (isMobile || isSmallScreen) ? 480 : 720;

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: cameraWidth,
            height: cameraHeight,
            facingMode: 'user' // 使用前置摄像头
        });

        await this.camera.start();
        this.updateStatus(true, '手势识别已启动（优化版）');
        this.isInitialized = true;
    }

    onResults(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const rawLandmarks = results.multiHandLandmarks[0];
            // 应用平滑处理
            const smoothedLandmarks = this.smoothLandmarks(rawLandmarks);
            this.drawHand(smoothedLandmarks);
            this.analyzeGesture(smoothedLandmarks);
        }

        this.canvasCtx.restore();
    }

    // 关键点平滑处理 - 使用指数移动平均(EMA)，更平滑且延迟更低
    smoothLandmarks(landmarks) {
        if (!this.smoothedLandmarks) {
            // 首次初始化
            this.smoothedLandmarks = landmarks.map(l => ({ ...l }));
            return this.smoothedLandmarks;
        }

        // 使用EMA平滑：新值 = α * 当前值 + (1-α) * 旧值
        const alpha = this.smoothingAlpha;
        this.smoothedLandmarks = landmarks.map((landmark, index) => {
            const smoothed = this.smoothedLandmarks[index];
            return {
                x: alpha * landmark.x + (1 - alpha) * smoothed.x,
                y: alpha * landmark.y + (1 - alpha) * smoothed.y,
                z: alpha * (landmark.z || 0) + (1 - alpha) * (smoothed.z || 0)
            };
        });

        return this.smoothedLandmarks;
    }

    drawHand(landmarks) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];

        this.canvasCtx.strokeStyle = '#D4AF37';
        this.canvasCtx.lineWidth = 2;

        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(startPoint.x * this.canvasElement.width, startPoint.y * this.canvasElement.height);
            this.canvasCtx.lineTo(endPoint.x * this.canvasElement.width, endPoint.y * this.canvasElement.height);
            this.canvasCtx.stroke();
        });

        landmarks.forEach((point, index) => {
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(
                point.x * this.canvasElement.width,
                point.y * this.canvasElement.height,
                index === 4 ? 10 : 4, // 大拇指指尖高亮更大
                0, 2 * Math.PI
            );
            this.canvasCtx.fillStyle = index === 4 ? '#00FF00' : '#D4AF37';
            this.canvasCtx.fill();
        });
    }

    analyzeGesture(landmarks) {
        const now = Date.now();

        // 更新手位置 (用手掌中心) - 添加位置平滑
        const palmCenter = landmarks[9];
        this.positionHistory.push({ x: palmCenter.x, y: palmCenter.y });
        if (this.positionHistory.length > this.positionHistorySize) {
            this.positionHistory.shift();
        }

        // 计算平滑后的位置
        if (this.positionHistory.length > 1) {
            const avgX = this.positionHistory.reduce((sum, p) => sum + p.x, 0) / this.positionHistory.length;
            const avgY = this.positionHistory.reduce((sum, p) => sum + p.y, 0) / this.positionHistory.length;
            this.handPosition = { x: avgX, y: avgY };
        } else {
            this.handPosition = { x: palmCenter.x, y: palmCenter.y };
        }

        const rawGesture = this.classifyGesture(landmarks);
        const stableGesture = this.pushAndGetStableGesture(rawGesture);
        const newGesture = stableGesture || rawGesture;

        // 调试信息记录
        if (this.debugMode) {
            this.debugInfo.rawGesture = rawGesture;
            this.debugInfo.stableGesture = stableGesture || rawGesture;
            const palmScale = this.getPalmScale(landmarks);
            this.debugInfo.fingerStates = this.getFingerStates(landmarks, palmScale);

            // 计算置信度
            const counts = {};
            for (const g of this.gestureHistory) {
                counts[g] = (counts[g] || 0) + 1;
            }
            this.debugInfo.confidence = (counts[rawGesture] || 0) / this.gestureHistory.length;
        }

        if (newGesture === 'closed') {
            this.stopEdgeScroll();
        } else if (newGesture === 'thumbsup') {
            this.stopEdgeScroll();
            if (this.currentGesture !== 'thumbsup' && this.onThumbsUp && now - this.lastGestureTime > this.gestureDelay) {
                this.onThumbsUp();
                this.lastGestureTime = now;
            }
        } else if (newGesture === 'ok') {
            this.stopEdgeScroll();
            if (this.currentGesture !== 'ok' && this.onOkGesture && now - this.lastGestureTime > this.gestureDelay) {
                this.onOkGesture();
                this.lastGestureTime = now;
            }
        } else if (newGesture === 'open') {
            // 用手的位置选择卡牌
            const normalizedX = 1 - this.handPosition.x; // 镜像翻转

            if (normalizedX < this.edgeThreshold) {
                this.startEdgeScroll('left');
            } else if (normalizedX > 1 - this.edgeThreshold) {
                this.startEdgeScroll('right');
            } else {
                this.stopEdgeScroll();
                if (this.onPositionUpdate) {
                    this.onPositionUpdate(normalizedX);
                }
            }
        } else {
            this.stopEdgeScroll();
        }

        // 手势变化
        if (newGesture !== this.currentGesture) {
            this.previousGesture = this.currentGesture;
            this.currentGesture = newGesture;
            if (this.onGestureChange && now - this.lastGestureTime > this.gestureDelay) {
                this.onGestureChange(newGesture, this.previousGesture);
                this.lastGestureTime = now;
            }
        }
    }

    classifyGesture(landmarks) {
        const palmScale = this.getPalmScale(landmarks);
        const states = this.getFingerStates(landmarks, palmScale);
        const isOpen = this.isHandOpenGesture(states);
        const isClosed = this.isHandClosedGesture(states);

        if (this.isOkGesture(states, landmarks, palmScale)) return 'ok';
        if (this.isIndexUpGesture(states, landmarks, palmScale)) return 'thumbsup';
        if (isOpen) return 'open';
        if (isClosed) return 'closed';
        return 'none';
    }

    pushAndGetStableGesture(gesture) {
        this.gestureHistory.push(gesture);
        if (this.gestureHistory.length > this.gestureHistorySize) {
            this.gestureHistory.shift();
        }

        const counts = {};
        for (const g of this.gestureHistory) {
            counts[g] = (counts[g] || 0) + 1;
        }

        let topGesture = null;
        let topCount = 0;
        for (const [g, c] of Object.entries(counts)) {
            if (c > topCount) {
                topCount = c;
                topGesture = g;
            }
        }

        return topCount >= this.gestureStableMin ? topGesture : null;
    }

    getFingerStates(landmarks, palmScale) {
        // MediaPipe标准方法：使用手掌中心点和指尖位置比较
        const wrist = landmarks[0];
        const palmCenter = landmarks[9]; // 中指MCP，作为手掌中心参考点
        
        const fingers = {
            index: { mcp: 5, pip: 6, dip: 7, tip: 8 },
            middle: { mcp: 9, pip: 10, dip: 11, tip: 12 },
            ring: { mcp: 13, pip: 14, dip: 15, tip: 16 },
            pinky: { mcp: 17, pip: 18, dip: 19, tip: 20 }
        };

        const states = {};
        let extendedCount = 0;
        let curledCount = 0;

        // 检测四根手指（除拇指外）
        for (const [name, f] of Object.entries(fingers)) {
            const pip = landmarks[f.pip];
            const tip = landmarks[f.tip];
            
            // MediaPipe推荐方法：比较指尖和PIP关节的Y坐标
            // 如果指尖Y坐标小于PIP关节Y坐标（在屏幕上更高），则手指伸展
            // 这是最简单且最可靠的方法
            const isExtended = tip.y < pip.y;
            
            // 额外验证：计算指尖到手掌中心的距离，确保手指真正伸展
            const tipToPalmDist = this.distance2(tip, palmCenter);
            const pipToPalmDist = this.distance2(pip, palmCenter);
            const extensionRatio = tipToPalmDist / Math.max(pipToPalmDist, 1e-6);
            
            // 结合Y坐标和距离比例判断
            const extended = isExtended && extensionRatio > 0.85;
            const curled = !isExtended && extensionRatio < 0.75;

            states[name] = {
                extended,
                curled,
                extensionRatio,
                isExtended: isExtended // 原始Y坐标判断
            };

            if (extended) extendedCount++;
            if (curled) curledCount++;
        }

        // 拇指检测 - 使用不同的方法（拇指运动方向不同）
        const thumbIp = landmarks[3];
        const thumbTip = landmarks[4];
        const thumbMcp = landmarks[2];
        
        // 拇指：比较拇指尖和拇指IP的X坐标（拇指在水平方向运动）
        // 对于右手：拇指尖X > 拇指IP X 表示伸展
        // 为了兼容左右手，使用距离判断
        const thumbTipToWrist = this.distance2(thumbTip, wrist);
        const thumbMcpToWrist = this.distance2(thumbMcp, wrist);
        const thumbExtensionRatio = thumbTipToWrist / Math.max(thumbMcpToWrist, 1e-6);
        
        // 拇指伸展判断
        const thumbExtended = thumbExtensionRatio > 1.2;
        const thumbCurled = thumbExtensionRatio < 0.9;

        states.thumb = { 
            extended: thumbExtended, 
            curled: thumbCurled, 
            extensionRatio: thumbExtensionRatio 
        };
        states.extendedCount = extendedCount;
        states.curledCount = curledCount;

        return states;
    }

    isHandOpenGesture(states) {
        // 简化判断：至少4根手指伸展（包括或不包括拇指）
        // 或者至少3根非拇指手指伸展且拇指也伸展
        const nonThumbExtended = states.extendedCount;
        
        if (nonThumbExtended >= 4) {
            return true; // 四根手指都伸展，明显是张开
        }
        
        if (nonThumbExtended >= 3 && states.thumb.extended) {
            return true; // 三根手指+拇指伸展
        }
        
        // 核心手指（食指、中指）都伸展，且至少还有一根其他手指伸展
        if (states.index.extended && states.middle.extended && nonThumbExtended >= 2) {
            return true;
        }
        
        return false;
    }

    isHandClosedGesture(states) {
        // 简化判断：握拳时大部分手指应该卷曲
        // 1. 伸展的手指不超过1根（允许拇指单独伸展）
        const fewExtended = states.extendedCount <= 1;
        
        // 2. 核心手指（食指、中指）都不伸展
        const coreClosed = !states.index.extended && !states.middle.extended;
        
        // 3. 至少3根手指卷曲
        const mostCurled = states.curledCount >= 3;
        
        // 满足核心条件：核心手指闭合，且很少手指伸展
        return coreClosed && fewExtended;
    }

    isIndexUpGesture(states, landmarks, palmScale) {
        // 基本条件：食指必须伸展，其他手指（除拇指）必须卷曲
        if (!states.index.extended) return false;
        if (states.middle.extended || states.ring.extended || states.pinky.extended) return false;

        // 至少2根其他手指卷曲（中指、无名指、小指中至少2根）
        if (states.curledCount < 2) return false;

        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        // 食指应该明显高于其他手指的指尖
        const otherTips = [middleTip.y, ringTip.y, pinkyTip.y];
        const minOtherY = Math.min(...otherTips);
        const indexMuchHigher = indexTip.y < minOtherY - palmScale * 0.05;

        return indexMuchHigher;
    }

    isOkGesture(states, landmarks, palmScale) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        // 1. 拇指和食指的捏合距离（核心判断）
        const pinchDist = this.distance2(thumbTip, indexTip);
        const pinchRatio = pinchDist / palmScale;
        const pinchOk = pinchRatio < 0.15; // 拇指和食指足够接近

        // 2. 其他手指应该伸展（至少2根）
        const otherExtended = (states.middle.extended ? 1 : 0) +
                             (states.ring.extended ? 1 : 0) +
                             (states.pinky.extended ? 1 : 0);
        const othersOk = otherExtended >= 2;

        // 3. 其他手指应该高于或接近捏合点（避免误判握拳）
        const pinchY = (thumbTip.y + indexTip.y) / 2;
        const otherTips = [middleTip.y, ringTip.y, pinkyTip.y];
        const maxOtherY = Math.max(...otherTips);
        const othersHigher = maxOtherY <= pinchY + palmScale * 0.08;

        // 综合判定：捏合 + 其他手指伸展
        return pinchOk && othersOk && othersHigher;
    }

    getPalmScale(landmarks) {
        const palmWidth = this.distance2(landmarks[5], landmarks[17]);
        const palmHeight = this.distance2(landmarks[0], landmarks[9]);
        return Math.max(0.08, (palmWidth + palmHeight) / 2);
    }

    getPalmDirection(landmarks) {
        const wrist = landmarks[0];
        let dir = this.vector(landmarks[9], wrist);
        if (this.magnitude(dir) < 1e-6) {
            dir = this.vector(landmarks[12], wrist);
        }
        return this.normalize(dir, { x: 0, y: -1, z: 0 });
    }

    vector(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
    }

    magnitude(v) {
        return Math.hypot(v.x, v.y, v.z);
    }

    normalize(v, fallback) {
        const mag = this.magnitude(v);
        if (mag < 1e-6) return { ...fallback };
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    }

    dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    projectedDistance(point, origin, dir) {
        const v = this.vector(point, origin);
        return this.dot(v, dir);
    }

    distance3(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
    }

    distance2(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    angle2D(a, b, c) {
        const v1 = { x: a.x - b.x, y: a.y - b.y };
        const v2 = { x: c.x - b.x, y: c.y - b.y };
        const mag1 = Math.hypot(v1.x, v1.y);
        const mag2 = Math.hypot(v2.x, v2.y);
        if (mag1 < 1e-6 || mag2 < 1e-6) return 180;
        const cos = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
        const clamped = Math.max(-1, Math.min(1, cos));
        return Math.acos(clamped) * (180 / Math.PI);
    }

    angle(a, b, c) {
        const v1 = this.vector(a, b);
        const v2 = this.vector(c, b);
        const mag1 = this.magnitude(v1);
        const mag2 = this.magnitude(v2);
        if (mag1 < 1e-6 || mag2 < 1e-6) return 180;
        const cos = this.dot(v1, v2) / (mag1 * mag2);
        const clamped = Math.max(-1, Math.min(1, cos));
        return Math.acos(clamped) * (180 / Math.PI);
    }

    startEdgeScroll(direction) {
        if (this.edgeScrollDirection === direction && this.edgeScrollTimer) {
            return;
        }

        this.stopEdgeScroll();
        this.edgeScrollDirection = direction;

        if (this.onEdgeScroll) {
            this.onEdgeScroll(direction);
        }

        this.edgeScrollTimer = setInterval(() => {
            if (this.onEdgeScroll) {
                this.onEdgeScroll(direction);
            }
        }, this.edgeScrollInterval);
    }

    stopEdgeScroll() {
        if (this.edgeScrollTimer) {
            clearInterval(this.edgeScrollTimer);
            this.edgeScrollTimer = null;
        }
        this.edgeScrollDirection = null;
    }

    updateStatus(active, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('status-text');
        if (statusDot) statusDot.classList.toggle('active', active);
        if (statusText && text) statusText.textContent = text;
    }

    getCurrentGesture() { return this.currentGesture; }
    getHandPosition() { return this.handPosition; }

    // 获取调试信息
    getDebugInfo() {
        if (!this.debugMode) {
            console.warn('Debug mode is not enabled. Enable it with constructor parameter: new GestureRecognizer(true)');
        }
        return {
            ...this.debugInfo,
            currentGesture: this.currentGesture,
            previousGesture: this.previousGesture,
            history: [...this.gestureHistory]
        };
    }

    // 设置调试模式
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    dispose() {
        this.stopEdgeScroll();
        if (this.camera) this.camera.stop();
    }
}
