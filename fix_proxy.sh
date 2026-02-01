#!/bin/bash
# Backup
cp ~/.bashrc ~/.bashrc.bak

# Replace the line
# We use a pattern that matches the specific faulty line logic to replace it with the correct routing logic
sed -i 's/^export HOST_IP=.*/export HOST_IP=$(ip route show | grep default | awk "{print \$3}")/' ~/.bashrc

echo "Updated .bashrc:"
grep "export HOST_IP=" ~/.bashrc
