import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const BROWSER_LIFE_DURATION = 15 * 60 * 1000;
let browserInstance = null;
let browserTimer = null;

function resetBrowserTimer() {
  if (browserTimer) clearTimeout(browserTimer);

  browserTimer = setTimeout(async () => {
    if (browserInstance) {
      console.log("Shutting down idle browser...");
      await browserInstance.close();
      browserInstance = null;
    }
  }, BROWSER_LIFE_DURATION);
}

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    resetBrowserTimer();
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    protocolTimeout: 240000,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  resetBrowserTimer();
  return browserInstance;
}

const methods = {
  goto: async (page, selector) =>
    await page.goto(selector, { waitUntil: "domcontentloaded" }),

  waitFor: async (page, selector) => await page.waitForSelector(selector),

  search: async (page, data) => {
    await page.waitForSelector(data.selector);
    await page.$eval(
      data.selector,
      (element, query) => {
        element.focus();
        element.value = query;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        for (const eventType of ["keydown", "keypress", "keyup"]) {
          element.dispatchEvent(
            new KeyboardEvent(eventType, {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
            }),
          );
        }
      },
      data.query,
    );
  },

  clickBtn: async (page, selector) => await page.locator(selector).click(),

  clickLnk: async (page, selector) => {
    const link = await page.$eval(selector, (el) => el.href);
    await page.goto(link, { waitUntil: "domcontentloaded" });
  },

  input: async (page, data) =>
    await page.locator(data.selector).fill(data.query),

  extract: async (page, data, collectedData) => {
    await page.waitForSelector(data.selector);
    collectedData.push(
      await page.$eval(
        data.selector,
        (el, selectedAtrb) => {
          let selectedData = {};
          selectedAtrb.forEach((atrb) => {
            selectedData[atrb] = el[atrb];
          });
          return selectedData;
        },
        data.atributes,
      ),
    );
  },

  extractAll: async (page, data, collectedData) => {
    await page.waitForSelector(data.selector);

    collectedData.push(
      await page.$$eval(
        data.selector,
        (els, selectedAtrb) => {
          let result = [];
          els.forEach((el, index) => {
            let selectedData = {};
            for (let i = 0; i < selectedAtrb.length; i++) {
              let atrbName = selectedAtrb[i];
              selectedData[atrbName] = el[atrbName];
            }
            result.push(selectedData);
          });
          return result;
        },
        data.atributes,
      ),
    );
  },

  extractTable: async (page, selector, collectedData) => {
    await page.waitForSelector(selector);
    collectedData.push(
      await page.$$eval(selector, (rows) => {
        return rows.map((row) =>
          [...row.querySelectorAll("th, td")].map((cell) =>
            cell.innerText.trim(),
          ),
        );
      }),
    );
  },
};

async function CompileInstruction(list) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  const collectedData = [];

  try {
    for (const [index, step] of list.entries()) {
      const func = methods[step.action];
      if (!func) throw new Error(`Unknown action: ${step.action}`);
      try {
        await func(page, step.value, collectedData);
      } catch (err) {
        throw new Error(
          `Action ${index + 1} (${step.action}) failed: ${err.message}`,
        );
      }
    }
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    await page.close();

    resetBrowserTimer();
  }

  return { success: true, data: collectedData };
}

export default CompileInstruction;
