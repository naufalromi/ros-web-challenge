let ros = null;
let cmdVel = null;
let publishTimer = null;
let reconnectTimeout = null;
let rosUrl = '';
let camUrl = '';

const statusEl = document.getElementById('status');
const imgEl = document.getElementById('kamera');
const rosInput = document.getElementById('rosUrlInput');
const camInput = document.getElementById('camUrlInput');
const connectBtn = document.getElementById('connectBtn');

function updateStatus(state, msg) {
    const map = {
        connected:    'text-green-500 font-semibold mb-6',
        connecting:   'text-yellow-500 font-semibold mb-6',
        disconnected: 'text-red-500 font-semibold mb-6',
        error:        'text-red-600 font-semibold mb-6'
    };
    statusEl.className = map[state] || map.disconnected;
    statusEl.innerText = msg || ('Status: ' + state.charAt(0).toUpperCase() + state.slice(1));
}

function publishTwist(linear, angular) {
    if (!ros || !ros.isConnected) return;
    const twist = new ROSLIB.Message({
        linear:  { x: linear,  y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: angular }
    });
    cmdVel.publish(twist);

    fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linear, angular })
    }).catch(() => {});
}

function startMove(linear, angular) {
    stopMove();
    publishTwist(linear, angular);
    publishTimer = setInterval(() => publishTwist(linear, angular), 100);
}

function stopMove() {
    if (publishTimer) {
        clearInterval(publishTimer);
        publishTimer = null;
    }
    publishTwist(0, 0);
}

function bindButton(id, linear, angular) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('mousedown', () => startMove(linear, angular));
    btn.addEventListener('mouseup', stopMove);
    btn.addEventListener('mouseleave', stopMove);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(linear, angular); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); stopMove(); });
}

function connectToRos(url) {
    if (ros) {
        try { ros.close(); } catch (_) {}
        ros = null;
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (!url) {
        updateStatus('disconnected', 'Status: Terputus (URL kosong)');
        return;
    }

    updateStatus('connecting', 'Status: Menghubungkan...');
    rosUrl = url;

    ros = new ROSLIB.Ros({ url });

    ros.on('connection', () => {
        updateStatus('connected', 'Status: Terhubung!');
        cmdVel = new ROSLIB.Topic({
            ros: ros,
            name: '/cmd_vel',
            messageType: 'geometry_msgs/Twist'
        });
    });

    ros.on('error', (e) => {
        console.error('ROS error:', e);
        updateStatus('error', 'Status: Error koneksi');
    });

    ros.on('close', () => {
        updateStatus('disconnected', 'Status: Terputus');
        cmdVel = null;
        reconnectTimeout = setTimeout(() => connectToRos(rosUrl), 3000);
    });
}

function setCameraUrl(url) {
    if (!url) {
        imgEl.src = '';
        return;
    }
    camUrl = url;
    imgEl.src = url + '/stream?topic=/camera/rgb/image_raw&quality=10';
}

function saveUrls() {
    const ru = rosInput.value.trim();
    const cu = camInput.value.trim();
    if (ru) localStorage.setItem('rosbridgeUrl', ru);
    if (cu) localStorage.setItem('cameraUrl', cu);
    return { ru, cu };
}

async function init() {
    let rosbridgeUrl = localStorage.getItem('rosbridgeUrl') || '';
    let cameraUrl = localStorage.getItem('cameraUrl') || '';

    try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        if (cfg.rosbridgeUrl) rosbridgeUrl = cfg.rosbridgeUrl;
        if (cfg.cameraUrl) cameraUrl = cfg.cameraUrl;
    } catch (_) {}

    rosInput.value = rosbridgeUrl;
    camInput.value = cameraUrl;

    if (rosbridgeUrl) {
        setCameraUrl(cameraUrl);
        connectToRos(rosbridgeUrl);
    }

    connectBtn.addEventListener('click', () => {
        const { ru, cu } = saveUrls();
        setCameraUrl(cu);
        connectToRos(ru);
    });
}

bindButton('btnMaju',   0.5,  0.0);
bindButton('btnMundur', -0.5, 0.0);
bindButton('btnKiri',   0.0,  1.0);
bindButton('btnKanan',  0.0, -1.0);
bindButton('btnStop',   0.0,  0.0);

init();
