const PORT_ROSBRIDGE = 'wss://delayed-uncertainty-hawaii-discrete.trycloudflare.com';
const PORT_CAMERA = 'https://grew-favorites-cooking-solutions.trycloudflare.com'; 

const imgElement = document.getElementById('kamera');

imgElement.src =
`${PORT_CAMERA}/stream?topic=/camera/rgb/image_raw&quality=10`;

const ros = new ROSLIB.Ros({
    url: PORT_ROSBRIDGE
});

ros.on('connection', function() {
    document.getElementById('status').innerText = "Status: Terhubung!";
    document.getElementById('status').className = "text-green-500 font-semibold mb-6";
    console.log('Berhasil terhubung ke ROSbridge server.');
});

ros.on('error', function(error) {
    console.log('Terjadi error koneksi: ', error);
});

ros.on('close', function() {
    document.getElementById('status').innerText = "Status: Terputus";
    document.getElementById('status').className = "text-red-500 font-semibold mb-6";
});

const cmdVel = new ROSLIB.Topic({
    ros : ros,
    name : '/cmd_vel',
    messageType : 'geometry_msgs/Twist'
});

function moveRobot(linear, angular) {
    const twist = new ROSLIB.Message({
        linear : { x : linear, y : 0.0, z : 0.0 },
        angular : { x : 0.0, y : 0.0, z : angular }
    });
    cmdVel.publish(twist);

    fetch('/api/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ linear: linear, angular: angular })
    })
    .then(response => response.json())
    .then(data => console.log('Log tersimpan:', data))
    .catch(err => console.error('Gagal kirim log:', err));
}

function maju()   { moveRobot(0.5, 0.0); }
function mundur() { moveRobot(-0.5, 0.0); }
function kiri()   { moveRobot(0.0, 1.0); }
function kanan()  { moveRobot(0.0, -1.0); }
function stop()   { moveRobot(0.0, 0.0); }