// 1. Inisialisasi Koneksi ke ROS (Gunakan localhost untuk tes awal)
const ros = new ROSLIB.Ros({
    url : 'ws://localhost:9090'
});

// Update status teks di HTML saat terhubung/terputus
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

// 2. Tentukan Topik yang Akan Dikendalikan (/cmd_vel)
const cmdVel = new ROSLIB.Topic({
    ros : ros,
    name : '/cmd_vel',
    messageType : 'geometry_msgs/Twist'
});

// 3. Fungsi Eksekusi Gerakan
function moveRobot(linear, angular) {
    const twist = new ROSLIB.Message({
        linear : { x : linear, y : 0.0, z : 0.0 },
        angular : { x : 0.0, y : 0.0, z : angular }
    });
    cmdVel.publish(twist);
}

// 4. Hubungkan Fungsi ke Tombol
function maju()   { moveRobot(0.5, 0.0); }
function mundur() { moveRobot(-0.5, 0.0); }
function kiri()   { moveRobot(0.0, 1.0); }
function kanan()  { moveRobot(0.0, -1.0); }
function stop()   { moveRobot(0.0, 0.0); }