#!/bin/bash

# Input the application name
read -p "Enter the application name (e.g., 'code' for Visual Studio Code): " appname

# Find the .desktop file and extract details
desktop_file=$(find /usr/share/applications/ ~/.local/share/applications/ /var/lib/snapd/desktop/applications/ -type f -iname "*$appname*.desktop" -print | head -n 1)
if [ -z "$desktop_file" ]; then
    echo "No .desktop file found for $appname"
    exit 1
fi

echo "Found .desktop file: $desktop_file"
echo "Details:"
grep -E '^(Exec|Icon|Name)' $desktop_file