CREATE DATABASE IF NOT EXISTS robot_db;
USE robot_db;

-- CREATE USER IF NOT EXISTS 'robot_app'@'localhost' IDENTIFIED BY 'GantiIniP@sswordKuat123';
-- GRANT SELECT, INSERT, DELETE ON robot_db.* TO 'robot_app'@'localhost';
-- FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS robot_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(10) NOT NULL,
    status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
