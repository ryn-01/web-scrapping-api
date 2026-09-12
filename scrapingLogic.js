import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const BROWSER_LIFE_DURATION = 15 * 60 * 1000
let browserInstance = null;
let browserTimer = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    clearTimeout(browserTimer)
    return browserInstance
  }

  browserInstance = await puppeteer.launch({ headless: true, defaultViewport: null,args: ['--no-sandbox', '--disable-setuid-sandbox']})
}

const methods = {
  goto: async (page, selector) =>
    await page.goto(selector, { waitUntil: "networkidle2" }),

  waitFor: async (page, selector) => await page.waitForSelector(selector),

  search: async (page, data) => {
    await page.locator(data.selector).fill(data.query);
    await page.keyboard.press("Enter");
  },

  clickBtn: async (page, selector) => await page.locator(selector).click(),

  clickLnk: async (page, selector) => {
    const link = await page.$eval(selector, (el) => el.href);
    await page.goto(link, { waitUntil: "networkidle2" });
  },

  input: async (page, data) =>
    await page.locator(data.selector).fill(data.query),

  extract: async (page, data, collectedData) => {
    await page.waitForSelector(data.selector);
    collectedData.push(await page.$eval(
      data.selector,
      (el, selectedAtrb) => {
        let selectedData = {};
        selectedAtrb.forEach((atrb) => {
          selectedData[atrb] = el[atrb];
        });
        return selectedData;
      },
      data.atributes,
    ))
  },

  extractAll: async (page, data, collectedData) => {
    await page.waitForSelector(data.selector);

    collectedData.push(await page.$$eval(
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
    ))
  },

  extractTable: async (page, selector, collectedData) => {
    await page.waitForSelector(selector);
    collectedData.push(await page.$$eval(selector, (rows) => {
      return rows.map((row) =>
        [...row.querySelectorAll("th, td")].map((cell) =>
          cell.innerText.trim(),
        ),
      );
    }))
  },
};

async function CompileInstruction(list) {
  await getBrowser()
  const page = await browserInstance.newPage();
  const collectedData = [];

  try {
    for (const step of list) {
      const func = methods[step.action];
      if (!func) throw new Error(`Unknown action: ${step.action}`);
      await func(page, step.value, collectedData);
    }
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    await page.close()

    browserTimer = setTimeout(()=> {
      browserInstance.close()
    },BROWSER_LIFE_DURATION)
  }

  return { success: true, data: collectedData };
}

export default CompileInstruction;
