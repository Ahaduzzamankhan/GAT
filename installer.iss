#define AppName "GAT"
#define AppFullName "GAT - Game Activity Tracker"
#define AppVersion "1.0.0"
#define AppPublisher "Fluxenite"
#define AppURL "https://github.com/Ahaduzzamankhan/GAT"
#define AppExeName "GAT.exe"

[Setup]
AppId={{6F3A2B1C-4D8E-4F2A-9B3C-1D5E7F8A9B2C}
AppName={#AppFullName}
AppVersion={#AppVersion}
AppVerName={#AppFullName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=installer
OutputBaseFilename=GAT-Setup-{#AppVersion}
SetupIconFile=build\windows\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
MinVersion=10.0.17763
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern
WizardResizable=no
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppFullName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked
Name: "startupicon"; Description: "Start GAT with &Windows"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "build\bin\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppFullName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppFullName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppFullName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#AppFullName}"; Filename: "{app}\{#AppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppFullName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
[UninstallDelete]
Type: filesandordirs; Name: "{app}"