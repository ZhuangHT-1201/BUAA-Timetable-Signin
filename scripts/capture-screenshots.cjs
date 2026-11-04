const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const outputDir = path.join(root, 'docs', 'images');
fs.mkdirSync(outputDir, { recursive: true });

app.disableHardwareAcceleration();

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function capture(win, name) {
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, name), image.toPNG());
}

async function clickByText(win, text) {
  return win.webContents.executeJavaScript(`
    (() => {
      const button = [...document.querySelectorAll('button')]
        .find((item) => item.textContent.trim() === ${JSON.stringify(text)});
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
}

async function stabilize(win) {
  await win.webContents.executeJavaScript(`
    (() => {
      document.querySelector('.toast__close')?.click();
      let style = document.getElementById('screenshot-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'screenshot-style';
        style.textContent = '* { animation: none !important; transition: none !important; }';
        document.head.appendChild(style);
      }
      document.querySelectorAll('.login-panel, .page, .modal-backdrop > *').forEach((element) => {
        element.style.opacity = '1';
        element.style.transform = 'none';
      });
    })()
  `);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    backgroundColor: '#f3f5f0',
    webPreferences: {
      preload: path.join(__dirname, 'screenshot-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.showInactive();
  await win.loadFile(path.join(root, 'dist', 'index.html'));
  await win.webContents.executeJavaScript(`
    localStorage.clear();
    localStorage.setItem('buaa-timetable-sign.language', 'en');
  `);
  win.reload();
  await wait(650);
  await stabilize(win);
  await capture(win, 'login-desktop.png');

  if (!(await clickByText(win, 'Demo mode'))) throw new Error('Demo button not found');
  await wait(700);
  await stabilize(win);
  await wait(120);
  await capture(win, 'overview-desktop.png');

  if (!(await clickByText(win, 'Timetable'))) throw new Error('Schedule navigation not found');
  await wait(350);
  await stabilize(win);
  await capture(win, 'schedule-desktop.png');

  if (!(await clickByText(win, 'Sign-in'))) throw new Error('Attendance navigation not found');
  await wait(350);
  await stabilize(win);
  await capture(win, 'attendance-desktop.png');

  win.setSize(420, 900);
  await wait(400);
  await clickByText(win, 'Overview');
  await wait(300);
  await stabilize(win);
  await capture(win, 'overview-mobile.png');
  await clickByText(win, 'Timetable');
  await wait(250);
  await stabilize(win);
  await capture(win, 'schedule-mobile.png');

  console.log(`Screenshots written to ${outputDir}`);
  win.destroy();
  app.quit();
});
