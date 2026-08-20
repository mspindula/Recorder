const { app, BrowserWindow, ipcMain, Menu, globalShortcut, shell, dialog } = require("electron");
const path = require('path'); 
const os = require("os");
const fs = require("fs");
const Store = require('./Store')

const preferences = new Store({
    configName: 'user-preferences',
    defaults:{
        destination: path.join(os.homedir(), 'audios')
    }
})


let destination = preferences.get("destination")
const isDev = (process.env.NODE_ENV !== undefined && process.env.NODE_ENV === "development")?true:false;
const isMac = process.platform === "darwin" ? true : false;



function createPrefrencesWindow() {
    const preferenceWindow = new BrowserWindow({
        resizable: isDev?true:false,
        width: isDev?950:500,
        height: 150,
        backgroundColor: "#234",
        show: false,
        icon:path.join(__dirname, "assets", "icons", "icon.png"),
        webPreferences: { nodeIntegration: true,
    contextIsolation: false},
        });
        preferenceWindow.loadFile('./src/preferences/index.html')
        preferenceWindow.once('ready-to-show', ()=>{

            preferenceWindow.show();
            if(isDev){
                preferenceWindow.webContents.openDevTools();
            }
            preferenceWindow.webContents.send("dest-path-update", destination)
        });
}
function createWindow() {
    const win = new BrowserWindow({
        resizable: isDev?true:false,
        width: isDev?950:500,
        height: 300,
        backgroundColor: "#234",
        show: false,
        icon:path.join(__dirname, "assets", "icons", "icon.png"),
        webPreferences: { nodeIntegration: true,
    contextIsolation: false}, 
    });

    win.loadFile('./src/mainWindow/index.html')
    if(isDev){
        win.webContents.openDevTools();
    }

    win.once('ready-to-show', ()=>{
        win.show();
       
    });


    const menuTemplate = [
        {label: app.name,
            submenu:[
                {label:"Preferences", click: ()=>{createPrefrencesWindow()}},
                {label: "Open Destination Folder", click: ()=>{shell.openPath(destination)}},
            ]
        },
        {label: 'File',
            submenu: [
                isMac?{role:"close"}:{role:"quit"}
            ]
        }
    ]
    const menu = Menu.buildFromTemplate(menuTemplate); // muda o menu do App
    Menu.setApplicationMenu(menu); // muda o menu do App
}

app.whenReady().then(()=>{
    createWindow();
     globalShortcut.register('CmdOrCtrl+d',()=>{
        BrowserWindow.getAllWindows()[0].setAlwaysOnTop(true) //traz a janela pra frente, em foco
        BrowserWindow.getAllWindows()[0].setAlwaysOnTop(false)
     })
})
app.on('will-quit', ()=>{
    globalShortcut.unregisterAll()
})
app.on('window-all-closed', ()=>{
    console.log("todas as janelas fechadas");
    if(!isMac){
        app.quit();
    }
})

app.on("activate", ()=>{
    if(BrowserWindow.getAllWindows().length === 0){
        createWindow();
    }
});

ipcMain.on('open_new_window',()=>{ // conversa do front com back e back com front

    createWindow();
})

ipcMain.on("save_buffer", (e, buffer) =>{
const filePath = path.join(destination, `${Date.now()}`)
fs.writeFileSync(`${filePath}.webm`, buffer)
})

ipcMain.handle("show-dialog", async (e) =>{
    const result = await dialog.showOpenDialog({properties:['openDirectory']})
    const dirPath = result.filePaths[0]
    preferences.set("destination", dirPath)
    destination = preferences.get("destination")
    
    return destination
})