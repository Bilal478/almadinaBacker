@echo off
REM Launches the POS in a dedicated Chrome window with silent printing enabled.
REM --kiosk-printing skips the print preview dialog and sends the job straight to
REM whatever printer is set as your Windows DEFAULT printer — set your thermal
REM printer as the default first (Settings > Bluetooth & devices > Printers & scanners).
REM
REM A separate --user-data-dir is required: if a normal Chrome window is already
REM open, Chrome just opens a new tab in it and ignores these flags entirely.
REM This does NOT touch your normal Chrome profile/bookmarks/logins.

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set URL=http://localhost:5173
set PROFILE=%~dp0.pos-chrome-profile

start "" %CHROME% --kiosk-printing --user-data-dir="%PROFILE%" --new-window %URL%
