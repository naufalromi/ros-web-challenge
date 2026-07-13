#!/bin/bash

export TURTLEBOT3_MODEL=waffle
source /opt/ros/noetic/setup.bash

# Patch camera resolution to 160x120 @ 15fps for better performance
XACRO=/opt/ros/noetic/share/turtlebot3_description/urdf/turtlebot3_waffle.gazebo.xacro
sed -i 's|<width>[0-9]*</width>|<width>160</width>|g' "$XACRO"
sed -i 's|<height>[0-9]*</height>|<height>120</height>|g' "$XACRO"
sed -i 's|<updateRate>[0-9.]*</updateRate>|<updateRate>15.0</updateRate>|g' "$XACRO"
echo "[+] Camera resolution patched to 160x120 @ 15fps"

echo "[+] Starting Gazebo..."
xvfb-run -a roslaunch turtlebot3_gazebo turtlebot3_world.launch gui:=false > /tmp/gazebo.log 2>&1 &

echo "[+] Waiting for Gazebo to be ready..."
for i in $(seq 1 30); do
    if rostopic list 2>/dev/null | grep -q /clock; then
        echo "[+] Gazebo ready after ${i}s"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "[-] Gazebo did not start in time"
    fi
    sleep 1
done

echo "[+] Starting rosbridge..."
roslaunch rosbridge_server rosbridge_websocket.launch > /tmp/rosbridge.log 2>&1 &

sleep 3

echo "[+] Starting web_video_server..."
rosrun web_video_server web_video_server > /tmp/video.log 2>&1 &

echo "[+] All services started."
exec tail -f /tmp/gazebo.log /tmp/rosbridge.log /tmp/video.log
