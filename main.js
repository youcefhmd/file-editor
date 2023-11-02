const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
let win;

let folderPath = "";
const createWindow = () => {
    win = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, "src/preload.js"),
        },
        show: false,
        frame: false,
    });

    win.loadFile("index.html");
    win.once("ready-to-show", win.show);
};

app.whenReady().then(() => {
    createWindow();
    ipcMain.on("open-folder-dialog", openFile);
    ipcMain.on("read-dir", (event, dir) => {
        console.log("dddd", dir);
        event.sender.send("selected-dir", {
            path: dir,
            ...readDir(dir),
        });
    });
    ipcMain.on("close-me", closeMe);
    ipcMain.on("min-me", minMe);
    ipcMain.on("delete-all-file-selected", deleteAllFileSelected);
    ipcMain.handle("check-is-file", checkIsFile);
});

const closeMe = () => {
    app.quit();
};

const minMe = () => {
    win.minimize();
};

const checkIsFile = async (event, filePath) => {
    if (fs.existsSync(path.join(folderPath, filePath))) {
        let state = fs.statSync(path.join(folderPath, filePath));
        return state.isFile();
    }
    return false;
};

const deleteAllFileSelected = (event, files) => {
    console.log("files: ", files);
    files.forEach((file) => {
        try {
            if (fs.existsSync(path.join(folderPath, file))) {
                console.log("exists");
                let state = fs.statSync(path.join(folderPath, file));
                console.log(state);
                if (state.isDirectory()) {
                    fs.rmdirSync(path.join(folderPath, file), {
                        recursive: true,
                        force: true,
                    });
                } else {
                    fs.unlinkSync(path.join(folderPath, file));
                }
                event.sender.send("selected-dir", {
                    path: folderPath,
                    ...readDir(folderPath),
                });
            } else {
                event.sender.send("dir-not-exists");
            }
        } catch (err) {
            console.log(err);
        }
    });
};
const openFile = (event) => {
    dialog
        .showOpenDialog({
            properties: ["openDirectory"],
        })
        .then((result) => {
            folderPath = result.filePaths[0];
            console.log("folderPath: ", folderPath);
            event.sender.send("selected-dir", {
                path: folderPath,
                ...readDir(folderPath),
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

const readDir = (directoryPath) => {
    const directoryData = {};

    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

    entries.forEach((entry) => {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            directoryData[entry.name] = readDir(entryPath);
        } else {
            directoryData[entry.name] = null;
        }
    });
    return directoryData;
};