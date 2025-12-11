@echo off
REM CitadelBuy EAS Build Scripts for Windows
REM Common commands for building and deploying the mobile app

:menu
cls
echo ====================================
echo CitadelBuy EAS Build Scripts
echo ====================================
echo.
echo Select an option:
echo.
echo Development Builds:
echo   1. Build Development (iOS)
echo   2. Build Development (Android)
echo   3. Build Development (Both)
echo.
echo Preview Builds:
echo   4. Build Preview (iOS)
echo   5. Build Preview (Android)
echo   6. Build Preview (Both)
echo.
echo Production Builds:
echo   7. Build Production (iOS)
echo   8. Build Production (Android)
echo   9. Build Production (Both)
echo.
echo Store Submission:
echo  10. Submit to App Store (iOS)
echo  11. Submit to Play Store (Android)
echo.
echo OTA Updates:
echo  12. Deploy Update (Development)
echo  13. Deploy Update (Preview)
echo  14. Deploy Update (Production)
echo.
echo Utilities:
echo  15. View Build Status
echo  16. Manage Credentials
echo  17. Clear Build Cache
echo.
echo   0. Exit
echo.
set /p choice=Enter choice:

if "%choice%"=="1" goto dev_ios
if "%choice%"=="2" goto dev_android
if "%choice%"=="3" goto dev_both
if "%choice%"=="4" goto preview_ios
if "%choice%"=="5" goto preview_android
if "%choice%"=="6" goto preview_both
if "%choice%"=="7" goto prod_ios
if "%choice%"=="8" goto prod_android
if "%choice%"=="9" goto prod_both
if "%choice%"=="10" goto submit_ios
if "%choice%"=="11" goto submit_android
if "%choice%"=="12" goto update_dev
if "%choice%"=="13" goto update_preview
if "%choice%"=="14" goto update_prod
if "%choice%"=="15" goto view_builds
if "%choice%"=="16" goto credentials
if "%choice%"=="17" goto clear_cache
if "%choice%"=="0" goto end
goto menu

:dev_ios
echo.
echo Building Development iOS...
eas build --profile development --platform ios
pause
goto menu

:dev_android
echo.
echo Building Development Android...
eas build --profile development --platform android
pause
goto menu

:dev_both
echo.
echo Building Development (iOS and Android)...
eas build --profile development --platform all
pause
goto menu

:preview_ios
echo.
echo Building Preview iOS...
eas build --profile preview --platform ios
pause
goto menu

:preview_android
echo.
echo Building Preview Android...
eas build --profile preview --platform android
pause
goto menu

:preview_both
echo.
echo Building Preview (iOS and Android)...
eas build --profile preview --platform all
pause
goto menu

:prod_ios
echo.
echo Building Production iOS...
set /p confirm=Are you sure? (y/n):
if /i "%confirm%"=="y" (
    eas build --profile production --platform ios
)
pause
goto menu

:prod_android
echo.
echo Building Production Android...
set /p confirm=Are you sure? (y/n):
if /i "%confirm%"=="y" (
    eas build --profile production --platform android
)
pause
goto menu

:prod_both
echo.
echo Building Production (iOS and Android)...
set /p confirm=Are you sure? (y/n):
if /i "%confirm%"=="y" (
    eas build --profile production --platform all
)
pause
goto menu

:submit_ios
echo.
echo Submitting to App Store...
eas submit --platform ios --latest
pause
goto menu

:submit_android
echo.
echo Submitting to Play Store...
eas submit --platform android --latest
pause
goto menu

:update_dev
echo.
set /p message=Enter update message:
echo Deploying Update to Development...
eas update --branch development --message "%message%"
pause
goto menu

:update_preview
echo.
set /p message=Enter update message:
echo Deploying Update to Preview...
eas update --branch preview --message "%message%"
pause
goto menu

:update_prod
echo.
set /p message=Enter update message:
set /p confirm=Deploy to PRODUCTION? (y/n):
if /i "%confirm%"=="y" (
    eas update --branch production --message "%message%"
)
pause
goto menu

:view_builds
echo.
echo Recent Builds:
eas build:list
pause
goto menu

:credentials
echo.
echo Managing Credentials...
eas credentials
pause
goto menu

:clear_cache
echo.
set /p confirm=Clear build cache? (y/n):
if /i "%confirm%"=="y" (
    eas build --clear-cache --profile development --platform all
)
pause
goto menu

:end
echo.
echo Goodbye!
exit /b 0
