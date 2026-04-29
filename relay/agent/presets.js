/**
 * GRACE Agent — Preset Commands
 * 
 * ROS 2 Humble commands for the GRACE robot.
 * Each preset spawns in its own terminal tab on the website.
 */

const presets = {
    simulation: {
        label: "🤖 Simulation",
        description: "Launch Gazebo + RViz simulation",
        command: "source /opt/ros/humble/setup.bash && source ~/grace_ws/install/setup.bash && cd ~/grace_ws && clear && ros2 launch grace_bringup simulated_robot.launch.py",
    },
    rosbridge: {
        label: "🌉 Rosbridge",
        description: "Start rosbridge WebSocket server for web communication",
        command: "source /opt/ros/humble/setup.bash && ros2 launch rosbridge_server rosbridge_websocket_launch.xml",
    },
    chatter_pub: {
        label: "📡 Chatter Publisher",
        description: "Publish test messages to /chatter at 1Hz",
        command: 'source /opt/ros/humble/setup.bash && ros2 topic pub /chatter std_msgs/msg/String "data: hello" --rate 1',
    },
    web_cmd_echo: {
        label: "👂 Web Cmd Echo",
        description: "Echo messages published from the website on /web_cmd",
        command: "source /opt/ros/humble/setup.bash && ros2 topic echo /web_cmd",
    },
};

module.exports = presets;
